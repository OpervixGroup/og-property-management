export const workspaceNavigation=[
 ['home','Overview'],['properties','Properties Management'],['hoa','HOA'],['leasing','Leasing'],['realtor','Realtor Space'],['maintenance','Maintenance'],['accounting','Accounting'],['reporting','Reports'],['communication','Communications'],['office','Office 365'],['prospecting','Realtors AI Prospect'],['marketing','Marketing'],['lender','Lender Portal'],['insurance','Insurance Wallet']
] as const;
export function insuranceDocument(name:string){return /insurance|policy|policies|certificate of insurance|\bcoi\b/i.test(name);}
