import type {Data} from './pool';
import {expectedUnitRent} from './tenancy';
import {unitRentApplications} from './rent-progress';
import {canonicalRecord} from './workflow-controls';

export type RentDepositMatch={id:string;depositId:string;receiptIds:string[];reviewer:string;source:string;created:string};
export function rentReview(data:Data,month:string){
 const entries=data.operations?.tenantEntries??[],applications=data.accounting?.applications??[];
 return data.units.map(unit=>{const original=expectedUnitRent(data,unit,month),applied=unitRentApplications(data,unit.id,month),tenants=(data.operations?.tenants??[]).filter(t=>t.unitId===unit.id),ids=new Set(tenants.map(t=>t.id)),charges=entries.filter(e=>ids.has(e.tenantId)&&e.kind==='Charge'&&e.date.startsWith(month)&&(e.category==='Rent'||!e.category&&applications.some(a=>a.chargeId===e.id&&a.chargeCategory==='Rent'))),posted=charges.reduce((s,e)=>s+e.cents,0),fees=entries.filter(e=>ids.has(e.tenantId)&&e.kind==='Charge'&&e.date.startsWith(month)&&e.reference.startsWith('LATE-FEE:')),feeDue=fees.reduce((s,e)=>s+Math.max(0,e.cents-applications.filter(a=>a.chargeId===e.id).reduce((n,a)=>n+a.cents,0)),0),pending=original.cents===null?null:Math.max(0,original.cents-applied.collected-applied.credits);
 return {unit,original,posted,received:applied.collected,credits:applied.credits,pending,feeDue,fees:fees.reduce((s,e)=>s+e.cents,0),variance:original.cents===null?null:posted-original.cents,status:pending===null?'Needs review':pending===0?'Settled':applied.collected+applied.credits>0?'Partial':'Unpaid'};});
}
export function validateRentDepositMatches(old:Data,next:Data){
 const before=old.accounting?.rentDepositMatches??[],rows=next.accounting?.rentDepositMatches??[];
 if(!Array.isArray(rows)||rows.length>20000||new Set(rows.map(r=>r.id)).size!==rows.length||canonicalRecord(rows.slice(0,before.length))!==canonicalRecord(before))throw Error('Preserve rent deposit matching history');
 const used=new Set<string>(),deposits=new Set<string>();
 for(const r of rows){const deposit=next.accounting?.cashPlanning?.manualEntries?.find(e=>e.id===r.depositId&&e.kind==='Deposit'&&e.account==='DLA operating');
 if(!r.id||!r.reviewer?.trim()||!r.source?.trim()||r.source.length>2000||!Number.isFinite(Date.parse(r.created))||!deposit||deposits.has(r.depositId)||!Array.isArray(r.receiptIds)||!r.receiptIds.length)throw Error('Choose a recorded DLA deposit, receipts, statement source and reviewer');deposits.add(r.depositId);
 const historical=before.some(p=>p.id===r.id);
 let total=0;for(const id of r.receiptIds){const receipt=next.operations?.tenantEntries?.find(e=>e.id===id&&e.kind==='Receipt');if(!receipt||used.has(id)||!historical&&receipt.date>deposit.date)throw Error('Receipts must precede the deposit and cannot be matched twice');used.add(id);total+=receipt.cents;}
 if(!historical&&total!==deposit.cents)throw Error('Selected receipts must equal the bank deposit exactly');
 }
}
export function addLateFee(data:Data,tenantId:string,month:string,date:string,amount:number,basis:string,reviewer:string){
 const tenant=data.operations?.tenants?.find(t=>t.id===tenantId),reference='LATE-FEE:'+tenantId+':'+month;
 if(!tenant||!date.startsWith(month)||!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date+'T12:00:00Z'))||new Date(date+'T12:00:00Z').toISOString().slice(0,10)!==date||date<tenant.openingDate||date<tenant.start||tenant.end&&date>tenant.end||!Number.isSafeInteger(amount)||amount<=0||amount>100000000000||!basis.trim()||basis.length>1500||!reviewer.trim())throw Error('Verify tenancy, fee date, positive amount, lease basis and reviewer');
 if(!data.periods.some(p=>p.month===month)||[...(data.closeControls?.events??[])].reverse().find(e=>e.period===month)?.kind==='Closed')throw Error('Choose an open accounting month');
 if(data.operations?.tenantEntries?.some(e=>e.reference===reference))throw Error('A late fee is already recorded for this tenant and month; use the ledger correction workflow');
 const unit=data.units.find(u=>u.id===tenant.unitId),row=unit&&rentReview(data,month).find(r=>r.unit.id===unit.id);
 if(!row?.pending||row.original.tenantId!==tenantId)throw Error('Verify the monthly rent and pending balance before adding a late fee');
 const entry={id:crypto.randomUUID(),tenantId,date,kind:'Charge' as const,category:'Other' as const,cents:amount,reference,description:'Late fee · '+month+' · Basis: '+basis.trim()+' · Reviewed by '+reviewer.trim()};
 (data.operations!.tenantEntries??=[]).push(entry);return entry;
}
