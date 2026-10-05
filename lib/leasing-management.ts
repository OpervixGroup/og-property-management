import {type Data,isParticipating} from './pool';
import {expectedUnitRent,monthTenants} from './tenancy';
import {recordState} from './workflow-controls';
export function leasingManagement(data:Data,period:string){
 const entries=new Map((data.operations?.tenantEntries??[]).map(e=>[e.id,e]));
 const rows=data.units.map(unit=>{
  const expected=expectedUnitRent(data,unit,period),tenants=monthTenants(data,unit.id,period),occupancy=data.operations?.occupancy?.find(o=>o.unitId===unit.id&&o.month===period);
  let collected=0,credits=0;
  for(const a of data.accounting?.applications??[]){const receipt=entries.get(a.receiptId),charge=entries.get(a.chargeId);if(charge?.kind!=='Charge'||!charge.date.startsWith(period)||(charge.category??a.chargeCategory)!=='Rent'||receipt?.tenantId!==charge.tenantId||!data.operations?.tenants?.some(t=>t.id===charge.tenantId&&t.unitId===unit.id))continue;if(receipt.kind==='Receipt')collected+=a.cents;else if(receipt.kind==='Credit')credits+=a.cents;}
  const pending=expected.cents===null?null:Math.max(0,expected.cents-collected-credits);
  const payment=expected.cents===null?'Needs review':expected.cents===0?'No rent expected':pending===0?(collected>=expected.cents?'Paid':'Settled with credits'):collected+credits>0?'Partial':'Pending';
  return {unitId:unit.id,number:unit.number,active:isParticipating(data,unit,period),tenant:tenants.map(t=>t.firstName+' '+t.lastName).join(' / ')||'Not recorded',occupancy:occupancy?.status??'Unknown',market:occupancy?.marketingStatus??'Not recorded',listedDate:occupancy?.listedDate??'',expected:expected.cents,collected,credits,pending,payment,review:expected.review};
 });
 const active=rows.filter(r=>r.active),counts={active:active.length,occupied:active.filter(r=>r.occupancy==='Occupied').length,vacant:active.filter(r=>r.occupancy==='Vacant').length,ready:active.filter(r=>r.occupancy==='Make ready').length,unknown:active.filter(r=>r.occupancy==='Unknown').length,market:rows.filter(r=>r.market==='On market').length,paid:rows.filter(r=>r.payment==='Paid').length,partial:rows.filter(r=>r.payment==='Partial').length,pending:rows.filter(r=>r.pending!==null&&r.pending>0).length};
 return {rows,counts,credits:rows.reduce((n,r)=>n+r.credits,0),pending:rows.reduce((n,r)=>n+(r.pending??0),0),prospects:(data.operations?.prospects??[]).filter(p=>recordState(data,'prospects',p.id)==='Active'&&p.stage!=='Closed')};
}
