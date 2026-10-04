import {type Data,latest,isParticipating,allocationNeedsReview,audit} from './pool';
import {officeRent} from './accounting-model';
import {monthlyRentReview} from './fee-summary';
export type ClearingEvent={id:string;period:string;kind:'Closed'|'Reopened';opening:0;closing:number;recordedRent:number;assigned:number;fingerprint:string;reviewer:string;reason:string;created:string};
export function clearingState(d:Data,period:string){return [...(d.clearingEvents??[])].reverse().find(e=>e.period===period);}
export function clearingReview(d:Data,period:string){
 const statements=latest(d,period),units=d.units.filter(u=>!u.addedMonth||u.addedMonth<=period),active=units.filter(u=>isParticipating(d,u,period));
 const review=monthlyRentReview(statements,units.map(u=>({...officeRent(d,u.id,period),required:active.some(a=>a.id===u.id)})));
 const entries=d.operations?.tenantEntries??[],apps=d.accounting?.applications??[];
 const monthReceipts=entries.filter(e=>e.kind==='Receipt'&&e.date.startsWith(period));
 const unmatched=monthReceipts.reduce((n,r)=>n+Math.max(0,r.cents-apps.filter(a=>a.receiptId===r.id).reduce((sum,a)=>sum+a.cents,0)),0);
 const priorCharges=entries.filter(e=>e.kind==='Charge'&&e.date.slice(0,7)<period&&(e.category==='Rent'||apps.some(a=>a.chargeId===e.id&&a.chargeCategory==='Rent')));
 const unpaidRent=priorCharges.reduce((n,c)=>n+Math.max(0,c.cents-apps.filter(a=>a.chargeId===c.id&&entries.some(r=>r.id===a.receiptId&&r.date.slice(0,7)<=period)).reduce((sum,a)=>sum+a.cents,0)),0);
 const blockers:string[]=[];
 if(!d.periods.some(p=>p.month===period))blockers.push('Open the accounting month first.');
 if(review.difference!==0)blockers.push('Explain and resolve the rent/allocation difference using supported records.');
 if(review.manualCount)blockers.push('Verify manual rent through matched tenant receipts.');
 if(review.missing)blockers.push('Enter verified rent records for every active unit.');
 if(unmatched)blockers.push('Review and apply unmatched tenant receipts.');
 if(active.some(u=>!statements.some(s=>s.unitId===u.id)))blockers.push('Create statements for every active unit.');
 if(statements.some(s=>s.status==='Pending'))blockers.push('Approve and lock the month’s owner statements.');
 for(const poolId of new Set(active.map(u=>u.poolId))){
  if(allocationNeedsReview(d,poolId,period))blockers.push('Verify current pool allocation rules and roster.');
  const setting=d.settings.filter(s=>s.poolId===poolId&&s.period===period).sort((a,b)=>b.version-a.version)[0];
  if(!setting?.electricConfirmed||setting.electricTotal===null)blockers.push('Confirm the monthly electricity bill, including verified zero.');
 }
 // Exclude payment status, cash settlements and opening balances from this income review.
 const fingerprint=JSON.stringify({period,settings:d.settings.filter(s=>s.period===period&&active.some(u=>u.poolId===s.poolId)),units:active.map(u=>u.id).sort(),statements:statements.map(s=>({id:s.id,unitId:s.unitId,ownerId:s.ownerId,version:s.version,allocated:s.allocated,rent:s.rent,expenses:s.expenses,credits:s.credits??[],allocationRunId:s.allocationRunId})).sort((a,b)=>a.id.localeCompare(b.id)),receipts:monthReceipts.map(r=>({id:r.id,date:r.date,cents:r.cents})).sort((a,b)=>a.id.localeCompare(b.id)),applications:apps.filter(a=>monthReceipts.some(r=>r.id===a.receiptId)).map(a=>({...a})).sort((a,b)=>a.id.localeCompare(b.id)),review:{matched:review.matched,manualRent:review.manualRent,missing:review.missing,assigned:review.assigned}});
 return {...review,opening:0 as const,closing:review.difference,unmatched,unpaidRent,blockers:[...new Set(blockers)],fingerprint};
}
export function recordClearing(d:Data,period:string,kind:'Closed'|'Reopened',reviewer:string,reason:string){
 if(!reviewer.trim()||!reason.trim())throw Error('Enter reviewer and review notes.');
 const previous=clearingState(d,period),r=clearingReview(d,period);
 if(kind==='Closed'&&previous?.kind==='Closed')throw Error('Monthly clearing is already closed.');
 if(kind==='Reopened'&&previous?.kind!=='Closed')throw Error('Only a closed review can be reopened.');
 if(kind==='Closed'&&r.blockers.length)throw Error(r.blockers.join(' '));
 const e:ClearingEvent={id:crypto.randomUUID(),period,kind,opening:0,closing:r.closing,recordedRent:r.recordedRent,assigned:r.assigned,fingerprint:r.fingerprint,reviewer:reviewer.trim(),reason:reason.trim(),created:new Date().toISOString()};
 (d.clearingEvents??=[]).push(e);audit(d,'Monthly clearing '+kind.toLowerCase(),period+' / '+e.reviewer+' / '+e.reason+' / opening 0 cents / closing '+e.closing+' cents; no bank funds moved.');return e;
}
export function validateClearing(old:Data,next:Data){
 const events=next.clearingEvents??[],ids=new Set<string>(),states=new Map<string,ClearingEvent>();
 if(!Array.isArray(events))throw Error('Invalid monthly clearing history.');
 for(const prior of old.clearingEvents??[]){const index=(old.clearingEvents??[]).indexOf(prior);if(JSON.stringify(events[index])!==JSON.stringify(prior))throw Error('Preserve original clearing events and order.');}
 for(const e of events){
  if(ids.has(e.id)||!e.id||!next.periods.some(p=>p.month===e.period)||!['Closed','Reopened'].includes(e.kind)||e.opening!==0||!Number.isSafeInteger(e.closing)||!Number.isSafeInteger(e.recordedRent)||!Number.isSafeInteger(e.assigned)||e.closing!==e.recordedRent-e.assigned||!e.reviewer.trim()||!e.reason.trim()||!Number.isFinite(Date.parse(e.created)))throw Error('Invalid monthly clearing record.');
  const previous=states.get(e.period);if(e.kind==='Closed'&&previous?.kind==='Closed'||e.kind==='Reopened'&&previous?.kind!=='Closed')throw Error('Invalid clearing status transition.');
  if(e.kind==='Closed'&&e.closing!==0)throw Error('A closed monthly clearing must end at zero.');
  if(!(old.clearingEvents??[]).some(p=>p.id===e.id)){const r=clearingReview(next,e.period);if(e.fingerprint!==r.fingerprint||e.kind==='Closed'&&r.blockers.length)throw Error('Monthly clearing sources require review.');}
  ids.add(e.id);states.set(e.period,e);
 }
 for(const [period,e] of states)if(e.kind==='Closed'){const r=clearingReview(next,period);if(e.fingerprint!==r.fingerprint||r.blockers.length)throw Error('Reopen monthly clearing before changing its financial sources.');}
}
