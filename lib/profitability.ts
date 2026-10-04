import type {Data} from './pool';
import {latest,isParticipating,allocationNeedsReview,ownerAt,totals} from './pool';
import {officeRent,incomeRows} from './accounting-model';

export type RentBasis='Contract rent'|'Actual collected';
export function monthlyProfitability(data:Data,period:string,poolId:string,basis:RentBasis){
 const units=data.units.filter(u=>u.poolId===poolId&&isParticipating(data,u,period));
 const statements=latest(data,period),setting=data.settings.filter(s=>s.poolId===poolId&&s.period===period).sort((a,b)=>b.version-a.version)[0];
 const allocationUnverified=allocationNeedsReview(data,poolId,period);
 const rows=units.map(u=>{
  const s=statements.find(s=>s.unitId===u.id),tenants=(data.operations?.tenants??[]).filter(t=>t.unitId===u.id&&t.start<=period+'-31'&&(!t.end||t.end>=period+'-01'));
  const source=officeRent(data,u.id,period),contract=tenants.length===1&&tenants[0].rent>0?tenants[0].rent:null;
  const rent=basis==='Contract rent'?contract:source.cents;
  const fee=(gl:string)=>{if(!s)return null;const lines=s.expenses.filter(e=>e.gl===gl&&!e.sharedId);if(lines.length)return lines.reduce((n,e)=>n+e.cents,0);const defaults=gl==='80300'?(u.type===1?setting?.maintenance1:setting?.maintenance2):gl==='80400'?(u.type===1?setting?.management1:setting?.management2):setting?.electricTotal;return defaults===0?0:null;};
  const pool=s?.allocated??null,maintenance=fee('80300'),management=fee('80400'),electricity=setting?.electricConfirmed?fee('81000'):null;
  const values=[rent,pool,maintenance,management,electricity],complete=values.every(v=>v!==null)&&!allocationUnverified;
  const contribution=complete?rent!-pool!-maintenance!-management!-electricity!:null;
  const issues=[rent===null?'Rent missing or ambiguous':'',!s?'Statement missing':'',allocationUnverified?'Pool allocation needs review':'',maintenance===null||management===null?'Standard fee missing':'',electricity===null?'Electricity unverified or missing':'',s?.status==='Pending'?'Draft statement':'',basis==='Contract rent'?'Contract rate requires lease verification':''].filter(Boolean);
  return {unitId:u.id,unit:u.number,tenant:tenants.map(t=>t.firstName+' '+t.lastName).join(' / ')||'Not entered',owner:data.owners.find(o=>o.id===(s?.ownerId??ownerAt(data,u.id,period+'-01')))?.name??'Not entered',rent,pool,maintenance,management,electricity,contribution,issues,ownerNet:s?s.allocated-s.expenses.reduce((n,e)=>n+e.cents,0)+(s.credits??[]).reduce((n,c)=>n+c.cents,0):null,ownerBalance:s?totals(s).available:null,paid:s?.cashPaid??s?.paidAmount??0,status:s?.status??'Missing',contractNotes:tenants.map(t=>t.notes).join(' / ')};
 });
 const poolUnits=new Set(units.map(u=>u.number));
 const sources=incomeRows(data,period).filter(r=>poolUnits.has(r.unit)||(data.pools.length===1&&r.unit==='Bulk inventory'));
 // Standard fee lines are already deducted in the requested waterfall.
 const expenses=sources.filter(r=>r.confirmed&&r.treatment==='Expense'&&!['80300','80400','81000'].includes(r.gl));
 const operatingExpenses=expenses.reduce((n,r)=>n+r.cents,0);
 const sum=(key:'rent'|'pool'|'maintenance'|'management'|'electricity'|'contribution'|'ownerNet'|'ownerBalance'|'paid')=>rows.reduce((n,r)=>n+(r[key]??0),0);
 const missing=rows.filter(r=>r.contribution===null).length;
 return {period,poolId,basis,rows,setting,allocationUnverified,expenses,operatingExpenses,unclassified:sources.filter(r=>!r.confirmed).length,totals:{rent:sum('rent'),pool:sum('pool'),maintenance:sum('maintenance'),management:sum('management'),electricity:sum('electricity'),contribution:sum('contribution'),ownerNet:sum('ownerNet'),ownerBalance:sum('ownerBalance'),paid:sum('paid')},missing,complete:rows.length>0&&missing===0,net:rows.length>0&&missing===0?sum('contribution')-operatingExpenses:null};
}
