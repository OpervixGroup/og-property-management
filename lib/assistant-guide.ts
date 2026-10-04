import {workflowGuides} from './workflow-guide';
export type GuideAnswer={text:string;guideIds:string[];questions:string[]};
export const quickQuestions:Record<string,string[]>={
 maintenance:['How do I issue inventory to a unit?','How do I post repair labor?','How do I return materials?'],
 people:['How do I match a tenant receipt?','How does rent become Partially Paid?'],
 accounting:['Can I upload tenant payments every five days?','How do duplicate payment imports work?','What is Amount to apply?','How do I allocate pool income?','How do I record escrow?','How do I export to QBO?'],
 statements:['How do I attach a receipt?','How do I approve a statement?','What does the owner see?'],
 distributions:['How do I combine owner units?','How do I record a payment?','How does Unit 108 HOA work?'],
 'general-settings':['How do I add a user?','What can an Accounting Clerk do?','Can the CPA edit records?'],
 properties:['How do I edit the company profile?','How do I retire a unit?'],
};
function guide(id:string,intro=''):GuideAnswer{const g=workflowGuides.find(g=>g.id===id)!;return {text:(intro?intro+'\n\n':'')+g.location+'\n\n'+g.purpose+'\n\n'+g.steps.map((s,i)=>(i+1)+'. '+s).join('\n')+'\n\n'+g.note,guideIds:[id],questions:quickQuestions[id]??['How do I attach a receipt?','How do I prepare owner distributions?']};}
export function answerGuide(question:string,context='home'):GuideAnswer{
 const q=question.trim().toLowerCase();
 if(!q)return {text:'What would you like to do in OG?',guideIds:[],questions:quickQuestions[context]??['How do I prepare owner distributions?','How do I add a user?']};
 if(/tenant payment|amount to apply|qbo.*(import|upload|csv|payment)|(import|upload|csv|payment).*qbo|five days|5 days|rerun|re-run|re run|duplicate.*(payment|receipt|import)|(payment|receipt|import).*duplicate/.test(q))return guide('accounting');
 if(/\b(1099|w-?9|taxpayer|onboarding)\b/.test(q))return guide('properties','Basic unit/owner onboarding is available from Units & owners or Properties → Activate / retire Unit → Onboard a new unit. Full protected tax records and 1099 preparation are not implemented. Dustin must review the reporting basis before year-end tax exports are added.');
 if(/\b(sharepoint|integrations?|connected|connect|sms|send.*email|email.*send|live ai)\b/.test(q))return {text:'OG currently uses private demo record and document storage. SharePoint, Microsoft email/calendar, QBO and AppFolio synchronization are not connected. Email preparation saves a draft; it does not send. This assistant uses the built-in OG knowledge base, with no live AI service or access to your account data.',guideIds:['communication','documents','general-settings'],questions:['How do I prepare an owner email?','How do I attach a receipt?']};
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
 return {text:'I do not have a verified procedure for that question. Choose a suggested question or open the knowledge base below. I can explain OG workflows, but cannot inspect balances, change records or give a verified answer outside these guides.',guideIds:[],questions:quickQuestions[context]??['How do I prepare owner distributions?','How do I add a user?','How do I match a tenant receipt?']};
}
