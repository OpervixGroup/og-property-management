import type {Data} from './pool';
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
