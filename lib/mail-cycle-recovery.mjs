import {createHash, randomUUID} from 'node:crypto';
const plain=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const canonical=v=>Array.isArray(v)?v.map(canonical):plain(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
const digest=v=>createHash('sha256').update(JSON.stringify(canonical(v))).digest('hex');
const bounded=(v,n)=>typeof v==='string'&&v.trim().length>0&&v.length<=n;
function snapshot(s){
 const m=s?.privateWorker?.companyMail;
 if(!plain(s?.control)||s.control.executionOwner!=='digitalocean-corporate-v1'||typeof s.control.paused!=='boolean'||!Number.isSafeInteger(s.control.epoch)||!plain(s.tasks)||!Array.isArray(s.events)||!plain(m?.cycles)||!plain(m.cases)||!plain(s.privateWorker.intents))throw Error('Verified coordinator state required');
 return {control:s.control,cycles:m.cycles,cases:m.cases,intents:s.privateWorker.intents,tasks:s.tasks};
}
function reason(s,c,at){
 if(s.control.paused!==true)return 'Pause corporate execution before recovery';
 if(!['Running','Uncertain'].includes(c.status))return 'Only unresolved attempts may be reconciled';
 if(!bounded(c.runId,100)||!Number.isFinite(Date.parse(c.until))||Date.parse(c.until)>Date.parse(at))return 'Original lease must be expired';
 if(Object.keys(s.privateWorker.companyMail.cases).length)return 'Registered cases require case-specific effect reconciliation';
 if(Object.keys(s.privateWorker.intents).length)return 'Worker intents require attempt-specific reconciliation';
 if(Object.values(s.tasks).some(t=>t?.plan?.handlerKey==='private-codex-draft-v1'))return 'Registered private tasks require task-specific reconciliation';
 return null;
}
export function recoveryPreview(s,at=new Date().toISOString()){
 if(!Number.isFinite(Date.parse(at)))throw Error('Valid clock required');
 const p=snapshot(s),snapshotDigest=digest(p);
 return {checkedAt:at,paused:s.control.paused,snapshotDigest,cycles:Object.entries(p.cycles).map(([id,c])=>({cycleId:id,runId:c.runId,status:c.status,startedAt:c.startedAt,until:c.until,reconciled:reconciledWithoutEffects(s.privateWorker.companyMail,id),blockedReason:reconciledWithoutEffects(s.privateWorker.companyMail,id)?'No-effects reconciliation already recorded':reason(s,c,at)}))};
}
// Caller must authenticate the CEO; no worker-token operation exposes this reducer.
export function recoveryService({store,read,verifyCEO,clock=()=>new Date().toISOString()}){
 return {
  async preview(actor){if(!await verifyCEO(actor))throw Error('CEO access required');return recoveryPreview(await read(),clock());},
  async reconcile(p,actor){
   if(!await verifyCEO(actor))throw Error('CEO access required');
   const keys=['cycleId','runId','snapshotDigest','evidence','processStopped'];
   if(!plain(p)||Object.keys(p).length!==keys.length||keys.some(k=>!Object.hasOwn(p,k))||!bounded(p.cycleId,100)||!bounded(p.runId,100)||!/^[a-f0-9]{64}$/.test(p.snapshotDigest)||!bounded(p.evidence,1000)||p.processStopped!==true||!bounded(actor?.authId,200))throw Error('Exact recovery approval and process-stop evidence required');
   const at=clock(),eventId=randomUUID();
   if(!Number.isFinite(Date.parse(at)))throw Error('Valid clock required');
   return store.transaction(s=>{
    const current=recoveryPreview(s,at);
    if(current.snapshotDigest!==p.snapshotDigest)throw Error('State changed; refresh before recovery');
    const c=s.privateWorker.companyMail.cycles[p.cycleId];
    if(!c||c.id!==p.cycleId||c.runId!==p.runId)throw Error('Exact original cycle required');
    const blocked=reason(s,c,at);if(blocked)throw Error(blocked);
    // Preserve status, token, lease, evidence and all other original fields.
    // A separate append-only receipt is not a successful business completion.
    s.privateWorker.companyMail.noEffectReconciliations??={};
    if(!plain(s.privateWorker.companyMail.noEffectReconciliations)||s.privateWorker.companyMail.noEffectReconciliations[p.cycleId])throw Error('Original recovery already exists');
    const record={cycleId:p.cycleId,runId:p.runId,cycleDigest:digest(c),snapshotDigest:p.snapshotDigest,at,actorId:actor.authId,evidence:p.evidence,processStopped:true,disposition:'No effects; original attempt preserved; no business completion'};
    s.privateWorker.companyMail.noEffectReconciliations[p.cycleId]=record;
    s.events.push({id:eventId,at,type:'Corporate cycle reconciled without effects',taskId:null,source:'authenticated-ceo-recovery',cycleId:p.cycleId,runId:p.runId});
    return record;
   });
  }
 };
}
export function reconciledWithoutEffects(m,id){
 const c=m.cycles[id],r=m.noEffectReconciliations?.[id];
 return !!(c&&r&&r.cycleId===id&&r.runId===c.runId&&r.cycleDigest===digest(c)&&r.processStopped===true&&bounded(r.actorId,200)&&bounded(r.evidence,1000)&&r.disposition==='No effects; original attempt preserved; no business completion');
}
