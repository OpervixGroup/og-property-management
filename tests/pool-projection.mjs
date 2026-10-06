import assert from 'node:assert/strict';
import {fixture} from './model-loader.mjs';
const d=await fixture();const {poolProjection}=await import('./.mock-runtime/pool-projection.mjs');
const {importRentMaster}=await import('./.mock-runtime/rent-master.mjs');
const s=d.settings.filter(s=>s.period==='2026-10').sort((a,b)=>b.version-a.version)[0];d.settings.filter(x=>x.period===s.period&&x.poolId===s.poolId).forEach(x=>x.electricTotal=18810);
const p=poolProjection(d,'2026-10',s.poolId);assert.equal(p.allocated,9771500);assert.equal(p.management,781720);assert.equal(p.maintenance,358200);assert.equal(p.fees,1139920);assert.equal(p.hoa,2719400);assert.equal(p.owners,5893370);
assert.equal(p.currentCapacity+p.owners+p.hoa+p.electricity,p.rent.expected);
assert.equal(p.nextCapacity+p.owners+p.hoa+p.electricity,p.next.expected);
d.settings.filter(x=>x.period===s.period&&x.poolId===s.poolId).forEach(x=>x.electricTotal=null);assert.equal(poolProjection(d,'2026-10',s.poolId).owners,null);
console.log('PASS pool funding: type counts, fees, HOA, electricity, exact funding identity and unverified bill');




const before=poolProjection(d,'2026-10',s.poolId);const st=d.statements[0];st.expenses.push({id:'repair-source-test',label:'Repair',cents:12300,gl:'81200',recipient:'Contractor',classification:'Unit repair'});const repair=poolProjection(d,'2026-10',s.poolId);assert.equal(repair.otherCosts-before.otherCosts,12300);assert.equal(repair.ownerNet-before.ownerNet,-12300);assert.equal(repair.projectedOffice,before.projectedOffice);st.expenses.find(e=>e.gl==='80400').cents+=1000;const fee=poolProjection(d,'2026-10',s.poolId);assert.equal(fee.statementFees.fees-repair.statementFees.fees,1000);assert.equal(fee.projectedOffice-repair.projectedOffice,1000);assert.equal(fee.ownerNet+fee.statementFees.hoa+fee.statementFees.electricity+fee.otherCosts+fee.projectedOffice,fee.rent.expected);console.log('PASS saved statement sources: repair reduces owner share, fee changes DLA share, waterfall conserves every cent');
