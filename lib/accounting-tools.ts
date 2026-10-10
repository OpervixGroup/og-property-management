import type {Data} from './pool';
import {cents} from './pool';
import {parseCSV} from './exports';
import {native,bookChart,validateNativeAccounting,trialBalance,ledgerBalance,type LedgerEntry,type LedgerLine} from './native-accounting';

const actor=(reviewer:string)=>({id:crypto.randomUUID(),reviewer:reviewer.trim(),created:new Date().toISOString()});
const clean=(value:string)=>value.trim().toLowerCase();
function ready(d:Data,reviewer:string,verified:boolean){if(!verified||!reviewer.trim())throw Error('Verify the original source and enter the reviewer before posting');if(!d.accounting?.native)throw Error('Initialize the company ledger first');}
export function recordCompletedTransfer(d:Data,input:{bookId:string;fromKey:string;toKey:string;cents:number;date:string;reference:string;source:string;reviewer:string;verified:boolean}){
 ready(d,input.reviewer,input.verified);
 const chart=bookChart(d,input.bookId),from=chart?.accounts.find(a=>a.key===input.fromKey),to=chart?.accounts.find(a=>a.key===input.toKey);
 if(!from?.active||!to?.active||from.type.toLowerCase()!=='bank'||to.type.toLowerCase()!=='bank'||from.key===to.key||from.qboId&&from.qboId===to.qboId)throw Error('Choose two distinct active bank accounts in the same company');
 if(!Number.isSafeInteger(input.cents)||input.cents<=0||input.cents>100000000000||!input.source.trim())throw Error('Enter the positive transfer amount and verified evidence for both bank sides');
 const book=native(d).books.find(b=>b.id===input.bookId);
 if(native(d).entries.some(e=>e.bookId===input.bookId&&clean(e.reference)===clean(input.reference))||(d.accounting?.transferRecords??[]).some(r=>clean(r.company)===clean(book?.company??'')&&clean(r.reference)===clean(input.reference)))throw Error('Transfer reference is already recorded; review the existing entry');
 const next=structuredClone(d),entry:LedgerEntry={...actor(input.reviewer),bookId:input.bookId,date:input.date,reference:input.reference.trim(),memo:'Completed transfer evidence: '+input.source.trim(),reverses:'',recurringId:'',sourceSystem:'OG bank transfer',externalId:input.reference.trim(),lines:[{accountKey:input.toKey,debit:input.cents,credit:0,unitId:'',memo:'Verified incoming transfer'},{accountKey:input.fromKey,debit:0,credit:input.cents,unitId:'',memo:'Verified outgoing transfer'}]};
 next.accounting!.native!.entries.push(entry);validateNativeAccounting(next,d);validateAccountingTools(next);return next;
}
export const journalBatchHeaders=['date','reference','memo','account','unit','debit','credit','line_memo'];
export function parseJournalBatch(d:Data,bookId:string,text:string,reviewer:string):LedgerEntry[]{
 if(text.length>2000000)throw Error('Journal CSV exceeds 2 MB');
 const rows=parseCSV(text.replace(/^\uFEFF/,'')),header=(rows.shift()??[]).map(x=>x.trim());
 if(header.join('|')!==journalBatchHeaders.join('|')||!rows.length||rows.length>5000)throw Error('Use the journal template columns and 1–5000 lines');
 const chart=bookChart(d,bookId);if(!chart)throw Error('Select an initialized company ledger');
 const batchId=crypto.randomUUID(),groups=new Map<string,LedgerEntry>();
 for(const row of rows){if(row.length!==header.length)throw Error('Every journal CSV row must have eight columns');const [date,reference,memo,key,unit,debit,credit,lineMemo]=row.map(x=>x.trim());
  const matches=chart.accounts.filter(a=>a.active&&(a.key===key||a.number&&a.number===key));if(matches.length!==1)throw Error('Unknown or ambiguous active company GL account: '+key);
  const units=unit?d.units.filter(u=>u.id===unit||u.number===unit):[];if(unit&&units.length!==1)throw Error('Unknown or ambiguous unit; use the unit ID: '+unit);
  const line:LedgerLine={accountKey:matches[0].key,unitId:units[0]?.id??'',debit:cents(debit||'0'),credit:cents(credit||'0'),memo:lineMemo};
  const groupKey=clean(reference),existing=groups.get(groupKey);if(existing&&(existing.date!==date||existing.memo!==memo))throw Error('Journal lines sharing a reference must have the same date and memo');
  const entry=existing??{...actor(reviewer),bookId,date,reference,memo,lines:[],reverses:'',recurringId:'',sourceSystem:'OG journal batch',externalId:batchId+'|'+reference};entry.lines.push(line);groups.set(groupKey,entry);
 }
 const next=structuredClone(d);next.accounting!.native!.entries.push(...groups.values());validateNativeAccounting(next,d);return [...groups.values()];
}
export function postJournalBatch(d:Data,bookId:string,text:string,reviewer:string,verified:boolean){ready(d,reviewer,verified);const entries=parseJournalBatch(d,bookId,text,reviewer),next=structuredClone(d);next.accounting!.native!.entries.push(...entries);validateNativeAccounting(next,d);return next;}
export function validateAccountingTools(d:Data){for(const e of native(d).entries.filter(e=>e.sourceSystem==='OG bank transfer')){const chart=bookChart(d,e.bookId);if(e.lines.length!==2||e.lines.some(l=>chart?.accounts.find(a=>a.key===l.accountKey)?.type.toLowerCase()!=='bank'||l.unitId)||e.lines[0].accountKey===e.lines[1].accountKey||!e.memo.startsWith('Completed transfer evidence: ')||e.memo==='Completed transfer evidence: '||e.externalId!==e.reference||e.reverses||e.recurringId)throw Error('Completed transfer must preserve two bank sides and verified evidence');}}
export type NativeReportRow={accountKey:string;unitId:string;entryId:string;label:string;date:string;reference:string;debit:number;credit:number;balance:number};
export const nativeReportNames=['Trial balance','Balance sheet','Income statement','General ledger','Bank activity','Check register','Deposit register','Journal register'] as const;
export type NativeReportName=typeof nativeReportNames[number];
export function nativeReport(d:Data,bookId:string,name:NativeReportName,start:string,end:string,accountKey='',unitId=''):NativeReportRow[]{
 const book=native(d).books.find(b=>b.id===bookId),chart=bookChart(d,bookId);if(!book||!chart||!/^\d{4}-\d{2}-\d{2}$/.test(start)||!/^\d{4}-\d{2}-\d{2}$/.test(end)||!Number.isFinite(Date.parse(start+'T12:00:00Z'))||!Number.isFinite(Date.parse(end+'T12:00:00Z'))||new Date(start+'T12:00:00Z').toISOString().slice(0,10)!==start||new Date(end+'T12:00:00Z').toISOString().slice(0,10)!==end||start>end||end<book.openingDate)throw Error('Select the company book and a valid report date range');
 const label=(key:string)=>{const a=chart.accounts.find(a=>a.key===key);return [a?.number,a?.name??key].filter(Boolean).join(' · ');};
 if(['Trial balance','Balance sheet','Income statement'].includes(name)){
  if(unitId)throw Error('Company financial statements cannot be filtered to a unit; use the general ledger');
  const rows=trialBalance(d,bookId,end).filter(x=>!accountKey||x.account.key===accountKey),income=(type:string)=>['income','other income','expense','expenses','other expense','other expenses','cost of goods sold'].includes(type.toLowerCase());
  const result=rows.filter(x=>name==='Trial balance'||(name==='Balance sheet'?!income(x.account.type):income(x.account.type))).map(x=>{const before=name==='Income statement'?ledgerBalance(d,bookId,x.account.key,new Date(Date.parse(start+'T12:00:00Z')-86400000).toISOString().slice(0,10)):0,balance=x.balance-before;return {accountKey:x.account.key,unitId:'',entryId:'',label:label(x.account.key),date:end,reference:'',balance,debit:Math.max(0,balance),credit:Math.max(0,-balance)};});
  if(name==='Balance sheet'&&!accountKey){const earnings=trialBalance(d,bookId,end).filter(x=>income(x.account.type)).reduce((n,x)=>n-x.balance,0);result.push({accountKey:'',unitId:'',entryId:'',label:'Unclosed earnings',date:end,reference:'',balance:-earnings,debit:Math.max(0,-earnings),credit:Math.max(0,earnings)});}return result;
 }
 const bankReport=['Bank activity','Check register','Deposit register'].includes(name),running=new Map<string,number>(),result:NativeReportRow[]=[];
 for(const a of chart.accounts)running.set(a.key,unitId?book.opening.filter(l=>l.accountKey===a.key&&l.unitId===unitId).reduce((n,l)=>n+l.debit-l.credit,0):ledgerBalance(d,bookId,a.key,new Date(Date.parse(start+'T12:00:00Z')-86400000).toISOString().slice(0,10)));
 const entries=native(d).entries.filter(e=>e.bookId===bookId&&e.date<=end).sort((a,b)=>a.date.localeCompare(b.date)||a.created.localeCompare(b.created));
 for(const e of entries)for(const l of e.lines){if(unitId&&l.unitId!==unitId)continue;if(e.date<start){if(unitId)running.set(l.accountKey,(running.get(l.accountKey)??0)+l.debit-l.credit);continue;}const balance=(running.get(l.accountKey)??0)+l.debit-l.credit;running.set(l.accountKey,balance);if(accountKey&&l.accountKey!==accountKey)continue;if(bankReport&&chart.accounts.find(a=>a.key===l.accountKey)?.type.toLowerCase()!=='bank')continue;if(name==='Check register'&&l.credit===0||name==='Deposit register'&&l.debit===0)continue;result.push({accountKey:l.accountKey,unitId:l.unitId,entryId:e.id,label:label(l.accountKey),date:e.date,reference:e.reference,debit:l.debit,credit:l.credit,balance});}
 return result;
}
