import type {Data} from './pool';
import {expectedUnitRent} from './tenancy';

// Monthly collection progress follows the rent charge month, not the cash deposit month.
export function tenantRentProgress(data:Data,period:string){
 const units=new Set(data.units.map(u=>u.id)),tenants=new Set((data.operations?.tenants??[]).filter(t=>units.has(t.unitId)).map(t=>t.id));
 const entries=new Map((data.operations?.tenantEntries??[]).map(e=>[e.id,e]));
 let applied=0;
 for(const a of data.accounting?.applications??[]){const receipt=entries.get(a.receiptId),charge=entries.get(a.chargeId);if(receipt?.kind==='Receipt'&&charge?.kind==='Charge'&&charge.date.startsWith(period)&&(charge.category??a.chargeCategory)==='Rent'&&receipt.tenantId===charge.tenantId&&tenants.has(charge.tenantId))applied+=a.cents;}
 const expectedRows=data.units.map(u=>expectedUnitRent(data,u,period));
 const expected=expectedRows.reduce((n,r)=>n+(r.cents??0),0),needsReview=expectedRows.filter(r=>r.cents===null).length;
 return {applied,expected,remaining:Math.max(0,expected-applied),percent:expected>0?Math.min(100,applied/expected*100):null,needsReview};
}
