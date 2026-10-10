import type {Data} from './pool';
import {canonicalRecord} from './workflow-controls';
import {incomeRows} from './accounting-model';
import {cashAccounts,manualBankBalance} from './cash-planning';
import {latest} from './pool';
import {native,bookChart,reconcilableAccount} from './native-accounting';
import {payables,payableState} from './payables-ledger';

export const accountingSections=['Receivables','Payables','Financial accounts','Journal entries','Bank transfers','GL accounts','Diagnostics','Online payments','Monthly close'] as const;
export type AccountingSection=typeof accountingSections[number];
export const accountingPages:Record<AccountingSection,string[]>={
 Receivables:['Additional receipt types','Tenant ledger posting','Tenant rent','Rent reconciliation','Receipts & charges','QBO receipt imports','Escrow'],
 Payables:['Bills & credits','Bulk bill entry & approval','Recorded bill settlement','Recurring bills & credits','Agency income & payables','Supplier invoice imports','Procurement & inventory','Payment posting review'],
 'Financial accounts':['Bank account setup','Bank transaction review','Grouped deposits','Financial account overview','Bank balances & checks','Payment posting review','Statement reconciliation','Company accounting reports'],
 'Journal entries':['Native ledger','Recurring journals','Journal entry batches','Journal register','Company accounting reports'],
 'Bank transfers':['Completed bank transfers','Transfer register'],
 'GL accounts':['Chart & mapping','QBO exports','QBO connection'],
 Diagnostics:['Review exceptions'],
 'Online payments':['Provider setup','Payment availability'],
 'Monthly close':['Pool allocation & contracts','Owner bills & monthly close']
};
export const accountingDescriptions:Record<AccountingSection,string>={Receivables:'Review charges, receipts and tenant balances.',Payables:'Review supplier charges, supporting documents and accounting treatment.','Financial accounts':'Review bank balances, reconcile statements and manage check capacity.','Journal entries':'Post and review native journals, recurring templates and external evidence.','Bank transfers':'Review completed transfers, post both bank sides and reconcile each account.','GL accounts':'Review your company chart, account mapping and QuickBooks exchange.',Diagnostics:'Find exceptions and open the records that need attention.','Online payments':'Review collection availability and recorded receipt activity.','Monthly close':'Review allocations, owner packets and monthly closing controls.'};
export type JournalRecord={id:string;date:string;reference:string;system:string;company:string;externalId:string;chartId:string;memo:string;reviewer:string;created:string;lines:{accountKey:string;debit:number;credit:number;unitId:string;memo:string}[]};
export type TransferRecord={id:string;date:string;reference:string;system:string;company:string;externalId:string;chartId:string;fromKey:string;toKey:string;cents:number;outReference:string;inReference:string;reviewer:string;created:string};
function text(v:unknown,max=500):v is string{return typeof v==='string'&&!!v.trim()&&v.length<=max;}
function date(v:string){return /^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v+'T12:00:00Z'))&&new Date(v+'T12:00:00Z').toISOString().slice(0,10)===v;}
function amount(v:number){return Number.isSafeInteger(v)&&v>=0&&v<=100000000000;}
export function journalTotals(r:JournalRecord){return r.lines.reduce((n,l)=>({debit:n.debit+l.debit,credit:n.credit+l.credit}),{debit:0,credit:0});}
export function validateAccountingRegisters(d:Data,old?:Data){
 const previous=old?.accounting;
 for(const key of ['journalRecords','transferRecords'] as const){
  const records=d.accounting?.[key]??[],prior=previous?.[key]??[];
  if(!Array.isArray(records)||records.length>20000||records.some(r=>!text(r.id,100))||new Set(records.map(r=>r.id)).size!==records.length)throw Error('Invalid accounting register');
  if(canonicalRecord(records.slice(0,prior.length))!==canonicalRecord(prior))throw Error('Accounting register history is immutable');
  const sources=new Set<string>(),refs=new Set<string>();
  for(const r of records){
   if(!date(r.date)||!text(r.reference,200)||!text(r.system,100)||!text(r.company,200)||!text(r.externalId,200)||!text(r.reviewer,200)||!Number.isFinite(Date.parse(r.created)))throw Error('Enter a valid date, company, external transaction ID, source reference and reviewer');
   const source=[r.system,r.company,r.externalId].map(v=>v.trim().toLowerCase()).join('|'),ref=r.reference.trim().toLowerCase();
   if(sources.has(source)||refs.has(ref))throw Error('External transaction already recorded');sources.add(source);refs.add(ref);
   const chart=d.glControls?.charts.find(c=>c.id===r.chartId);if(!chart||chart.company.trim().toLowerCase()!==r.company.trim().toLowerCase())throw Error('Select the reviewed chart for the same external company');
   const existing=prior.some(p=>p.id===r.id);
   if(!existing&&d.glControls?.charts.filter(c=>c.company.trim().toLowerCase()===r.company.trim().toLowerCase()).at(-1)?.id!==chart.id)throw Error('Select the latest reviewed company chart');
   if(!existing&&!d.periods.some(p=>p.month===r.date.slice(0,7)))throw Error('Choose an existing accounting month');
   if(!existing&&[...(old?.closeControls?.events??[])].reverse().find(e=>e.period===r.date.slice(0,7))?.kind==='Closed')throw Error('Reopen the accounting month before adding register records');
   const active=(key:string)=>chart.accounts.find(a=>a.key===key&&(existing||a.active));
   if(key==='journalRecords'){
    const j=r as JournalRecord;
    if(!text(j.memo,2000)||!Array.isArray(j.lines)||j.lines.length<2||j.lines.length>100)throw Error('Enter a memo and at least two journal lines');
    for(const l of j.lines)if(!active(l.accountKey)||!amount(l.debit)||!amount(l.credit)||!(l.debit>0&&l.credit===0||l.credit>0&&l.debit===0)||typeof l.memo!=='string'||l.memo.length>500||typeof l.unitId!=='string'||l.unitId&&!d.units.some(u=>u.id===l.unitId))throw Error('Each journal line requires an active account and either a debit or credit');
    const t=journalTotals(j);if(!Number.isSafeInteger(t.debit)||t.debit!==t.credit||!t.debit)throw Error('Journal debits and credits must balance');
   }else{
    const t=r as TransferRecord,from=active(t.fromKey),to=active(t.toKey);
    if(!from||!to||from.key===to.key||from.qboId&&from.qboId===to.qboId||from.type.toLowerCase()!=='bank'||to.type.toLowerCase()!=='bank'||!amount(t.cents)||!t.cents||!text(t.outReference)||!text(t.inReference))throw Error('Transfer requires distinct Bank accounts, amount and evidence for both sides');
   }
  }
 }
}
export type AccountingException={id:string;title:string;count:number;detail:string;section:AccountingSection;page:string};
export function appliedThroughMonth(d:Data,entryId:string,period:string){
 const entries=new Map((d.operations?.tenantEntries??[]).filter(e=>e.date.slice(0,7)<=period).map(e=>[e.id,e]));
 return (d.accounting?.applications??[]).filter(a=>(a.receiptId===entryId||a.chargeId===entryId)&&entries.has(a.receiptId)&&entries.has(a.chargeId)).reduce((n,a)=>n+a.cents,0);
}
export function accountingDiagnostics(d:Data,period:string):AccountingException[]{
 const entries=(d.operations?.tenantEntries??[]).filter(e=>e.date.slice(0,7)<=period),classifications=incomeRows(d,period),statements=latest(d,period),results:AccountingException[]=[];
 const add=(id:string,title:string,count:number,detail:string,section:AccountingSection,page:string)=>results.push({id,title,count,detail,section,page});
 add('open-charges','Open tenant charges',entries.filter(e=>e.kind==='Charge'&&e.cents>appliedThroughMonth(d,e.id,period)).length,'Includes unpaid and partially applied charges through this month.','Receivables','Receipts & charges');
 add('unapplied','Unapplied receipts & credits',entries.filter(e=>e.kind!=='Charge'&&e.cents>appliedThroughMonth(d,e.id,period)).length,'Review each receipt or credit before matching it to a charge.','Receivables','Receipts & charges');
 add('classifications','Unconfirmed accounting treatment',classifications.filter(r=>!r.confirmed).length,'Review supplier, source, payment state and company GL account.','Payables','Agency income & payables');
 add('opening','Unverified owner opening balances',statements.filter(s=>!s.openingConfirmed).length,'Verify source balances before approving statements.','Monthly close','Owner bills & monthly close');
 add('chart','Company chart review',d.glControls?.charts.length?0:1,'Import and verify the company chart before recording journal or transfer evidence.','GL accounts','Chart & mapping');
 for(const account of cashAccounts){const planning=d.accounting?.cashPlanning;const b=manualBankBalance(planning?{...planning,manualEntries:(planning.manualEntries??[]).filter(e=>e.date.slice(0,7)<=period)}:undefined,account);add('bank:'+account,account+' balance review',b.difference===0?0:1,b.difference===null?'Starting posted balance or bank snapshot is missing.':'Recorded bank and posted amounts differ. Matching amounts alone do not certify bank reconciliation.','Financial accounts','Bank balances & checks');}
 const deposits=(d.accounting?.deposits??[]).filter(e=>e.date.slice(0,7)<=period),tenantIds=(d.operations?.tenants??[]).map(t=>t.id),negative=tenantIds.filter(id=>deposits.filter(e=>e.tenantId===id&&e.approved).reduce((n,e)=>n+(e.kind==='Received'?e.cents:-e.cents),0)<0).length;
 add('escrow','Negative deposit liabilities',negative,'Review original deposit, refund and deduction evidence.','Receivables','Escrow');
 const end=new Date(Date.UTC(Number(period.slice(0,4)),Number(period.slice(5)),0)).toISOString().slice(0,10),p=payables(d),documents=p.documents.filter(r=>r.date<=end);
 add('payable-approval','Payables awaiting approval or posting',documents.filter(r=>['Pending approval','On hold','Approved'].includes(payableState(d,r,end).status)).length,'Review the original itemized bill, approval decision and liability posting.','Payables','Bills & credits');
 add('payable-overdue','Overdue posted supplier bills',documents.filter(r=>r.kind==='Bill'&&r.due<end&&['Open','Partially settled'].includes(payableState(d,r,end).status)).length,'Review the supplier balance and existing payment before applying settlement.','Payables','Recorded bill settlement');
 add('payable-reversed','Reversed payable postings',documents.filter(r=>payableState(d,r,end).status==='Posting reversed — review').length,'Review the original source and correction; no payment should be applied to a reversed liability.','Payables','Bills & credits');
 add('native-books','Company ledger opening review',native(d).books.length?0:1,'Initialize verified company opening balances to use native reports and statement reconciliation.','Journal entries','Native ledger');
 let stale=0;for(const b of native(d).books)for(const bank of bookChart(d,b.id)?.accounts.filter(a=>a.active&&reconcilableAccount(a.type))??[]){const last=native(d).reconciliations.filter(r=>r.bookId===b.id&&r.accountKey===bank.key&&r.end<=end).at(-1)?.end??b.openingDate;if(Date.parse(end+'T12:00:00Z')-Date.parse(last+'T12:00:00Z')>60*86400000)stale++;}
 add('reconciliation-lapse','Bank / card reconciliations overdue by more than 60 days',stale,'Review each bank and carry forward its verified statement closing balance. Future statements do not clear historical exceptions.','Financial accounts','Statement reconciliation');
 return results;
}
