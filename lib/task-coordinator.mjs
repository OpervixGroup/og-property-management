import {createHash, randomUUID} from 'node:crypto';
const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
export const hash=v=>createHash('sha256').update(JSON.stringify(canonical(v))).digest('hex');
export const emptyState=()=>({control:{paused:true,epoch:0,roles:{}},tasks:{},events:[]});
const effects=['externalCommunication','customerCommitment','financialWrite','crmWrite','accessChange','spending','productionChange','confidentialClientData'];
const time=v=>{const n=Date.parse(v);if(!Number.isFinite(n))throw Error('Invalid timestamp');return n;};
// The host supplies verified identity, an explicit role registry and a SERIALIZABLE
// durable transaction adapter. This module is not an authentication boundary.
export function coordinator({store,roles,authorityRefs,verifyCEO,clock=()=>new Date().toISOString()}){
 if(typeof store?.transaction!=='function'||!Array.isArray(roles)||!roles.length||!Array.isArray(authorityRefs)||!authorityRefs.length||typeof verifyCEO!=='function')throw Error('Durable transaction adapter, role/authority registry and CEO verifier required');
 const roleSet=new Set(roles);
 const authorities=new Set(authorityRefs);
 const transact=fn=>store.transaction(s=>{if(!s?.control||!s.tasks||!s.events)throw Error('Invalid persisted state');return fn(s,clock());});
 const event=(s,at,type,detail)=>s.events.push({id:randomUUID(),at,type,...detail});
 const eligible=(s,t,at)=>{
  if(s.control.paused||s.control.roles[t.plan.agentId]?.paused)throw Error('CEO pause');
  if(t.digest!==hash(t.plan))throw Error('Plan changed');
  if(!authorities.has(t.plan.authorityRef)||!roleSet.has(t.plan.agentId)||t.plan.scope!=='corporate'||t.plan.cost!==0||!['read_only_review','development_test','internal_draft'].includes(t.plan.type)||effects.some(k=>t.plan.effects?.[k]!==false))throw Error('Outside executor authority');
  for(const r of ['Legal','Risk'])if(t.reviews[r]?.digest!==t.digest||t.reviews[r]?.verdict!=='Pass'||time(t.reviews[r].expiresAt)<=time(at))throw Error('Current exact-plan reviews required');
 };
 const owned=(s,id,token,at)=>{const t=s.tasks[id];if(!t||t.status!=='Working'||t.lease?.token!==token||time(t.lease.until)<=time(at))throw Error('Invalid or expired lease');return t;};
 return {
  control:async(input,identity)=>{
   if(!await verifyCEO(identity))throw Error('Verified CEO required');
   if(typeof input?.paused!=='boolean'||!input.evidence||input.agentId&&!roleSet.has(input.agentId))throw Error('Exact control and evidence required');
   return transact((s,at)=>{if(input.agentId)s.control.roles[input.agentId]={paused:input.paused,at};else s.control.paused=input.paused;
    s.control.epoch++;event(s,at,'CEO control',{agentId:input.agentId||null,paused:input.paused,evidence:input.evidence});return structuredClone(s.control);});
  },
  enqueue:plan=>transact((s,at)=>{
   if(!plan?.id||!plan.operationKey||!roleSet.has(plan.agentId)||!plan.acceptance||!plan.authorityRef||!plan.sources?.length)throw Error('Bounded registered plan required');
   const digest=hash(plan),prior=Object.values(s.tasks).find(t=>t.plan.operationKey===plan.operationKey||t.plan.id===plan.id);
   if(prior){if(prior.digest!==digest)throw Error('Duplicate operation or changed plan');return structuredClone(prior);}
   const t={plan:structuredClone(plan),digest,status:'Queued',reviews:{},createdAt:at};s.tasks[plan.id]=t;event(s,at,'Queued',{taskId:plan.id,digest});return structuredClone(t);
  }),
  review:(id,review)=>transact((s,at)=>{const t=s.tasks[id];if(!t||t.status!=='Queued'||!['Legal','Risk'].includes(review.role)||review.digest!==t.digest||review.verdict!=='Pass'||!review.evidence||time(review.expiresAt)<=time(at))throw Error('Exact current review required');t.reviews[review.role]=structuredClone(review);event(s,at,'Review',{taskId:id,role:review.role,digest:t.digest});}),
  claim:(id,worker,leaseMs=60000)=>transact((s,at)=>{
   if(!worker||!Number.isInteger(leaseMs)||leaseMs<1000||leaseMs>300000)throw Error('Bounded worker lease required');
   const t=s.tasks[id];if(!t||t.status!=='Queued')throw Error('Task not queued; reconcile previous attempt');eligible(s,t,at);
   t.status='Working';t.lease={token:randomUUID(),worker,epoch:s.control.epoch,until:new Date(time(at)+leaseMs).toISOString()};event(s,at,'Working',{taskId:id,token:t.lease.token});return structuredClone(t.lease);
  }),
  checkpoint:(id,token)=>transact((s,at)=>{const t=owned(s,id,token,at);eligible(s,t,at);if(t.lease.epoch!==s.control.epoch)throw Error('Control changed; stop and reconcile');return {permitted:true};}),
  finish:(id,token,outcome)=>transact((s,at)=>{
   const t=owned(s,id,token,at);eligible(s,t,at);if(t.lease.epoch!==s.control.epoch)throw Error('Control changed; stop and reconcile');
   if(!outcome?.evidence||!outcome.result||!['Succeeded','Failed','Uncertain'].includes(outcome.status))throw Error('Actual outcome evidence required');
   t.outcome={...structuredClone(outcome),at,token};t.status=outcome.status==='Succeeded'?'Awaiting audit':outcome.status;event(s,at,t.status,{taskId:id});return structuredClone(t);
  }),
  expire:()=>transact((s,at)=>{const ids=[];for(const [id,t]of Object.entries(s.tasks))if(t.status==='Working'&&time(t.lease.until)<=time(at)){t.status='Needs reconciliation';ids.push(id);event(s,at,t.status,{taskId:id,token:t.lease.token});}return ids;}),
  audit:(id,input)=>transact((s,at)=>{const t=s.tasks[id];if(!t||t.status!=='Awaiting audit'||input?.digest!==t.digest||input.outcomeDigest!==hash(t.outcome)||input.token!==t.lease.token||!input.evidence||!['Pass','Needs correction'].includes(input.verdict)||!['same-executor AI review','separate AI review'].includes(input.reviewMode))throw Error('Exact attempt and outcome audit required');t.audit={...input,at};t.status=input.verdict==='Pass'?'Completed':'Needs correction';event(s,at,t.status,{taskId:id});return structuredClone(t);})
 };
}
