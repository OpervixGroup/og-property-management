import type {Data} from './pool';

import {expectedUnitRent} from './tenancy';



// Monthly collection progress follows the rent charge month, not the cash deposit month.

export function tenantRentProgress(data:Data,period:string){

 const applied=data.units.reduce((n,u)=>n+unitRentApplications(data,u.id,period).collected,0);

 const expectedRows=data.units.map(u=>expectedUnitRent(data,u,period));

 const pending=expectedRows.reduce((n,r,i)=>{const a=unitRentApplications(data,data.units[i].id,period);return n+(r.cents===null?0:Math.max(0,r.cents-a.collected-a.credits));},0);
 const credits=data.units.reduce((n,u)=>n+unitRentApplications(data,u.id,period).credits,0);
 const expected=expectedRows.reduce((n,r)=>n+(r.cents??0),0),needsReview=expectedRows.filter(r=>r.cents===null).length;

 return {applied,expected,remaining:pending,credits,percent:expected>0?Math.min(100,applied/expected*100):null,needsReview};

}



// A receipt belongs to the rent month of the charge it settles; credits are separate.

export function unitRentApplications(data:Data,unitId:string,period:string){

 const tenants=new Set((data.operations?.tenants??[]).filter(t=>t.unitId===unitId).map(t=>t.id));

 const entries=new Map((data.operations?.tenantEntries??[]).map(e=>[e.id,e]));

 let collected=0,credits=0;

 for(const a of data.accounting?.applications??[]){const receipt=entries.get(a.receiptId),charge=entries.get(a.chargeId);if(charge?.kind!=='Charge'||!charge.date.startsWith(period)||(charge.category??a.chargeCategory)!=='Rent'||receipt?.tenantId!==charge.tenantId||!tenants.has(charge.tenantId))continue;if(receipt.kind==='Receipt')collected+=a.cents;else if(receipt.kind==='Credit')credits+=a.cents;}

 const tracked=[...entries.values()].some(c=>c.kind==='Charge'&&c.date.startsWith(period)&&tenants.has(c.tenantId)&&(c.category==='Rent'||(data.accounting?.applications??[]).some(a=>a.chargeId===c.id&&a.chargeCategory==='Rent')));

 return {collected,credits,tracked};

}

