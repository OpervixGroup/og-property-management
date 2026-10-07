import {type Data,type Statement,latest,totals} from './pool';
import {contributionTotal,ownerOutstanding} from './month-close';

export function selectedOwnerStatements(d:Data,ownerId:string,period:string,unitIds:string[]):Statement[]{
 if(!unitIds.length)throw Error('Select at least one unit.');
 const ids=new Set(unitIds),current=latest(d,period);
 const selected=current.filter(s=>s.ownerId===ownerId&&ids.has(s.unitId));
 if(selected.length!==ids.size)throw Error('One or more selected units have no current statement for this owner and month.');
 return selected.sort((a,b)=>(d.units.find(u=>u.id===a.unitId)?.number??a.unitId).localeCompare(d.units.find(u=>u.id===b.unitId)?.number??b.unitId,undefined,{numeric:true}));
}
export function ownerReportTotals(d:Data,statements:Statement[]){
 const sum=(fn:(s:Statement)=>number)=>statements.reduce((n,s)=>n+fn(s),0);
 return {allocated:sum(s=>s.allocated),deductions:sum(s=>totals(s).deductions),credits:sum(s=>(s.credits??[]).reduce((n,c)=>n+c.cents,0)),opening:sum(s=>s.opening),adjustments:sum(s=>s.adjustments),available:sum(s=>totals(s).available),cash:sum(s=>s.cashPaid??s.paidAmount),offsetApplied:sum(s=>s.offsetPaid??0),offsetReceived:sum(s=>s.offsetReceived??0),contributions:sum(s=>contributionTotal(d,s)),closing:sum(s=>ownerOutstanding(d,s))};
}
