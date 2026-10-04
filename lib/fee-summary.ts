import {poolElectricLine} from './pool';
import type {Statement} from './pool';
// Caller supplies latest statement versions for the selected month.
// These are charges, not cash receipts or confirmed agency revenue.
export function monthlyFeeSummary(statements:Statement[]){
 let management=0,maintenance=0,electricity=0,hoa=0;
 for(const statement of statements)for(const line of statement.expenses){
  if(line.sharedId)continue;
  if(line.gl==='80400')management+=line.cents;
  if(line.gl==='80300')maintenance+=line.cents;
  if(poolElectricLine(line))electricity+=line.cents;
  if(line.gl==='80000')hoa+=line.cents;
 }
 return {management,maintenance,electricity,hoa,fees:management+maintenance,combined:management+maintenance+electricity,drafts:statements.filter(s=>s.status==='Pending').length};
}

export function monthlyRentReview(statements:Statement[],sources:{cents:number|null;source:string;required?:boolean}[]){
 const fees=monthlyFeeSummary(statements),allocated=statements.reduce((n,s)=>n+s.allocated,0);
 const deductions=statements.reduce((n,s)=>n+s.expenses.reduce((a,e)=>a+e.cents,0),0),credits=statements.reduce((n,s)=>n+(s.credits??[]).reduce((a,c)=>a+c.cents,0),0);
 const ownerShare=allocated-deductions+credits,otherCharges=deductions-fees.fees-fees.electricity-fees.hoa-credits;
 const assigned=ownerShare+fees.fees+fees.electricity+fees.hoa+otherCharges;
 const matched=sources.filter(s=>s.source==='Matched rent receipts').reduce((n,s)=>n+(s.cents??0),0);
 const manual=sources.filter(s=>!['Matched rent receipts','Verified vacant zero'].includes(s.source)&&s.cents!==null),manualRent=manual.reduce((n,s)=>n+s.cents!,0);
 return {ownerShare,otherCharges,assigned,matched,manualRent,manualCount:manual.length,missing:sources.filter(s=>s.required&&s.cents===null).length,recordedRent:matched+manualRent,difference:matched+manualRent-assigned};
}
