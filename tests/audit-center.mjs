import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {stripTypeScriptTypes} from 'node:module';
const dir=new URL('./.support-runtime/',import.meta.url);await mkdir(dir,{recursive:true});await writeFile(new URL('audit-center.mjs',dir),stripTypeScriptTypes(await readFile(new URL('../lib/audit-center.ts',import.meta.url),'utf8')));const {captureChanges,auditAccess,auditCsv}=await import(new URL('audit-center.mjs',dir));
const old={audit:[{id:'old',at:'2026-10-01',action:'Seed',detail:'Retained'}],operations:{tenantEntries:[{id:'receipt-1',cents:2200000,reference:'original'}],workOrders:[]},workflow:{states:[]}};
const next=structuredClone(old);next.operations.tenantEntries=[];next.operations.workOrders.push({id:'work-1',title:'Repair',password:'private'});next.workflow.states.push({id:'state-1',action:'Voided',recordId:'charge-1'});
const actor={id:'signed-user',name:'Synthetic staff',role:'Management'};const events=captureChanges(old,next,actor,'operation-1',7,'2026-10-09T18:00:00Z');assert.equal(events.length,3);const deleted=events.find(e=>e.kind==='Deleted');assert.equal(deleted.before.cents,2200000);assert.equal(deleted.after,null);assert.equal(deleted.actorId,actor.id);assert.equal(deleted.revision,7);assert.equal(events.find(e=>e.entity==='operations.workOrders').after.password,'[redacted]');assert.ok(events.some(e=>e.kind==='Voided'));assert.deepEqual(next.audit.at(-1),old.audit[0]);assert.equal(captureChanges(next,structuredClone(next),actor,'repeat',8).length,0);
const reordered=structuredClone(next);reordered.operations.workOrders.reverse();assert.equal(captureChanges(next,reordered,actor,'order',8).length,0);
for(const r of ['Maintenance','Analyst / Agent','Accounting Clerk','Accountant','External CPA'])assert.equal(auditAccess(r),false);assert.equal(auditAccess('Management'),true);assert.equal(auditAccess('Global Admin'),true);assert.ok(auditCsv([{...deleted,detail:'=DANGEROUS()'}]).includes("'=DANGEROUS()"));
const route=await readFile(new URL('../app/api/audit/route.ts',import.meta.url),'utf8');assert.ok(route.includes("eq('workspace_id',u.userId)"));assert.ok(route.includes("['Global Admin','Management']"));assert.ok(route.includes('sameOrigin(request)'));assert.match(route,/old.operationApplied/);
console.log('Audit record changes, actor identity, private workspace scoping, no-op saves, immutable history, roles and CSV safety passed');

// Exercise handlers with authenticated workspace mocks, without production records.
let signed={userId:'company-a',authId:'staff-a',displayName:'Synthetic reviewer',role:'Management'};
let loaded=[],saved=[],scope='',snapshot={revision:4,data:{audit:[{id:'event-a',action:'Deleted',detail:'Synthetic record'}]}};
const query={select(){return this;},eq(k,v){scope=v;return this;},order(){return this;},async limit(){return {data:[],error:null};}};
const injected={getChatGPTUser:async()=>signed,access:(u,roles)=>{if(!u||!roles.includes(u.role))throw Error('Access denied');return u;},sameOrigin:r=>{if(r.headers.get('origin')!=='https://og.example')throw Error('Invalid origin');},body:r=>r.json(),load:async workspace=>{loaded.push(workspace);return structuredClone(snapshot);},save:async(...args)=>saved.push(args),admin:()=>({from:()=>query})};
const source=stripTypeScriptTypes(route).replace(/^import .*;$/gm,'').replace(/export async function/g,'async function');
const handlers=new Function(...Object.keys(injected),source+'; return {GET,POST};')(...Object.values(injected));
assert.equal((await handlers.GET()).status,200);assert.equal(scope,'company-a');assert.deepEqual(loaded,['company-a']);
signed={...signed,role:'Accountant'};loaded=[];assert.equal((await handlers.GET()).status,403);assert.equal(loaded.length,0);
signed={...signed,role:'Management'};
const post=(eventId='event-a',origin='https://og.example',revision=4)=>new Request('https://og.example/api/audit',{method:'POST',headers:{origin,'Content-Type':'application/json'},body:JSON.stringify({eventId,note:'Reviewed',operation:'test-op',revision})});
assert.equal((await handlers.POST(post('other-client-event'))).status,400);assert.equal(saved.length,0);
assert.equal((await handlers.POST(post('event-a','https://other.example'))).status,400);assert.equal(saved.length,0);
assert.equal((await handlers.POST(post('event-a','https://og.example',3))).status,409);assert.equal(saved.length,0);
assert.equal((await handlers.POST(post())).status,200);assert.equal(saved[0][0],'company-a');assert.equal(saved[0][3].audit[0].actorId,'staff-a');assert.equal(saved[0][3].audit[0].relatedEventId,'event-a');assert.deepEqual(saved[0][3].audit.at(-1),snapshot.data.audit[0]);
snapshot.operationApplied=true;assert.equal((await handlers.POST(post())).status,200);assert.equal(saved.length,1);
console.log('Audit API company isolation, role denial, origin protection, note attribution, conflicts and idempotency passed');
