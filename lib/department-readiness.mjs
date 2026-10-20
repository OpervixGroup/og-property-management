import{handlerRoles}from'./department-functions.mjs';
export function departmentReadiness(){return[
 {department:'Operations',functions:['operations-exceptions-v1'],remaining:'Client service workflows need exact tenant/source identity and approved persistent client connections.'},
 {department:'Secretary',functions:['secretary-daily-digest-v1'],remaining:'Artifact generation only. Cloud mail sending/delegation and exact mail approval controls are not established by interactive connector access.'},
 {department:'Technology / QA / Security',functions:['og-headquarters-access-v1'],remaining:'Deployed exact-version acceptance and protected release remain pending; no general command execution.'},
 {department:'People / Capacity',functions:['capacity-workload-v1'],remaining:'Measured utilization and staffing availability remain unknown; no provisioning or hiring function.'},
 {department:'Legal / Risk',functions:['risk-review-expiry-v1'],remaining:'Freshness findings only. Substantive exact-plan review is still required; this function never grants approval.'},
 {department:'Audit',functions:['audit-evidence-gaps-v1'],remaining:'Detects missing/mismatched evidence; does not certify independent review or auto-complete tasks.'},
 {department:'Finance',functions:['finance-source-boundary-v1'],remaining:'Correct corporate accounting realm/source must be verified. Client books cannot substitute; no financial writes.'},
 {department:'Sales / Marketing',functions:['sales-evidence-inventory-v1'],remaining:'Existing prospect package, CRM cloud authority and exact source/recipient controls required. Outreach remains paused.'},
 {department:'Client Experience',functions:['client-delivery-exceptions-v1'],remaining:'Exact client tenant, permitted source scope and delegated report sender must be verified separately.'},
 {department:'Strategy / PMO',functions:['strategy-dependency-map-v1'],remaining:'Verified corporate baseline and source-backed milestones required; queue metrics are not revenue or target attainment.'}
].map(r=>({...r,implemented:r.functions.length>0,status:r.functions.length?'Bounded evidence function implemented; reviewed execution and external connections remain separate':'Blocked on scope-specific sources/connections',roleBindings:Object.fromEntries(r.functions.map(k=>[k,handlerRoles[k]])),activation:'No automatic department activation; current real task lease and CEO controls determine Active'}));}
