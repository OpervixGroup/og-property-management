import assert from 'node:assert/strict';
import {fixture} from './model-loader.mjs';
const base=await fixture();
const {isParticipating,latest,validate,draftFor,allocationNeedsReview,totals}=await import('./.mock-runtime/pool.mjs');
const {calculatePool,applyPoolReview}=await import('./.mock-runtime/pool-finance.mjs');
const period='2026-10',poolId=base.pools[0].id;
const setting=base.settings.filter(s=>s.poolId===poolId&&s.period===period).sort((a,b)=>b.version-a.version)[0];
Object.assign(setting,{rent1:92345,rent2:114567,electricTotal:18810,electricConfirmed:true,notes:'Synthetic monthly checklist source'});
const active=base.units.filter(u=>u.poolId===poolId&&isParticipating(base,u,period));
base.operations.tenants=[];base.operations.tenantEntries=[];
base.operations.occupancy=active.map(u=>({id:'vac-'+u.id,unitId:u.id,month:period,status:'Vacant',notes:'Synthetic occupancy source'}));
const repairStatement=latest(base,period).find(s=>s.unitId===active[0].id);
repairStatement.expenses.push({id:'synthetic-repair',label:'Actual repair',cents:12345,recipient:'Test vendor',classification:'Owner repair',gl:'81200'});
const inputs={poolId,period,basis:'Reviewed forecast',forecast:null,method:'Monthly type amounts',weight1:1,weight2:1,marketIds:[],bills:[],electricConfirmed:true,source:'Synthetic checklist review',reviewer:'QA'};
let count=0;
function check(name,fn){fn();count++;console.log('PASS '+name);}
check('Monthly type amounts follow settings and conserve exact cents',()=>{
 const c=calculatePool(base,inputs);
 assert.equal(c.blockers.length,0);
 assert.equal(c.total,active.reduce((n,u)=>n+(u.type===1?setting.rent1:setting.rent2),0));
 for(const u of active)assert.equal(c.shares.find(r=>r.unitId===u.id).cents,u.type===1?setting.rent1:setting.rent2);
 assert.equal(c.electric.reduce((n,r)=>n+r.cents,0),setting.electricTotal);
 assert.equal(c.collected,0);assert.equal(c.typeSettingsVersion,setting.version);
});
check('Checklist calculation cannot be mixed with cash, forecast overrides or CPS bills',()=>{
 assert.throws(()=>calculatePool(base,{...inputs,basis:'Collected rent'}),/keep tenant cash/);
 assert.throws(()=>calculatePool(base,{...inputs,forecast:100}),/keep tenant cash/);
 assert.throws(()=>calculatePool(base,{...inputs,bills:[{unitId:active[0].id,cents:1,reference:'Synthetic'}]}),/keep tenant cash/);
 assert.throws(()=>calculatePool(base,{...inputs,marketIds:[active[0].id]}),/keep tenant cash/);
});
check('Checklist rates remain scoped to Devonshire and require source review',()=>{
 assert.throws(()=>calculatePool(base,{...inputs,poolId:'pool2'}),/Devonshire Leasing only/);
 const d=structuredClone(base);d.settings.find(s=>s.id===setting.id).notes='';
 assert.throws(()=>calculatePool(d,inputs),/checklist source/);
 d.settings.find(s=>s.id===setting.id).notes='Synthetic';d.settings.find(s=>s.id===setting.id).rent1=0;
 assert.throws(()=>calculatePool(d,inputs),/positive/);
});
check('Unknown electricity cannot silently become a zero-electric month',()=>{
 const d=structuredClone(base);Object.assign(d.settings.find(s=>s.id===setting.id),{electricTotal:null,electricConfirmed:false});
 assert.ok(calculatePool(d,inputs).blockers.some(b=>b.includes('electricity total')));
 assert.ok(calculatePool(base,{...inputs,electricConfirmed:false}).blockers.length);
});
check('Applying reviewed checklist passes complete financial validation and retains repairs',()=>{
 const d=structuredClone(base);applyPoolReview(d,inputs);validate(base,d);
 assert.equal(d.settings.at(-1).poolMethod,'Monthly type amounts');
 assert.equal(latest(d,period).find(s=>s.id===repairStatement.id).expenses.find(e=>e.id==='synthetic-repair').cents,12345);
 assert.deepEqual(d.operations.tenantEntries,base.operations.tenantEntries);
 const outside=d.units.filter(u=>u.poolId===poolId&&!isParticipating(d,u,period));
 for(const u of outside){const s=latest(d,period).find(s=>s.unitId===u.id);assert.equal(s.allocated,0);assert.equal(s.expenses.filter(e=>e.gl==='81000').reduce((n,e)=>n+e.cents,0),0);}
 const through=d.units.find(u=>u.hoaChargedThrough);const receiving=latest(d,period).find(s=>s.unitId===through.hoaChargedThrough);
 assert.equal(receiving.expenses.filter(e=>e.linkedUnitId===through.id).length,1);
 assert.equal(allocationNeedsReview(d,poolId,period),true);
 const n=structuredClone(d),s=latest(n,period).find(s=>s.unitId===active[0].id);s.status='Approved';s.openingConfirmed=true;
 assert.throws(()=>validate(d,n),/current collected rent/);
});
check('Reviewed checklist never rewrites approved statements',()=>{
 const d=structuredClone(base);latest(d,period)[0].status='Approved';
 const before=structuredClone(d);
 assert.throws(()=>applyPoolReview(d,inputs),/draft/);assert.deepEqual(d,before);
});
check('Carried monthly type settings cannot be replaced by a prior equal-share assumption',()=>{
 const d=structuredClone(base);applyPoolReview(d,inputs);
 const carried={...d.settings.at(-1),id:'synthetic-next-setting',period:'2026-11'};
 d.poolAssumptions=[{id:'synthetic-old-assumption',poolId,targetMonth:'2026-11',status:'Approved',proposed:1}];
 const u=active[0],s=draftFor(d,u,carried);
 assert.equal(s.allocated,u.type===1?setting.rent1:setting.rent2);
 assert.ok(!s.allocationSource.includes('Approved next-month assumption'));
});
console.log(count+' monthly type calculation scenarios passed');
