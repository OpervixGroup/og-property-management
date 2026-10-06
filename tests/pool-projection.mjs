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



