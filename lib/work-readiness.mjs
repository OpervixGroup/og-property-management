const terminal=new Set(['Completed','Superseded','Expired']);
export function workReadiness(state,at=new Date().toISOString()){
 const now=Date.parse(at);if(!Number.isFinite(now))throw Error('Verified clock required');
 const issues=[];let queued=0,completed=0;
 for(const [id,t]of Object.entries(state?.tasks??{})){
  if(t.status==='Completed')completed++;
  if(t.status==='Queued')queued++;
  if(terminal.has(t.status)&&t.status!=='Expired')continue;
  const role=typeof t.plan?.agentId==='string'?t.plan.agentId:'Unassigned',due=Date.parse(t.plan?.deadline);
  const issue=(code,reason,nextAction)=>issues.push({taskId:id,role,code,reason,nextAction,deadline:Number.isFinite(due)?t.plan.deadline:null,status:t.status});
  if(t.status==='Expired'||t.status==='Queued'&&Number.isFinite(due)&&due<=now){issue('deadline-expired','Original task deadline has passed','Preserve the original task; obtain a current reviewed replacement plan and deadline.');continue;}
  if(t.status==='Queued'&&!Number.isFinite(due)){issue('deadline-missing','A valid task deadline is missing','Assign an explicit deadline and refresh exact-plan reviews before execution.');continue;}
  if(['Needs reconciliation','Uncertain','Failed','Needs correction','Blocked'].includes(t.status)){issue('reconcile','The prior attempt or outcome needs review','Reconcile the exact attempt and evidence; never reset a lock or repeat an uncertain effect.');continue;}
  if(t.status==='Working'&&(!Number.isFinite(Date.parse(t.lease?.until))||Date.parse(t.lease.until)<=now)){issue('lease-expired','Active task lease is missing or expired','Stop claiming active execution; reconcile the original attempt before any retry.');continue;}
  if(t.status==='Queued'){
   if(state.control?.paused||state.control?.roles?.[role]?.paused){issue('paused','CEO controls hold this task','Retain the task; only authorized CEO controls can release the pause.');continue;}
   if(['Legal','Risk'].some(r=>t.reviews?.[r]?.verdict!=='Pass'||t.reviews[r].digest!==t.digest||!t.reviews[r].evidence||!Number.isFinite(Date.parse(t.reviews[r].expiresAt))||Date.parse(t.reviews[r].expiresAt)<=now))issue('reviews-required','Exact Legal/Risk reviews are missing or stale','Review the exact current plan and evidence before a claim.');
  }
 }
 return {checkedAt:at,queued,completed,attentionCount:issues.length,issues,scope:'Execution readiness only; task counts are not client outcomes, revenue or proof of autonomous capacity.'};
}
