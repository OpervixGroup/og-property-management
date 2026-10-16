import assert from 'node:assert/strict';
import {fixture} from './model-loader.mjs';
await fixture();
const {closeFixture}=await import('./close-fixture.mjs');
const {openFollowingMonth,closeState,validateClose,recordMonthClose}=await import('./.mock-runtime/month-close.mjs');
const {latest,validate,draftFor}=await import('./.mock-runtime/pool.mjs');
const {recordClearing}=await import('./.mock-runtime/monthly-clearing.mjs');
let count=0;
function check(name,fn){fn();count++;console.log('PASS '+name);}
check('Opening a draft next month preserves the open source and all tenant records',()=>{
 const d=closeFixture(),before=structuredClone(d),prior=structuredClone(latest(d,'2026-10'));
 openFollowingMonth(d,'2026-10',{draft:true});validate(before,d);
 assert.equal(closeState(d,'2026-10'),undefined);
 assert.deepEqual(latest(d,'2026-10'),prior);assert.deepEqual(d.operations.tenantEntries,before.operations.tenantEntries);
 const s=latest(d,'2026-11')[0];assert.equal(s.status,'Pending');assert.equal(s.openingConfirmed,false);assert.equal(s.openingSourcePeriod,'2026-10');assert.equal(s.allocated,0);
 assert.equal(d.settings.at(-1).electricTotal,null);assert.equal(d.settings.at(-1).electricConfirmed,false);
 assert.equal(d.settings.at(-1).rent1,before.settings.at(-1).rent1);
});
check('Normal opening still requires close and draft opening cannot duplicate a month',()=>{
 const d=closeFixture();assert.throws(()=>openFollowingMonth(d,'2026-10'),/Close/);
 openFollowingMonth(d,'2026-10',{draft:true});assert.throws(()=>openFollowingMonth(d,'2026-10',{draft:true}),/already/);
 assert.throws(()=>openFollowingMonth(closeFixture(),'invalid',{draft:true}),/existing source/);
});
check('An open source blocks confirming or approving the provisional opening',()=>{
 const d=closeFixture();openFollowingMonth(d,'2026-10',{draft:true});
 for(const edit of [s=>s.openingConfirmed=true,s=>s.status='Approved']){
  const n=structuredClone(d);edit(latest(n,'2026-11')[0]);assert.throws(()=>validateClose(d,n),/Close the prior month/);
 }
});
check('Source provenance cannot be removed or dropped by a statement revision',()=>{
 const d=closeFixture();openFollowingMonth(d,'2026-10',{draft:true});
 const n=structuredClone(d);delete latest(n,'2026-11')[0].openingSourcePeriod;assert.throws(()=>validateClose(d,n),/Preserve/);
 const setting=d.settings.find(s=>s.period==='2026-11'),revised=draftFor(d,d.units[0],setting);
 assert.equal(revised.openingSourcePeriod,'2026-10');
 const copy=structuredClone(d),tampered={...revised,id:'synthetic-revision'};delete tampered.openingSourcePeriod;copy.statements.push(tampered);
 assert.throws(()=>validateClose(d,copy),/revised statements/);
});
check('After source close the opening must match its final verified balance',()=>{
 const d=closeFixture();openFollowingMonth(d,'2026-10',{draft:true});
 const prior=latest(d,'2026-10')[0];Object.assign(prior,{status:'Paid',paidAmount:70000,paidDate:'2026-10-04',paymentRef:'SYNTHETIC-CHECK'});
 recordClearing(d,'2026-10','Closed','QA','Synthetic reconciliation');
 recordMonthClose(d,'2026-10','Closed','QA','Synthetic close','SYNTHETIC-BANK','SYNTHETIC-ESCROW');
 const n=structuredClone(d),s=latest(n,'2026-11')[0];s.openingConfirmed=true;
 assert.throws(()=>validateClose(d,n),/opening balance against/);s.opening=0;validateClose(d,n);
});
console.log(count+' draft-month scenarios passed');
