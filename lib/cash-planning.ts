import type {Data} from './pool';
import {canonicalRecord} from './workflow-controls';
export const cashAccounts=['Owners pool operating','DLA operating','Escrow'] as const;
export type CashAccount=typeof cashAccounts[number];
export type BankSnapshot={id:string;account:CashAccount;period:string;date:string;balance:number;outstanding:number;reserved:number;cushion:number;reference:string;reviewer:string;created:string};
export type PlannedCheck={id:string;account:CashAccount;period:string;payee:string;cents:number;reference:string;created:string};
export type PlanCancellation={id:string;checkId:string;reason:string;created:string};
export type ManualBankEntry={id:string;account:CashAccount;date:string;kind:'Opening posted balance'|'Deposit'|'Payment'|'Bank balance';cents:number;payee:string;reference:string;created:string};
export type CashPlanning={snapshots:BankSnapshot[];checks:PlannedCheck[];cancellations:PlanCancellation[];manualEntries?:ManualBankEntry[]};
export function manualBankBalance(p:CashPlanning|undefined,account:CashAccount){
 const rows=(p?.manualEntries??[]).filter(e=>e.account===account),opening=rows.find(e=>e.kind==='Opening posted balance'),bank=rows.filter(e=>e.kind==='Bank balance').at(-1);
 const posted=opening?opening.cents+rows.reduce((n,e)=>n+(e.kind==='Deposit'?e.cents:e.kind==='Payment'?-e.cents:0),0):null;
 return {rows,opening,bank,posted,difference:bank&&posted!==null?bank.cents-posted:null};
}
// Approved October 2026 opening batch. Reporting month changes only;
// actual deposit dates and tenant charge applications remain unchanged.
const octoberOpeningReferences=new Set(['205-20260930-164','412-20260930-101','414-20260930-19-868042838','602-20260930-19-847977108/19-847977107','715-20260930-1018','1504-20260930-1415','1701-20260930-19-868364005','2315-20260930-193','2415-20260930-60815794']);
export function receiptReportingMonth(receipt:{date:string;reference:string}){return receipt.date==='2026-09-30'&&octoberOpeningReferences.has(receipt.reference)?'2026-10':receipt.date.slice(0,7);}
export function recordedCash(data:Data,account:CashAccount,period:string){
 const entries=data.operations?.tenantEntries??[],receipts=entries.filter(e=>e.kind==='Receipt'&&receiptReportingMonth(e)===period),datedReceipts=entries.filter(e=>e.kind==='Receipt'&&e.date.startsWith(period)),deposits=(data.accounting?.deposits??[]).filter(e=>e.approved&&e.date<=period+'-31');
 const held=deposits.reduce((n,e)=>n+(e.kind==='Received'?e.cents:-e.cents),0);
 const rentApplied=(data.accounting?.applications??[]).reduce((n,a)=>{const receipt=entries.find(e=>e.id===a.receiptId),charge=entries.find(e=>e.id===a.chargeId);return n+(receipt?.kind==='Receipt'&&charge?.date.startsWith(period)&&(charge.category??a.chargeCategory)==='Rent'?a.cents:0);},0);
 return {datedReceipts:account==='DLA operating'?datedReceipts.reduce((n,e)=>n+e.cents,0):0,receipts:account==='DLA operating'?receipts.reduce((n,e)=>n+e.cents,0):account==='Escrow'?deposits.filter(e=>e.kind==='Received'&&e.date.startsWith(period)).reduce((n,e)=>n+e.cents,0):0,held:account==='Escrow'?held:null,rentApplied:account==='DLA operating'?rentApplied:0,rows:account==='DLA operating'?receipts:[],escrowRows:account==='Escrow'?deposits:[]};
}
export function cashCapacity(planning:CashPlanning|undefined,account:CashAccount,period:string){
 const snapshot=planning?.snapshots.filter(s=>s.account===account&&s.period===period).at(-1),cancelled=new Set(planning?.cancellations.map(c=>c.checkId)),checks=(planning?.checks??[]).filter(c=>c.account===account&&c.period===period&&!cancelled.has(c.id));
 const available=snapshot?snapshot.balance-snapshot.outstanding-snapshot.reserved-snapshot.cushion:null;
 let left=available??0;const rows=checks.map(check=>{const covered=available!==null&&left>=check.cents;if(covered)left-=check.cents;return {...check,covered};});
 const planned=checks.reduce((n,c)=>n+c.cents,0);
 return {snapshot,available,checks:rows,planned,remaining:available===null?null:available-planned,fundable:available===null?null:rows.filter(c=>c.covered).length,shortfall:available===null?null:Math.max(0,planned-available)};
}
export function validateCashPlanning(data:Data,old?:Data){
 const p=data.accounting?.cashPlanning,before=old?.accounting?.cashPlanning;if(!p){if(before)throw Error('Preserve bank planning history');return;}
 for(const key of ['snapshots','checks','cancellations'] as const){const rows=p[key];if(!Array.isArray(rows)||rows.length>20000||new Set(rows.map(r=>r.id)).size!==rows.length||rows.some(r=>!r.id))throw Error('Invalid cash planning records');for(const [i,r] of (before?.[key]??[]).entries())if(canonicalRecord(rows[i])!==canonicalRecord(r))throw Error('Bank planning history is immutable');}
 const amount=(n:number,signed=false)=>{if(!Number.isSafeInteger(n)||Math.abs(n)>100000000000||!signed&&n<0)throw Error('Invalid bank planning amount');};
 const period=(s:string)=>{if(!data.periods.some(p=>p.month===s))throw Error('Unknown planning month');};
 const manual=p.manualEntries??[];if(manual.length>20000||new Set(manual.map(e=>e.id)).size!==manual.length)throw Error('Invalid manual bank history');
 for(const [i,e] of (before?.manualEntries??[]).entries())if(canonicalRecord(manual[i])!==canonicalRecord(e))throw Error('Manual bank history is immutable');
 const openings=new Set<string>(),manualRefs=new Set<string>();for(const e of manual){if(!e.id||!cashAccounts.includes(e.account)||!['Opening posted balance','Deposit','Payment','Bank balance'].includes(e.kind)||!e.reference.trim()||!/^\d{4}-\d{2}-\d{2}$/.test(e.date)||Number.isNaN(Date.parse(e.date+'T12:00:00Z'))||new Date(e.date+'T12:00:00Z').toISOString().slice(0,10)!==e.date)throw Error('Complete manual bank record');amount(e.cents,e.kind==='Opening posted balance'||e.kind==='Bank balance');const ref=e.account+':'+e.reference.trim().toLowerCase();if(manualRefs.has(ref))throw Error('Duplicate manual bank reference');manualRefs.add(ref);if(e.kind==='Opening posted balance'){if(openings.has(e.account))throw Error('Posted starting balance already recorded');openings.add(e.account);}if(e.kind==='Deposit'||e.kind==='Payment'){if(!openings.has(e.account)||!e.payee.trim()||e.cents<=0)throw Error('Record starting balance first; enter payee and positive amount');const start=manual.find(x=>x.account===e.account&&x.kind==='Opening posted balance')!;if(e.date<start.date)throw Error('Activity precedes starting balance');}}
 for(const s of p.snapshots){if(!cashAccounts.includes(s.account)||!s.reference.trim()||!s.reviewer.trim()||!/^\d{4}-\d{2}-\d{2}$/.test(s.date)||Number.isNaN(Date.parse(s.date+'T12:00:00Z'))||new Date(s.date+'T12:00:00Z').toISOString().slice(0,10)!==s.date)throw Error('Complete bank balance date, source and reviewer');period(s.period);amount(s.balance,true);[s.outstanding,s.reserved,s.cushion].forEach(n=>amount(n));}
 const refs=new Set<string>();for(const c of p.checks){period(c.period);amount(c.cents);const ref=c.account+':'+c.reference.trim().toLowerCase();if(!cashAccounts.includes(c.account)||!c.payee.trim()||!c.reference.trim()||c.cents<=0||refs.has(ref))throw Error('Planned check requires payee, positive amount and unique reference');refs.add(ref);}
 const cancelled=new Set<string>();for(const c of p.cancellations){if(!p.checks.some(x=>x.id===c.checkId)||cancelled.has(c.checkId)||!c.reason.trim())throw Error('Invalid planned check cancellation');cancelled.add(c.checkId);}
}
