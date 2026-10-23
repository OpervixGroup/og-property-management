import{evidenceHandlerRoles,evidenceArtifact}from'./department-evidence.mjs';
import{hash}from'./task-coordinator.mjs';import{progressSnapshot}from'./task-coordinator-progress.mjs';
export const handlerRoles={
 'og-headquarters-access-v1':['cto','quality','security'],
 'operations-exceptions-v1':['coo','operations-lead','project-manager'],
 'secretary-daily-digest-v1':['secretary'],
 'capacity-workload-v1':['capacity','ai-resources'],
 'risk-review-expiry-v1':['risk','legal-lead'],
 'audit-evidence-gaps-v1':['audit'],
 ...evidenceHandlerRoles
};
export const executorRoles=[...new Set(Object.values(handlerRoles).flat())];
export const supportedTask=t=>!!t?.plan&&handlerRoles[t.plan.handlerKey]?.includes(t.plan.agentId)===true;
export function readyTask(t,at=Date.now()){
 if(!supportedTask(t)||t.status!=='Queued'||t.digest!==hash(t.plan)||t.plan.scope!=='corporate'||t.plan.cost!==0||!['read_only_review','development_test','internal_draft'].includes(t.plan.type))return false;
 if(['externalCommunication','customerCommitment','financialWrite','crmWrite','accessChange','spending','productionChange','confidentialClientData'].some(k=>t.plan.effects?.[k]!==false))return false;
 return['Legal','Risk'].every(role=>t.reviews?.[role]?.digest===t.digest&&t.reviews[role].verdict==='Pass'&&!!t.reviews[role].evidence&&Date.parse(t.reviews[role].expiresAt)>at);
}
export function internalFunctions({read,clock=()=>new Date().toISOString()}){return async(task,{checkpoint})=>{
 if(!supportedTask(task)||task.plan.handlerKey==='og-headquarters-access-v1')throw Error('Exact internal handler and role required');
 await checkpoint();const state=await read();await checkpoint();
 if(!state?.control||!state.tasks||!Array.isArray(state.events)||Object.keys(state.tasks).length>5000||state.events.length>100000)throw Error('Bounded verified corporate state required');
 const at=clock(),tasks=Object.values(state.tasks).filter(t=>t.plan.id!==task.plan.id),sourceDigest=hash({control:state.control,tasks,events:state.events});
 const key=task.plan.handlerKey;let artifact=evidenceArtifact(key,tasks,at);
 const ref=t=>({id:t.plan.id,agentId:t.plan.agentId,status:t.status});
 if(key==='operations-exceptions-v1')artifact={kind:'Operations exceptions',items:tasks.filter(t=>['Failed','Uncertain','Needs reconciliation','Needs correction'].includes(t.status)||t.status==='Working'&&Date.parse(t.lease?.until)<=Date.parse(at)).map(t=>({...ref(t),nextAction:'Reconcile exact attempt and evidence before retry; retain original outcome'})),unowned:tasks.filter(t=>!t.plan.agentId).length};
 if(key==='secretary-daily-digest-v1')artifact={kind:'Secretary daily digest',daily:progressSnapshot(state,at).daily,open:tasks.filter(t=>t.status!=='Completed').map(ref),delivery:'Internal persisted artifact only; no email delivery claimed'};
 if(key==='capacity-workload-v1'){const roles={};for(const t of tasks){const r=roles[t.plan.agentId]??={queued:0,working:0,blocked:0};if(t.status==='Queued')r.queued++;if(t.status==='Working')r.working++;if(['Failed','Uncertain','Needs reconciliation','Needs correction'].includes(t.status))r.blocked++;}artifact={kind:'Capacity workload',roles,utilization:'Unknown; task counts are not utilization or staffed capacity',decision:'Use existing authorized execution; no provisioning authorized by this assessment'};}
 if(key==='risk-review-expiry-v1')artifact={kind:'Legal/Risk review freshness',items:tasks.filter(t=>t.status==='Queued').flatMap(t=>['Legal','Risk'].filter(r=>t.reviews?.[r]?.digest!==t.digest||t.reviews[r].verdict!=='Pass'||Date.parse(t.reviews[r].expiresAt)<=Date.parse(at)||!Number.isFinite(Date.parse(t.reviews[r].expiresAt))).map(role=>({...ref(t),review:role,nextAction:'Obtain current evidence-backed review of unchanged exact plan; no auto-approval'}))),reviewMode:'Automated evidence freshness check, not legal advice or independent review'};
 if(key==='audit-evidence-gaps-v1')artifact={kind:'Audit evidence gaps',items:tasks.flatMap(t=>{const findings=[];if(t.status==='Completed'&&(!t.outcome?.evidence||t.audit?.verdict!=='Pass'||t.audit.digest!==t.digest||t.audit.outcomeDigest!==hash(t.outcome)||t.audit.token!==t.lease?.token))findings.push('Unsupported completion or mismatched audit binding');if(t.status==='Awaiting audit')findings.push('Actual outcome awaits exact Audit');return findings.map(finding=>({...ref(t),finding}));}),reviewMode:'Automated control findings; does not pass audits or certify independent review'};
 if(!artifact)throw Error('Handler missing');await checkpoint();
 return{result:artifact.kind+' prepared from persisted corporate coordinator state; inspect artifact and complete exact Audit.',evidence:'coordinator-snapshot-sha256:'+sourceDigest,artifact:{...artifact,at,sourceDigest,scope:'Corporate coordinator metadata only; no client/financial source reads'}};
};}
