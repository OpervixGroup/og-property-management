import assert from 'node:assert/strict';
import {fixture} from './model-loader.mjs';
const d=await fixture();
const {tenantRentProgress}=await import('./.mock-runtime/rent-progress.mjs');
d.operations.tenantEntries=[
 {id:'rent',tenantId:'t1',kind:'Charge',category:'Rent',date:'2026-10-01',cents:100000},
 {id:'prepaid',tenantId:'t1',kind:'Receipt',date:'2026-09-30',cents:50000},
 {id:'oct',tenantId:'t1',kind:'Receipt',date:'2026-10-05',cents:40000},
 {id:'credit',tenantId:'t1',kind:'Credit',date:'2026-10-05',cents:10000},
 {id:'other',tenantId:'t1',kind:'Charge',category:'Other',date:'2026-10-01',cents:10000},
 {id:'sept',tenantId:'t1',kind:'Charge',category:'Rent',date:'2026-09-01',cents:10000},
 {id:'unapplied',tenantId:'t1',kind:'Receipt',date:'2026-10-05',cents:99900}
];
d.accounting={applications:[{receiptId:'prepaid',chargeId:'rent',cents:50000},{receiptId:'oct',chargeId:'rent',cents:30000},{receiptId:'credit',chargeId:'rent',cents:10000},{receiptId:'oct',chargeId:'other',cents:5000},{receiptId:'oct',chargeId:'sept',cents:5000}],deposits:[{cents:30000,kind:'Received'}]};
const r=tenantRentProgress(d,'2026-10');
assert.equal(r.applied,80000,'Includes September prepaid October rent; excludes credits, other charges, September rent and unapplied cash');
assert.equal(r.expected,200000);
assert.equal(r.remaining,110000);
assert.equal(r.percent,40);
assert.ok(r.needsReview>0);
assert.equal(tenantRentProgress(d,'2026-09').applied,5000);
const {officeRent}=await import('./.mock-runtime/accounting-model.mjs');
const {leasingManagement}=await import('./.mock-runtime/leasing-management.mjs');
assert.equal(officeRent(d,d.units[0].id,'2026-10').cents,80000,'Pool rent uses the same charge-month receipt basis as leasing');
assert.equal(officeRent(d,d.units[0].id,'2026-09').cents,5000,'Payment of prior rent stays with its charge month');
assert.equal(leasingManagement(d,'2026-10').rows.reduce((n,r)=>n+r.collected,0),r.applied);
assert.equal(leasingManagement(d,'2026-10').rows.find(r=>r.unitId===d.units[0].id).credits,10000,'Credits never become collected cash');
d.operations.tenants=[];d.operations.tenantEntries=[];d.accounting.applications=[];
assert.equal(tenantRentProgress(d,'2026-10').percent,null);
console.log('PASS rent progress: month attribution, exclusions, missing rent and zero denominator');
