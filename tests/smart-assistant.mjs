import assert from 'node:assert/strict';
import {fixture} from './model-loader.mjs';
const d=await fixture(),root=new URL('./.mock-runtime/',import.meta.url),{answerRecords}=await import(new URL('assistant-records.mjs',root));
const manager={role:'Management',property_ids:['property-devonshire']},maintenance={role:'Maintenance',property_ids:['property-devonshire']},agent={role:'Analyst / Agent',property_ids:['property-devonshire']};
const {emptyAccounting}=await import(new URL('accounting-model.mjs',root));d.accounting=emptyAccounting();const u=d.units.find(u=>u.number==='106');d.operations.occupancy=[{id:'occ106',unitId:u.id,month:'2026-10',status:'Occupied',notes:'QA'}];const tenant=d.operations.tenants[0];d.operations.tenantEntries=[{id:'charge',tenantId:tenant.id,date:'2026-10-01',kind:'Charge',category:'Rent',description:'October rent',cents:100000,reference:'INV-QA'}];d.accounting.applications=[];
let checks=0;const check=(label,fn)=>{fn();checks++;console.log('PASS '+label);};
check('Verified unit occupancy comes from saved month',()=>assert.match(answerRecords(d,manager,'Is unit 106 occupied?','2026-10').text,/Verified occupancy: Occupied/));
check('Missing occupancy is unverified rather than inferred vacant',()=>assert.match(answerRecords(d,manager,'Show unit 106','2026-09').text,/Unverified/));
check('Saved arrears map through tenant to assigned unit',()=>assert.match(answerRecords(d,manager,'Show unpaid tenant charges','2026-10').text,/\$1,000.00/));
check('Unit-specific financial follow-up retains the correct unit',()=>{const first=answerRecords(d,manager,'Show unit '+d.units[0].number,'2026-10');const follow=answerRecords(d,manager,'What about rent?','2026-10','home',first.unitNumber);assert.equal(follow.unitNumber,d.units[0].number);assert.match(follow.text,/\$1,000.00/);});
check('Global question clears unit focus',()=>{const a=answerRecords(d,manager,'Show my open work orders','2026-10','home','106');assert.match(a.text,/Open work orders in your assigned scope: 2/);assert.equal(a.unitNumber,undefined);});
check('Multiple units request clarification without mixing balances',()=>assert.equal(answerRecords(d,manager,'Compare unit 106 and unit 101','2026-10').mode,'Clarification'));
check('Out-of-scope units are not disclosed',()=>assert.match(answerRecords(d,agent,'Show unit 999','2026-10').text,/unavailable/));
check('Scoped maintenance queue excludes another property',()=>{const a=answerRecords(d,maintenance,'Show my open work orders','2026-10');assert.match(a.text,/scope: 1/);assert(!a.text.includes('w2'));});
check('Maintenance financial request is denied',()=>{const a=answerRecords(d,maintenance,'What is the rent for unit '+d.units[0].number,'2026-10');assert.match(a.text,/does not include/);assert(!a.text.includes('$'));});
check('DLA income is private even for scoped financial agents',()=>assert.match(answerRecords(d,agent,'What is DLA income?','2026-10').text,/restricted/));
check('Monthly review provides actual blockers without closing records',()=>{const before=JSON.stringify(d),a=answerRecords(d,manager,'What needs review this month?','2026-10');assert.match(a.text,/Monthly review/);assert.equal(JSON.stringify(d),before);});
check('Unsupported questions receive honest guide fallback',()=>assert.equal(answerRecords(d,manager,'What is the weather in Paris?','2026-10').mode,'Workflow guide'));
check('Provider guide no longer claims demo storage',()=>{const a=answerRecords(d,manager,'How do I connect Outlook?','2026-10');assert.match(a.text,/Supabase/);assert(!a.text.includes('demo record'));});
check('Invalid month is rejected',()=>assert.throws(()=>answerRecords(d,manager,'Show unit 106','2026-99')));
console.log(checks+' smart assistant scenarios passed');
const {answerGuide}=await import(new URL('assistant-guide.mjs',root));
const {workflowGuides,searchWorkflowGuides}=await import(new URL('workflow-guide.mjs',root));
for(const [question,id] of [
 ['How do I import bulk bills?','bulk'],['How do I pause recurring bills?','recurring'],
 ['How do I reconcile issued checks?','reconciliation'],['How do I post tenant receipts?','receivables'],
 ['Show trial balance','reports'],['How do I import journal entries?','journals'],
 ['How do I record a bank transfer?','transfers'],['Show accounting diagnostics','diagnostics'],
 ['How do I connect an ACH provider?','provider'],['Show unpaid bills','payables']
])check(question,()=>{const before=JSON.stringify(d),a=answerRecords(d,manager,question,'2026-10','accounting','106');assert.deepEqual(a.guideIds,['accounting-'+id]);assert.equal(a.mode,'Workflow guide');assert.equal(a.unitNumber,undefined);assert.equal(JSON.stringify(d),before);});
check('Bulk inventory remains Maintenance',()=>assert.deepEqual(answerGuide('How do I receive bulk parts?').guideIds,['maintenance']));
check('New guides navigate to valid Accounting screen and retain valid related guides',()=>{for(const g of workflowGuides.filter(g=>g.id.startsWith('accounting-'))){assert.equal(g.target,'accounting');for(const id of g.links)assert(workflowGuides.some(x=>x.id===id));}});
check('Bank guidance no longer denies reconciliation availability',()=>{assert(!workflowGuides.find(g=>g.id==='accounting').note.includes('No bank balance'));assert.match(answerGuide('How do I reconcile issued checks?').text,/outstanding until the bank clears/);});
check('Provider guidance does not promise live collection',()=>assert.match(answerGuide('How do I connect an ACH provider?').text,/does not send ACH/));
check('Scoped roles receive guidance without company financial disclosure',()=>{for(const member of [maintenance,agent]){const a=answerRecords(d,member,'Show unpaid bills','2026-10');assert.equal(a.mode,'Workflow guide');assert(!a.text.includes('$1,000'));}});
console.log('Expanded accounting assistant checks passed: '+checks);
check('Mapping guidance explains blocked Save and excludes escrow as income',()=>{const a=answerGuide('Why can I not save GL mapping?');assert.match(a.text,/reviewer/);assert.match(a.text,/escrow bank account cannot/);});
check('Weather and rental search guidance does not claim embedded AI',()=>{const a=answerGuide('Where is Apartments.com rental search and weather?');assert.match(a.text,/not as an embedded OG AI/);assert.match(a.text,/does not track device location/);});

const {accountingPages}=await import(new URL('accounting-workspace.mjs',root));
check('Every accounting subpage has one exact navigation guide',()=>{for(const page of new Set(Object.values(accountingPages).flat()))assert.equal(workflowGuides.filter(g=>g.target==='accounting'&&g.page===page).length,1);});
check('Guide IDs are unique and every walkthrough has steps',()=>{assert.equal(new Set(workflowGuides.map(g=>g.id)).size,workflowGuides.length);assert(workflowGuides.every(g=>g.steps.length&&g.steps.every(s=>s.trim())));});
check('Card setup answer navigates to exact bank setup page',()=>{const a=answerRecords(d,manager,'How do I add a credit card?','2026-10','accounting');const g=workflowGuides.find(g=>g.id===a.guideIds[0]);assert.equal(g.page,'Bank account setup');assert.equal(a.mode,'Workflow guide');assert.equal(a.unitNumber,undefined);});
check('Page-specific guided context retains its walkthrough',()=>{const id=workflowGuides.find(g=>g.page==='Grouped deposits').id;assert.equal(answerGuide('Walk me through this page',id).guideIds[0],id);});
check('Marketing, prospecting and lender guidance cannot claim active integrations',()=>{for(const id of ['marketing','prospecting','lender'])assert.equal(workflowGuides.find(g=>g.id===id).availability,'Planned');});
check('Knowledge base includes every daily navigation module',()=>{for(const id of ['home','properties','hoa','leasing','realtor','maintenance','accounting','reporting','communication','office','prospecting','marketing','lender','insurance'])assert(workflowGuides.some(g=>(g.target??g.id)===id));});
check('Subscription and recovery answer without financial mutation',()=>{const before=JSON.stringify(d);assert.equal(answerGuide('Print software invoice').guideIds[0],'subscription-help');assert.equal(answerGuide('Download workspace backup').guideIds[0],'backup-help');assert.equal(JSON.stringify(d),before);});

check('Knowledge search prioritizes exact page names',()=>{assert.equal(searchWorkflowGuides('bank account setup')[0].page,'Bank account setup');});
