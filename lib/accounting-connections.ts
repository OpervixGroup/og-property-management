import type {Data} from './pool';
import {latest} from './pool';
import {receiptReportingMonth} from './cash-planning';
import {canonicalRecord} from './workflow-controls';
export const BANK_SETUP_ROLES=['Pool rent','Operating','Escrow','Credit card'] as const;
export type BankSetupRow={id:string;accountId:string;version:number;role:typeof BANK_SETUP_ROLES[number];name:string;bankName:string;last4:string;start:string;opening:number|null;source:string;bookId:string;accountKey:string;reviewer:string;created:string};
export const clientHasPool=(d:Data)=>d.pools.length>0;
export function bankSetupLatest(d:Data){return [...new Map((d.accounting?.bankSetup??[]).map(r=>[r.accountId,r])).values()];}
export function bankSetupTemplates(d:Data,period:string):Omit<BankSetupRow,'id'|'accountId'|'version'|'reviewer'|'created'>[]{const roles:BankSetupRow['role'][]=clientHasPool(d)?['Pool rent','Operating','Escrow']:['Operating'];return roles.map(role=>({role,name:role==='Pool rent'?'Pool rent account':role==='Escrow'?'Escrow account':'Operating account',bankName:'',last4:'',start:period+'-01',opening:role==='Pool rent'&&period==='2026-10'&&d.properties.some(p=>p.id==='property-devonshire')?0:null,source:role==='Pool rent'&&period==='2026-10'&&d.properties.some(p=>p.id==='property-devonshire')?'Client confirmed October 2026 Pool Rent starting balance only':'',bookId:'',accountKey:''}));}
export function validateBankSetup(d:Data,old?:Data){const rows=d.accounting?.bankSetup??[],prior=old?.accounting?.bankSetup??[];if(!Array.isArray(rows)||rows.length>10000||new Set(rows.map(r=>r.id)).size!==rows.length||canonicalRecord(rows.slice(0,prior.length))!==canonicalRecord(prior))throw Error('Preserve bank setup history');const latest=new Map<string,BankSetupRow>();for(const r of rows){const previous=latest.get(r.accountId);if(!r.id||!r.accountId||!BANK_SETUP_ROLES.includes(r.role)||r.role==='Pool rent'&&!clientHasPool(d)&&!prior.some(p=>p.accountId===r.accountId)||typeof r.name!=='string'||!r.name.trim()||r.name.length>200||typeof r.bankName!=='string'||r.bankName.length>200||typeof r.last4!=='string'||r.last4&&!/^\d{4}$/.test(r.last4)||!/^\d{4}-\d{2}-\d{2}$/.test(r.start)||!Number.isFinite(Date.parse(r.start+'T12:00:00Z'))||new Date(r.start+'T12:00:00Z').toISOString().slice(0,10)!==r.start||r.opening!==null&&(!Number.isSafeInteger(r.opening)||Math.abs(r.opening)>100000000000)||typeof r.source!=='string'||r.source.length>2000||r.opening!==null&&!r.source.trim()||!r.reviewer?.trim()||!Number.isFinite(Date.parse(r.created))||r.version!==(previous?.version??0)+1||previous&&r.role!==previous.role)throw Error('Verify account role, four-digit bank identifier, starting date, balance source and reviewer');if(typeof r.bookId!=='string'||typeof r.accountKey!=='string'||!!r.bookId!==!!r.accountKey)throw Error('Select both company book and bank account');if(previous?.bookId&&['bookId','accountKey','start','opening'].some(k=>r[k as keyof BankSetupRow]!==previous[k as keyof BankSetupRow]))throw Error('Linked opening setup is locked; use reviewed accounting corrections');if(r.bookId){const b=native(d).books.find(b=>b.id===r.bookId),a=bookChart(d,r.bookId)?.accounts.find(a=>a.key===r.accountKey);if(!b||!a?.active||a.type.toLowerCase()!==(r.role==='Credit card'?'credit card':'bank'))throw Error('Select a verified company bank / card GL account');if(r.opening===null)throw Error('Verify the starting balance before linking a bank account');if(r.opening!==null&&(new Date(Date.parse(b.openingDate+'T12:00:00Z')+86400000).toISOString().slice(0,10)!==r.start||b.opening.filter(l=>l.accountKey===r.accountKey).reduce((s,l)=>s+l.debit-l.credit,0)*(r.role==='Credit card'?-1:1)!==r.opening))throw Error('Configured opening must match the verified book cutoff and account balance');}latest.set(r.accountId,r);}const used=new Set<string>();for(const r of latest.values())if(r.bookId){const key=r.bookId+'|'+r.accountKey;if(used.has(key))throw Error('Pool, operating and escrow accounts must use distinct ledger bank accounts');used.add(key);}}
export type ReconciliationSourceRow={id:string;date:string;reference:string;kind:string;description:string;cents:number;unitId:string;status:string;page:string};
export function reconciliationSourceReview(d:Data,period:string){
 const rows:ReconciliationSourceRow[]=[],ledger=native(d),add=(row:ReconciliationSourceRow)=>rows.push(row);
 for(const r of d.operations?.tenantEntries??[])if((r.kind==='Receipt'?receiptReportingMonth(r):r.date.slice(0,7))===period){const link=d.accounting?.tenantLedgerLinks?.find(l=>l.entryId===r.id),tenant=d.operations?.tenants?.find(t=>t.id===r.tenantId);add({id:'tenant:'+r.id,date:r.date,reference:r.reference,kind:'Tenant '+r.kind,description:r.description,cents:r.cents,unitId:tenant?.unitId??'',status:link?'Linked to native ledger':'Source recorded · ledger link needed',page:'Tenant ledger posting'});}
 for(const r of d.accounting?.cashPlanning?.manualEntries??[])if(r.date.startsWith(period)&&['Payment','Deposit'].includes(r.kind)){const entry=ledger.entries.find(e=>e.sourceSystem==='OG manual bank'&&e.externalId===r.id);add({id:'manual:'+r.id,date:r.date,reference:r.reference,kind:r.kind,description:r.account+' · '+r.payee,cents:r.cents,unitId:'',status:entry?'Posted to native ledger':'Review bank / ledger posting',page:'Payment posting review'});}
 for(const r of d.accounting?.deposits??[])if(r.date.startsWith(period))add({id:'escrow:'+r.id,date:r.date,reference:r.reference,kind:'Security deposit '+r.kind,description:r.reason,cents:r.cents,unitId:r.unitId,status:r.approved?'Reviewed escrow source · verify ledger link':'Pending source review',page:'Escrow'});
 for(const r of d.accounting?.settlements??[])if(r.period===period)add({id:'settlement:'+r.id,date:r.date,reference:r.reference,kind:'Owner settlement',description:d.owners.find(o=>o.id===r.ownerId)?.name??'Owner',cents:r.cash,unitId:'',status:'External payment recorded · verify ledger link',page:'Prepare distributions'});
 for(const r of d.ownerRun?.checks??[])if(r.period===period){const e=r.evidence,voided=d.ownerRun?.voids.some(v=>v.evidence.companyId===e.companyId&&v.evidence.transactionId===e.transactionId);add({id:'owner-check:'+r.id,date:e.date,reference:e.checkNumber,kind:'Owner check',description:d.owners.find(o=>o.id===e.ownerId)?.name??'Owner',cents:e.cents,unitId:'',status:voided?'Voided · preserve history':e.status+' external evidence · verify ledger link',page:'Prepare distributions'});}
 for(const r of d.accounting?.payablesLedger?.documents??[])if(r.date.startsWith(period))add({id:'payable:'+r.id,date:r.date,reference:r.reference,kind:'Vendor '+r.kind,description:r.payee,cents:r.lines.reduce((s,l)=>s+l.cents,0),unitId:r.lines.length===1?r.lines[0].unitId:'',status:'Payable source · review approval / ledger',page:'Bills & credits'});
 const nativeRows=ledger.entries.filter(e=>e.date.startsWith(period));
 const bookOpenings=ledger.books.filter(b=>b.openingDate<period+'-01').flatMap(b=>(bookChart(d,b.id)?.accounts??[]).filter(a=>['bank','credit card'].includes(a.type.toLowerCase())).map(a=>({id:b.id+':'+a.key,company:b.company,account:a.name,date:b.openingDate,source:b.source,cents:b.opening.filter(l=>l.accountKey===a.key).reduce((s,l)=>s+l.debit-l.credit,0)*(a.type.toLowerCase()==='credit card'?-1:1)||0})));
 const statements=latest(d,period),verified=statements.filter(s=>s.openingConfirmed);
 const openings=(d.accounting?.cashPlanning?.manualEntries??[]).filter(e=>e.kind==='Opening posted balance'&&e.date<=period+'-01');
 return {rows:rows.sort((a,b)=>a.date.localeCompare(b.date)||a.id.localeCompare(b.id)),nativeRows,openings,bookOpenings,ownerOpening:statements.length&&verified.length===statements.length?verified.reduce((s,r)=>s+r.opening,0):null,verifiedOwners:verified.length,ownerStatements:statements.length};
}
import {tenantSourceReferences} from './receivables-ledger';
import {native,bookChart,statementMovements,ledgerMovements,validateNativeAccounting,type LedgerEntry} from './native-accounting';
function sourceReferences(d:Data,e:LedgerEntry){const link=d.accounting?.tenantLedgerLinks?.find(l=>l.ledgerEntryId===e.id);return [e.reference.trim().toLowerCase(),...(link?tenantSourceReferences(d,link.entryId):[])];}

export function statementMatchCandidates(d:Data,input:{bookId:string;bankKey:string;reference:string;cents:number;through:string;excluded:string[]}){
 const cleared=new Set(native(d).reconciliations.filter(r=>r.bookId===input.bookId&&r.accountKey===input.bankKey).flatMap(r=>r.rows.flatMap(row=>row.entryIds)));
 const candidates=statementMovements(d,input.bookId,input.bankKey).filter(x=>x.entry.date<=input.through&&x.cents===input.cents&&!cleared.has(x.entry.id)&&!input.excluded.includes(x.entry.id));
 const exact=candidates.filter(x=>sourceReferences(d,x.entry).includes(input.reference.trim().toLowerCase()));
 return exact.length?exact:candidates;
}

export function manualPostingStatus(d:Data,sourceId:string,bookId:string,bankKey:string,through:string){
 const source=d.accounting?.cashPlanning?.manualEntries?.find(e=>e.id===sourceId);
 if(!source||!['Payment','Deposit'].includes(source.kind))return {status:'Unavailable',entry:undefined as LedgerEntry|undefined,candidates:[] as LedgerEntry[]};
 const candidates=native(d).entries.filter(e=>e.bookId===bookId&&sourceReferences(d,e).includes(source.reference.trim().toLowerCase())&&e.lines.some(l=>l.accountKey===bankKey));
 const entry=native(d).entries.find(e=>e.bookId===bookId&&e.sourceSystem==='OG manual bank'&&e.externalId===source.id);
 const cleared=entry&&native(d).reconciliations.some(r=>r.bookId===bookId&&r.accountKey===bankKey&&r.end<=through&&r.rows.some(row=>row.entryIds.includes(entry.id)));
 const reversed=entry&&native(d).entries.some(e=>e.reverses===entry.id&&e.date<=through);
 return {status:entry?(entry.date>through?'Posted after selected period':reversed?'Reversed':cleared?'Cleared':'Outstanding'):candidates.length?'Existing ledger reference — review':'Needs ledger posting',entry,candidates};
}

export function postManualBankActivity(d:Data,input:{sourceId:string;bookId:string;bankKey:string;counterKey:string;expectedAccount:string;reviewer:string;verified:boolean}){
 if(!input.verified||!input.reviewer.trim())throw Error('Verify the source, company, bank and existing QBO/OG entries before posting');
 const source=d.accounting?.cashPlanning?.manualEntries?.find(e=>e.id===input.sourceId),book=native(d).books.find(b=>b.id===input.bookId),chart=book?bookChart(d,book.id):undefined;
 if(!source||!['Payment','Deposit'].includes(source.kind)||!book||source.account!==input.expectedAccount)throw Error('Choose the matching manual activity, company books and source bank');
 if(source.date<=book.openingDate)throw Error('This activity is already within the opening-book cutoff; review opening records instead');
 const bank=chart?.accounts.find(a=>a.key===input.bankKey&&a.active&&a.type.toLowerCase()==='bank'),counter=chart?.accounts.find(a=>a.key===input.counterKey&&a.active);
 if(!bank||!counter||bank.key===counter.key||counter.type.toLowerCase()==='bank')throw Error('Choose an active bank and a separate non-bank counter account; use the transfer workflow for transfers');
 const role=source.account==='Escrow'?'Owner escrow':source.account==='Owners pool operating'?'Owner pool operating':'DLA operating';
 const mapping=d.glControls?.mappings.filter(m=>m.chartId===book.chartId&&m.role===role&&m.from<=source.date.slice(0,7)).at(-1);
 if(!mapping||mapping.accountKey!==bank.key)throw Error('Review the dated source-bank GL mapping before posting to this bank');
 const status=manualPostingStatus(d,source.id,book.id,bank.key,'9999-12-31');
 if(status.entry||status.candidates.length||native(d).entries.some(e=>e.bookId===book.id&&e.sourceSystem==='OG manual bank'&&e.externalId===source.id))throw Error('Activity or bank reference is already posted; review the existing ledger entry');
 const next=structuredClone(d),ledger=next.accounting!.native!,payment=source.kind==='Payment',memo=source.payee+' · '+source.kind+' · '+source.account;
 ledger.entries.push({id:crypto.randomUUID(),bookId:book.id,date:source.date,reference:source.reference,memo,reviewer:input.reviewer.trim(),created:new Date().toISOString(),reverses:'',recurringId:'',sourceSystem:'OG manual bank',externalId:source.id,lines:[{accountKey:counter.key,debit:payment?source.cents:0,credit:payment?0:source.cents,unitId:'',memo},{accountKey:bank.key,debit:payment?0:source.cents,credit:payment?source.cents:0,unitId:'',memo}]});
 validateNativeAccounting(next,d);
 validateManualBankPostings(next,d);
 return next;
}

export function validateManualBankPostings(d:Data,old?:Data){
 for(const entry of native(d).entries.filter(e=>e.sourceSystem==='OG manual bank')){
  const source=d.accounting?.cashPlanning?.manualEntries?.find(e=>e.id===entry.externalId);
  const book=native(d).books.find(b=>b.id===entry.bookId),chart=book?bookChart(d,book.id):undefined;
  const banks=entry.lines.filter(l=>chart?.accounts.find(a=>a.key===l.accountKey)?.type.toLowerCase()==='bank');
  if(!source||!['Payment','Deposit'].includes(source.kind)||!book||source.date<=book.openingDate||entry.date!==source.date||entry.reference!==source.reference||entry.reverses||entry.recurringId||entry.lines.length!==2||banks.length!==1||banks[0].debit-banks[0].credit!==(source.kind==='Payment'?-source.cents:source.cents))throw Error('Manual bank posting must preserve the verified source date, reference and amount');
  if(!old?.accounting?.native?.entries.some(e=>e.id===entry.id)){
   if(native(d).entries.some(e=>e.id!==entry.id&&e.bookId===book.id&&e.lines.some(l=>l.accountKey===banks[0].accountKey)&&sourceReferences(d,e).includes(source.reference.trim().toLowerCase())))throw Error('Bank activity is already posted through another source; link the original ledger entry');
   const role=source.account==='Escrow'?'Owner escrow':source.account==='Owners pool operating'?'Owner pool operating':'DLA operating';
   const mapping=d.glControls?.mappings.filter(m=>m.chartId===book.chartId&&m.role===role&&m.from<=source.date.slice(0,7)).at(-1);
   if(!mapping||mapping.accountKey!==banks[0].accountKey)throw Error('Review the dated source-bank GL mapping before posting to this bank');
  }
 }
}
