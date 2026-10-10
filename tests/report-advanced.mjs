import assert from 'node:assert/strict';
import {fixture} from './model-loader.mjs';
import {PDFDocument} from 'pdf-lib';
const d=await fixture(),prior=structuredClone(d);
const {saveReportLayout,validateReportLayouts,arrangeReportRows}=await import('./.mock-runtime/report-layouts.mjs');
const {reportTablePDF}=await import('./.mock-runtime/report-pdf.mjs');
const {comparativeReport,previousMonth}=await import('./.mock-runtime/comparative-reports.mjs');
const {parseBudget,saveBudgetPlan,budgetComparison,validateBudgetPlans}=await import('./.mock-runtime/report-budgets.mjs');
const saved=saveReportLayout(d,{name:'Monthly receipt review',reportId:'receipts',propertyId:d.properties[0].id,columns:['Unit','Amount'],sort:'Amount',descending:true,reviewer:'QA'});
assert.deepEqual(d,prior);validateReportLayouts(d,saved);assert.equal(saved.reportLayouts.length,1);
const changed=structuredClone(saved);changed.reportLayouts[0].name='Tamper';assert.throws(()=>validateReportLayouts(saved,changed),/immutable/);
const removed=structuredClone(saved);removed.reportLayouts=[];assert.throws(()=>validateReportLayouts(saved,removed),/Archive/);
const archived=structuredClone(saved);archived.reportLayouts[0].archived=true;validateReportLayouts(saved,archived);assert.throws(()=>validateReportLayouts(archived,saved),/immutable/);
assert.throws(()=>saveReportLayout(d,{...saved.reportLayouts[0],propertyId:'other-company'}),/scope/);
assert.throws(()=>saveReportLayout(d,{...saved.reportLayouts[0],columns:['Secret field']}),/columns/);
const records=[{unitId:'a',values:['101','$900.00']},{unitId:'b',values:['102','$1,200.00']},{unitId:'c',values:['103','($20.00)']}];
assert.deepEqual(arrangeReportRows(records,['Unit','Amount'],'','Amount',false).map(r=>r.unitId),['c','a','b']);assert.equal(arrangeReportRows(records,['Unit','Amount'],'102','Amount',true)[0].unitId,'b');assert.equal(records[0].unitId,'a');
assert.equal(previousMonth('2026-01'),'2025-12');assert.throws(()=>previousMonth('2026-99'));
d.glControls={charts:[{id:'c',company:'Synthetic QA',accounts:[{key:'bank',name:'Operating',type:'Bank',active:true},{key:'equity',name:'Equity',type:'Equity',active:true},{key:'income',name:'Rent',type:'Income',active:true}]}],mappings:[]};
d.accounting={native:{books:[{id:'b',company:'Synthetic QA',chartId:'c',openingDate:'2026-09-01',opening:[{accountKey:'bank',debit:10000,credit:0},{accountKey:'equity',debit:0,credit:10000}]}],entries:[{id:'september',bookId:'b',date:'2026-09-15',lines:[{accountKey:'bank',debit:5000,credit:0},{accountKey:'income',debit:0,credit:5000}]},{id:'october',bookId:'b',date:'2026-10-07',lines:[{accountKey:'bank',debit:7000,credit:0},{accountKey:'income',debit:0,credit:7000}]},{id:'future',bookId:'b',date:'2026-11-01',lines:[{accountKey:'bank',debit:99900,credit:0},{accountKey:'income',debit:0,credit:99900}]}],rules:[],reconciliations:[],paymentConnections:[]}};
const comparison=comparativeReport(d,'b','Income statement - comparative','2026-10');assert.deepEqual(comparison.raw.find(r=>r.key==='income').values,[-5000,-7000]);assert.equal(comparison.raw.find(r=>r.key==='income').change,-2000);
const year=comparativeReport(d,'b','Income statement - 12 month','2026-10');assert.equal(year.raw.find(r=>r.key==='income').values[0],null);assert.equal(year.rows[0].length,13);
const balance=comparativeReport(d,'b','Balance sheet - comparative','2026-10');assert.deepEqual(balance.raw.find(r=>r.key==='bank').values,[15000,22000]);assert.throws(()=>comparativeReport(d,'other','Balance sheet - comparative','2026-10'),/company/);
const budgetCSV='account,01,02,03,04,05,06,07,08,09,10,11,12\nincome,0,0,0,0,0,0,0,0,50,60,70,80';
const budgetInput={bookId:'b',year:2026,name:'Synthetic rent plan',source:'Synthetic QA planning evidence',reviewer:'QA'};
const budgeted=saveBudgetPlan(d,budgetInput,budgetCSV),budgetId=budgeted.budgetPlans[0].id;assert.equal(d.budgetPlans,undefined);assert.equal(budgeted.accounting.native.entries.length,3);
assert.deepEqual(budgetComparison(budgeted,budgetId,'2026-10').rows[0].slice(1,5),['$60.00','$70.00','$10.00','$260.00']);
assert.throws(()=>parseBudget(d,'b',budgetCSV.replace('income,','bank,')),/income or expense/);assert.throws(()=>parseBudget(d,'b',budgetCSV+'\nincome,0,0,0,0,0,0,0,0,50,60,70,80'),/repeat/);assert.throws(()=>parseBudget(d,'b',budgetCSV.replace(',60,',',-60,')),/positive/);
const budgetTampered=structuredClone(budgeted);budgetTampered.budgetPlans[0].lines[0].months[9]=999;assert.throws(()=>validateBudgetPlans(budgeted,budgetTampered),/immutable/);assert.throws(()=>budgetComparison(budgeted,budgetId,'2027-01'),/year/);
const headers=['Unit','Resident','Date','Reference','Description','Amount','Status'];const rows=Array.from({length:120},(_,i)=>[String(i+1),'Synthetic resident','2026-10-07','QA-'+i,'Verified synthetic work details '.repeat(i===1?150:2),'$1,200.00','Active']);
const pdf=await reportTablePDF('Monthly receipt review','Synthetic QA only | October 2026','All rows are synthetic. No tenant payments were posted.',headers,rows),parsed=await PDFDocument.load(await pdf.arrayBuffer());assert(parsed.getPageCount()>4);assert.equal(parsed.getPages()[0].getWidth(),792);assert.equal(parsed.getPages()[0].getHeight(),612);
await assert.rejects(()=>reportTablePDF('Invalid','','',[],[]));
if(process.env.OG_QA_PDF){const {writeFile}=await import('node:fs/promises');await writeFile(process.env.OG_QA_PDF,new Uint8Array(await pdf.arrayBuffer()));}
console.log('Advanced reports: company-scoped immutable saved layouts, numeric sorting, comparisons, date cutoffs, unavailable history and multipage branded PDF passed.');

const {buildReport}=await import('./.mock-runtime/report-builder.mjs');
const source={headers:['Owner','Amount','Status'],rows:[['TAMIR','$100.00','Paid'],['TAMIR','$200.00','Paid'],['Other','($20.00)','Pending']],unitIds:['a','b','c'],note:'Synthetic only'};
assert.deepEqual(buildReport(source,[{column:'Amount',operator:'greater',value:'150'}],'','').unitIds,['b']);
assert.deepEqual(buildReport(source,[{column:'Status',operator:'equals',value:'paid'}],'Owner','Amount').rows,[['TAMIR','2','$300.00']]);
assert.deepEqual(buildReport(source,[],'Owner','Amount').rows[1],['Other','1','$-20.00']);
assert.throws(()=>buildReport(source,[],'Owner','Status'),/numeric/);
assert.throws(()=>buildReport(source,[{column:'Foreign',operator:'equals',value:'x'}],'',''),/valid/);
assert.equal(source.rows.length,3);
console.log('Custom report builder: combined filters, numeric comparisons, grouping, exact-cent totals and source immutability passed.');

await assert.rejects(()=>reportTablePDF('x'.repeat(141),'','', ['Unit'],[]),/too long/);
assert.throws(()=>buildReport({...source,headers:['Owner','Scope total (repeated)','Status']},[],'Owner','Scope total (repeated)'),/valid/);

assert.deepEqual(budgetComparison(budgeted,budgetId,'2026-10').rows[0].slice(5),['$110.00','$120.00','Partial: verified opening 2026-09-01']);

const {saveServiceConnection,validateServiceConnections}=await import('./.mock-runtime/service-connections.mjs');
const access=saveServiceConnection(d,{kind:'Banking',name:'Synthetic bank',url:'https://bank.example.com/login',reviewer:'QA'});
assert.equal(d.serviceConnections,undefined);validateServiceConnections(d,access);
assert.throws(()=>saveServiceConnection(access,{kind:'Banking',name:'Duplicate',url:'https://bank.example.com/login',reviewer:'QA'}),/already/);
assert.throws(()=>saveServiceConnection(d,{kind:'Banking',name:'Bad',url:'https://bank.example.com/login?token=secret',reviewer:'QA'}),/public HTTPS/);
const disabled=structuredClone(access);disabled.serviceConnections[0].disabled=true;validateServiceConnections(access,disabled);assert.throws(()=>validateServiceConnections(disabled,access),/immutable/);
const altered=structuredClone(access);altered.serviceConnections[0].url='https://other.example.com/';assert.throws(()=>validateServiceConnections(access,altered),/immutable/);
assert.throws(()=>validateServiceConnections(access,{...access,serviceConnections:[]}),/history/);
console.log('Service connections: company-scoped shortcut history, duplicate prevention, credential URL rejection and disable controls passed.');

const {plaidSetup}=await import('./.mock-runtime/plaid-setup.mjs');
assert.equal(plaidSetup({}).connected,false);assert.equal(plaidSetup({}).configured,false);
const env={OG_PLAID_ENABLED:'true',OG_PLAID_ENVIRONMENT:'sandbox',OG_PLAID_CLIENT_ID:'synthetic',OG_PLAID_SECRET:'synthetic-secret',OG_PLAID_ENCRYPTION_KEY:Buffer.alloc(32,1).toString('base64'),OG_APP_URL:'https://og.example.com',OG_PLAID_REDIRECT_URI:'https://og.example.com/plaid-return'};
assert.equal(plaidSetup(env).configured,true);assert.equal(plaidSetup(env).connected,false);assert(!JSON.stringify(plaidSetup(env)).includes('synthetic-secret'));
assert.deepEqual(plaidSetup({...env,OG_PLAID_REDIRECT_URI:'https://foreign.example.com/callback'}).invalid,['OG_PLAID_REDIRECT_URI']);
assert.equal(plaidSetup({...env,OG_PLAID_ENCRYPTION_KEY:'bad'}).configured,false);
console.log('Plaid readiness: fail-closed configuration, same-origin redirect, key validation and secret-free status passed.');
