// Findings are derived only from persisted corporate task plans and outcomes.
// A reference is an investigation lead, never proof that an external source was read.
export const evidenceHandlerRoles={
 'finance-source-boundary-v1':['cfo','controller','receivables','payables','reconciliation'],
 'sales-evidence-inventory-v1':['sales-vp','cmo','account-executive','research'],
 'client-delivery-exceptions-v1':['clients-lead','support','vendor-coordinator'],
 'strategy-dependency-map-v1':['strategy','cpo','engineering-lead','developer','designer','orchestration','knowledge','evaluation']
};
const ref=t=>({id:t.plan.id,owner:t.plan.owner||t.plan.agentId,status:t.status});
export function evidenceArtifact(key,tasks,at){
 const relevant=roles=>tasks.filter(t=>roles.includes(t.plan.agentId));
 if(key==='finance-source-boundary-v1'){
  const rows=relevant(evidenceHandlerRoles[key]);
  return{kind:'Finance source boundary',items:rows.map(t=>({...ref(t),sources:t.plan.sources||[],financialWriteRequested:t.plan.effects?.financialWrite===true,nextAction:t.plan.effects?.financialWrite?'Hold: financial write requires separate exact authorization':'Verify correct corporate legal entity and realm in authorized accounting source before financial conclusions'})),corporateRevenue:{value:null,status:'Unverified; coordinator records are not accounting evidence'},clientFunds:'Excluded; client money cannot establish corporate revenue'};
 }
 if(key==='sales-evidence-inventory-v1'){
  const rows=relevant(evidenceHandlerRoles[key]);
  const sources=[...new Set(rows.flatMap(t=>t.plan.sources||[]).filter(s=>typeof s==='string'&&/^https:\/\//.test(s)))];
  return{kind:'Sales evidence inventory',items:rows.map(t=>({...ref(t),acceptance:t.plan.acceptance||null,hasOutcome:!!t.outcome?.evidence})),sourceReferences:sources,qualifiedBuyers:null,revenue:null,nextAction:'Verify referenced entity, current business need and CRM duplicates; no outreach or qualification inferred from a URL'};
 }
 if(key==='client-delivery-exceptions-v1'){
  const rows=relevant(evidenceHandlerRoles[key]);
  return{kind:'Client delivery exceptions',items:rows.filter(t=>t.status!=='Completed').map(t=>({...ref(t),deadline:t.plan.deadline||null,overdue:!!t.plan.deadline&&Date.parse(t.plan.deadline)<Date.parse(at),nextAction:'Verify exact client tenant and scope in client-owned tools; retain detailed records there'})),scope:'Corporate coordination only; client source records not inspected',allClear:false};
 }
 if(key==='strategy-dependency-map-v1')return{kind:'Strategy dependency map',items:tasks.filter(t=>t.status!=='Completed').map(t=>({...ref(t),acceptance:t.plan.acceptance||null,deadline:t.plan.deadline||null,dependency:t.status==='Queued'?'Exact current reviews, CEO permission and available worker':t.status==='Awaiting audit'?'Exact attempt/outcome audit':'Reconcile persisted status and source evidence'})),corporateRevenueBaseline:null,financialProgress:null,nextAction:'Resolve source-backed dependencies before claiming business outcomes; task counts are not growth'};
 return null;
}
