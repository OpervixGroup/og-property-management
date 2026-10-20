import assert from'node:assert/strict';
import{internalFunctions,executorRoles,supportedTask}from'../lib/department-functions.mjs';
import{departmentReadiness}from'../lib/department-readiness.mjs';
const now='2026-10-20T23:00:00Z';
const state={control:{paused:false,epoch:0,roles:{}},events:[],tasks:{
 f:{plan:{id:'f',agentId:'cfo',effects:{financialWrite:true},sources:['synthetic client books']},status:'Queued'},
 s:{plan:{id:'s',agentId:'research',sources:['https://synthetic.example','https://synthetic.example'],acceptance:'Verify actual need'},status:'Queued'},
 c:{plan:{id:'c',agentId:'support',deadline:'2026-10-19T00:00:00Z'},status:'Queued'},
 d:{plan:{id:'d',agentId:'developer'},status:'Awaiting audit'}
}};
const run=internalFunctions({read:async()=>state,clock:()=>now}),context={checkpoint:async()=>{}};
const output=async(key,role)=>run({plan:{id:'self',handlerKey:key,agentId:role}},context);
let a=(await output('finance-source-boundary-v1','cfo')).artifact;
assert.equal(a.corporateRevenue.value,null);assert.match(a.items[0].nextAction,/Hold/);
a=(await output('sales-evidence-inventory-v1','research')).artifact;
assert.equal(a.sourceReferences.length,1);assert.equal(a.qualifiedBuyers,null);assert.equal(a.revenue,null);
a=(await output('client-delivery-exceptions-v1','support')).artifact;
assert.equal(a.items[0].overdue,true);assert.equal(a.allClear,false);
a=(await output('strategy-dependency-map-v1','strategy')).artifact;
assert.equal(a.items.find(t=>t.id==='d').dependency,'Exact attempt/outcome audit');assert.equal(a.financialProgress,null);
assert.equal(executorRoles.length,32);assert.equal(new Set(executorRoles).size,32);
assert.equal(departmentReadiness().filter(d=>d.implemented).length,10);
assert.equal(supportedTask({plan:{handlerKey:'finance-source-boundary-v1',agentId:'sales-vp'}}),false);
await assert.rejects(run({plan:{id:'x',handlerKey:'sales-evidence-inventory-v1',agentId:'research'}},{checkpoint:async()=>{throw Error('CEO pause')}}),/CEO pause/);
assert.deepEqual(state.tasks.f.plan.sources,['synthetic client books']);
console.log('PASS four bounded evidence functions; 32 exact role bindings; ten department groups; unknown finance/sales stay unknown; tenant boundary, overdue detection and pause propagation; synthetic data only.');
