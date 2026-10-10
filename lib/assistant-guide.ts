import {workflowGuides} from './workflow-guide';
export type GuideAnswer={text:string;guideIds:string[];questions:string[]};
export const quickQuestions:Record<string,string[]>={
 reporting:['How do I find a report?','How do I customize report columns?','How do I save a report layout?','How do I compare monthly reports?','How do I print owner packets?'],
 home:['What needs review this month?','Show vacant units','Show my open work orders'],
 maintenance:['Show my open work orders','How do I issue inventory to a unit?','How do I post repair labor?','How do I return materials?'],
 people:['Show unpaid tenant charges','How do I match a tenant receipt?','How does rent become Partially Paid?'],
 accounting:['What needs review this month?','How do I reconcile issued checks?','How do I import bulk bills?','How do I post tenant receipts?','How do I print the trial balance?'],
 statements:['How do I attach a receipt?','How do I approve a statement?','What does the owner see?'],
 distributions:['How do I combine owner units?','How do I record a payment?','How does Unit 108 HOA work?'],
 'general-settings':['How do I set up Plaid?','Where are company connections?','How do I add a user?','What can an Accounting Clerk do?','Can the CPA edit records?'],
 properties:['Show vacant units','How do I edit the company profile?','How do I retire a unit?'],
};
function guide(id:string,intro=''):GuideAnswer{const g=workflowGuides.find(g=>g.id===id)!;return {text:(intro?intro+'\n\n':'')+g.location+'\n\n'+g.purpose+'\n\n'+g.steps.map((s,i)=>(i+1)+'. '+s).join('\n')+'\n\n'+g.note,guideIds:[id],questions:quickQuestions[id]??['Walk me through '+g.title,'What needs review this month?']};}
export function answerGuide(question:string,context='home'):GuideAnswer{
 const q=question.trim().toLowerCase();
 if(/subscription|billable units|software invoice|cancel.*portal|restart.*subscription/.test(q))return guide('subscription-help');
 if(/backup|recovery drill|restore.*workspace/.test(q))return guide('backup-help');
 if(/reset.*password|forgot.*password|platform.*admin|super admin/.test(q))return guide('account-access-help');
 const pageGuide=workflowGuides.find(g=>g.page&&(g.target===context||g.title.length>8)&&(q.includes(g.title.toLowerCase())||g.page==='Bank account setup'&&/add.*(bank account|credit card)|open.*register/.test(q)));
 if(pageGuide)return guide(pageGuide.id);
 if(/walk me through|guide me|what can i do here|this page/.test(q)&&workflowGuides.some(g=>g.id===context))return guide(context);
 const moduleGuide=workflowGuides.find(g=>['insurance','hoa','realtor','prospecting','marketing','lender','office'].includes(g.id)&&q.includes(g.title.toLowerCase()));if(moduleGuide)return guide(moduleGuide.id);
 if(/grouped deposit|undeposited|credit.card.*reconcil|bank transaction review|save.*later|additional receipt/.test(q))return {text:'Open Accounting → Financial accounts → Bank transaction review to import reviewed bank or card CSV rows, then match them to existing posted journals. Pending and Excluded rows do not post money. Use Grouped deposits to select ungrouped receipts already posted to Undeposited Funds, choose the bank and separately record a verified fee. Additional receipt types in Receivables supports owner contributions, other income, vendor refunds and tenant security-deposit liabilities. Next open Statement reconciliation: import the original statement, match its rows, and save for later or complete only when both differences are zero. Card charges are positive and payments / refunds negative; the balance is the amount owed. OG does not copy QBO reconciliation selections or alter QBO transactions.',guideIds:['accounting'],questions:['How do I post tenant receipts?','How do I reconcile issued checks?']};
 if(/weather|apartments\.com|rental search/.test(q))return {text:'The public OG homepage offers an external Apartments.com search link and National Weather Service forecasts for selected U.S. and Puerto Rico cities. Choose Your area, then Show forecast. OG does not track device location. Apartments.com search runs on their website, not as an embedded OG AI service. Forecasts show source update dates and may be temporarily unavailable.',guideIds:[],questions:['Where are company connections?']};
 if(/gl mapping|account mapping|mapping.*save|save.*mapping/.test(q))return {text:'Open Accounting → GL accounts → Chart & mapping. Review the company chart, select a role and a compatible active account, then enter the mapping source or approved agreement and the reviewer. The page explains missing requirements beside Save. DLA fee income requires an income account; an escrow bank account cannot be mapped as income. Bank roles must remain distinct. Saving a mapping does not post a payment or change QBO.',guideIds:['accounting'],questions:['Where are company connections?','What needs review this month?']};
 if(/plaid|company connections|outside services|microsoft 365|office 365|o365|bank connection|provider access/.test(q))return guide('connections');
 if(/saved report|report layout|compare monthly reports|budget plan|report center|report library|report columns|favorite.*report|find.*report|customize.*report/.test(q))return guide('reporting');
 if(/(bulk|batch).*(bill|payable|supplier|credit)|(bill|payable).*(bulk|batch)/.test(q))return guide('accounting-bulk');
 if(/recurring.*(bill|payable|transaction)|(?:bill|payable).*recurring/.test(q))return guide('accounting-recurring');
 if(/bank account setup|pool rent.*(opening|zero|starting)|starting balance|opening balance/.test(q))return guide('accounting-reconciliation');
 if(/bank.*reconcil|reconcil.*(bank|check|cheque)|issued checks|outstanding checks/.test(q))return guide('accounting-reconciliation');
 if(/tenant.*(post|native ledger)|(post|ledger posting).*(tenant|receipt|charge)/.test(q))return guide('accounting-receivables');
 if(/trial balance|balance sheet|profit and loss|journal register|check register|deposit register|native.*report|general ledger report/.test(q))return guide('accounting-reports');
 const reportGuide=workflowGuides.find(g=>g.id.startsWith('report-page-')&&q.includes(g.title.toLowerCase()));if(reportGuide)return guide(reportGuide.id);
 if(/journal entr|journal.*(csv|batch|post)/.test(q))return guide('accounting-journals');
 if(/bank transfer|transfer.*bank/.test(q))return guide('accounting-transfers');
 if(/diagnostic|accounting exception/.test(q))return guide('accounting-diagnostics');
 if(/(ach|card|payment).*(provider|processor|connect|setup)|online payments/.test(q))return guide('accounting-provider');
 if(/\b(payables|supplier bill|vendor bill|aged payable|unpaid bills|bill approval)\b/.test(q))return guide('accounting-payables');
 if(!q)return {text:'What would you like to do in OG?',guideIds:[],questions:quickQuestions[context]??['How do I prepare owner distributions?','How do I add a user?']};
 if(/\b(1099|w-?9|taxpayer|onboarding)\b/.test(q))return guide('properties','Basic unit/owner onboarding is available from Units & owners or Properties → Activate / retire Unit → Onboard a new unit. Full protected tax records and 1099 preparation are not implemented. Dustin must review the reporting basis before year-end tax exports are added.');
 if(/\b(sharepoint|integrations?|connected|connect|sms|send.*email|email.*send|live ai)\b/.test(q))return {text:'OG uses Supabase records and private document storage. General settings shows Microsoft sign-in and Outlook setup status. Work-order changes queue shared-mailbox notices; sending and reply checks require activated Microsoft settings and a scheduler. Reviewed QBO CSV exchange is available; QBO review downloads use the configured company connection; no automatic financial posting occurs. The assistant reads authorized saved OG records, without an external AI service.',guideIds:['communication','documents','general-settings'],questions:['How do I prepare an owner email?','How do I attach a receipt?']};
 if(/(electric|electricity).*(market|sale|outside)|(market|sale|outside).*(electric|electricity)/.test(q))return guide('settings','Market units outside the active leasing pool pay their own electricity, without a shared electricity charge. Use Properties to record effective participation correctly. Active leasing-pool units, including vacant/make-ready units, share the reviewed pool electricity bill.');
 if(/\b(108|hmr)\b/.test(q))return guide('distributions','Unit 108 has no tenant and is HOA-only. Its outstanding $319 HOA charge offsets HMR’s selected positive owner distributions once. Any uncovered balance remains an owner bill; OG records no bank transfer.');
 if(/\b(1315|aguirre)\b/.test(q))return guide('statements','Unit 1315’s HOA is deducted through Unit 1607, shown as a separate deduction. Unit 1315 has no electricity pool share.');
 if(/\b(171|430\.78|1607)\b/.test(q))return guide('statements','The original Unit 1607 example has $1,144 allocated income minus $713.22 in six separate deductions = $430.78. Later additional charges, including Unit 1315 HOA, change the current distribution. The original $171 actual-rent/allocation difference remains unclassified.');
 if(/monthly rent reconciliation|unexplained difference|clearing|rollover|roll over|close.*month|month.*clos/.test(q))return guide('home');
 if(/(fees|management fee|maintenance fee).*(total|sum|operations|operating)|(total|sum).*(fees|management|maintenance|electric)|(operating|operations).*account/.test(q))return guide('home','The Pool month card shows HOA fees, Maintenance Fee and Management Fee under Proposed Devonshire fees, their total, and separate pool electricity. Monthly rent reconciliation compares recorded rent with owner income shares and charges, and shows an unexplained difference. Matched receipts and unverified manual rent remain distinct; opening balances, adjustments, payments and HOA offsets are excluded. This is an allocation review, not bank reconciliation or a transfer.');
 if(/\b(tenant|resident)\b/.test(q)&&!/(lease|leasing|occupancy)/.test(q))return guide('people');
 if(/\b(lease|leasing|occupancy|signed|prospect|showing)\b/.test(q))return guide('leasing');
 if(/\b(pets?|animal|vehicle|car|license plate|mail key|unit key)\b/.test(q)&&!/(work order|maintenance|permission|entry)/.test(q))return guide('people');
 if(/permission to enter|entry instructions|entry information|work order.*pet|pet.*work order/.test(q))return guide('maintenance');
 if(/\b(user|users|role|roles|permission|permissions|clerk|cpa|accountant|login|logins|password|profile|logout|log out|version|rows|page size)\b/.test(q))return guide('general-settings');
 if(/general settings|monthly settings/.test(q))return guide(q.includes('general')?'general-settings':'settings');
 if(/\b(dashboard)\b/.test(q))return guide('home');
 if(/\b(documents?|supporting files)\b/.test(q)&&!/(attach|upload)/.test(q))return guide('documents');
 if(/\b(company|address|phone|retire|retirement|activate|activation|property)\b/.test(q))return guide('properties');
 if(/\b(tenant|resident|partially|pending.*paid|match|apply receipt|ar|a\/r)\b/.test(q))return guide('people');
 if(/\b(inventory|procurement|stock|bulk|sku|materials?|parts?|return|reversal|labor|work order|maintenance)\b/.test(q))return guide('maintenance');
 if(/\b(allocate|allocation|expected|assumption|electricity|electric|escrow|deposit|qbo|quickbooks|gl|income|payables|ap|a\/p|contract|ownership transfer)\b/.test(q))return guide('accounting');
 if(/\b(combine|combined|package|distribution|distributions|check|payment|paid|hoa)\b/.test(q))return guide('distributions');
 if(/\b(receipt|charge|credit)\b/.test(q)&&!/(owner|statement|attach|invoice|upload|support)/.test(q))return {text:'Which type of entry do you mean: a tenant charge/receipt, an owner statement deduction, or inventory charged to a unit?',guideIds:['people','statements','maintenance'],questions:['How do I match a tenant receipt?','How do I attach an owner receipt?','How do I issue inventory to a unit?']};
 if(/\b(statement|owner|approve|approval|receipt|invoice|attach|upload|pdf|deduction|opening|balance)\b/.test(q))return guide('statements');
 if(/qbo.*(import|upload|csv|payment)|(import|upload|csv).*qbo|csv upload|import.*tenant.*payment/.test(q))return guide('accounting');
 if(/\b(import|csv|duplicate|unit|units)\b/.test(q))return guide('units');
 if(/\b(email|message|communication)\b/.test(q))return guide('communication');
 if(/\b(lease|leasing|occupancy|signed|prospect|showing)\b/.test(q))return guide('leasing');
 if(/\b(calendar|event|schedule)\b/.test(q))return guide('calendar');
 if(/\b(audit|history|activity)\b/.test(q))return guide('activity');
 if(/\b(report|reports|export|print)\b/.test(q))return guide('reporting');
 if(/\b(metric|metrics|chart|performance)\b/.test(q))return guide('metrics');
 if(/^(hello|hi|help|next|how do i use this|what do i do|what do i do next|tell me more)[?.!\s]*$/.test(q))return guide(workflowGuides.some(g=>g.id===context)?context:'home');
 return {text:'I do not have a verified procedure for that question. Choose a suggested question or open the knowledge base below. Ask about a unit, vacant units, open work orders, unpaid tenant charges or monthly review. I can check saved records and explain workflows; I cannot make changes or verify outside records.',guideIds:[],questions:quickQuestions[context]??['How do I prepare owner distributions?','How do I add a user?','How do I match a tenant receipt?']};
}
