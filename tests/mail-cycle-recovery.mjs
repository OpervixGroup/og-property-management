import assert from 'node:assert/strict';
import {recoveryService,reconciledWithoutEffects} from '../lib/mail-cycle-recovery.mjs';
import {privateMailWorkerBridge} from '../lib/private-mail-worker.mjs';
const actor={authId:'synthetic-ceo'},at='2026-10-22T15:00:00Z';
const initial=()=>({control:{executionOwner:'digitalocean-corporate-v1',paused:true,epoch:2,roles:{}},tasks:{},events:[],privateWorker:{intents:{},contexts:{},companyMail:{cases:{},cycles:{'2026-10-22T13:00':{id:'2026-10-22T13:00',runId:'synthetic-original-run',status:'Uncertain',token:'synthetic-token',epoch:1,startedAt:'2026-10-22T13:00:00Z',until:'2026-10-22T13:25:00Z',evidence:'Original failure retained'}}}}});
let s=initial();
const store={transaction:async fn=>{const d=structuredClone(s),r=fn(d);s=d;return structuredClone(r);}};
const service=recoveryService({store,read:async()=>structuredClone(s),verifyCEO:a=>a?.authId===actor.authId,clock:()=>at});
const request=async()=>({cycleId:'2026-10-22T13:00',runId:'synthetic-original-run',snapshotDigest:(await service.preview(actor)).snapshotDigest,evidence:'Synthetic process absence and no-effects review verified',processStopped:true});
await assert.rejects(service.preview(null));
await assert.rejects(service.reconcile(await request(),{authId:'worker'}));
for(const mutate of [
 x=>x.control.paused=false,
 x=>x.control.executionOwner='other-owner',
 x=>x.privateWorker.companyMail.cycles['2026-10-22T13:00'].until='2026-10-22T16:00:00Z',
 x=>x.privateWorker.companyMail.cases.x={outbound:{sent:{state:'Delivered'}}},
 x=>x.privateWorker.intents.x={status:'Prepared'},
 x=>x.tasks.x={plan:{handlerKey:'private-codex-draft-v1'}},
 x=>x.privateWorker.companyMail.cycles['2026-10-22T13:00'].status='Completed'
]){s=initial();const p=await request();mutate(s);await assert.rejects(service.reconcile(p,actor));assert.equal(s.events.length,0);}
s=initial();let p=await request();p.processStopped=false;await assert.rejects(service.reconcile(p,actor));
s=initial();p=await request();p.runId='wrong-run';await assert.rejects(service.reconcile(p,actor));
s=initial();p=await request();s.control.epoch++;await assert.rejects(service.reconcile(p,actor));
// Fresh preview cannot override a real blocking effect.
for(const mutate of [x=>x.privateWorker.companyMail.cases.x={},x=>x.privateWorker.intents.x={},x=>x.control.paused=false,x=>x.tasks.x={plan:{handlerKey:'private-codex-draft-v1'}}]){s=initial();mutate(s);await assert.rejects(service.reconcile(await request(),actor));}
s=initial();const original=structuredClone(s.privateWorker.companyMail.cycles);p=await request();const receipt=await service.reconcile(p,actor);
assert.equal(receipt.disposition,'No effects; original attempt preserved; no business completion');
assert.deepEqual(s.privateWorker.companyMail.cycles,original);
assert.equal(s.events.length,1);assert.equal(reconciledWithoutEffects(s.privateWorker.companyMail,p.cycleId),true);
await assert.rejects(service.reconcile(await request(),actor));
// An unknown commit outcome can be read back without repeating recovery.
assert.equal((await service.preview(actor)).cycles[0].status,'Uncertain');
const bridge=privateMailWorkerBridge({store,read:async()=>structuredClone(s),clock:()=>at});
s.control.paused=false;
const next=await bridge('mailClaimCycle',{tenantId:'opervix-corporate',runId:'synthetic-new-run'});
assert.equal(next.status,'Running');assert.deepEqual(s.privateWorker.companyMail.cycles[p.cycleId],original[p.cycleId]);
await assert.rejects(bridge('mailClaimCycle',{tenantId:'opervix-corporate',runId:'overlap'}));
// Changing the original invalidates its reconciliation receipt.
s.privateWorker.companyMail.cycles[p.cycleId].evidence='Changed';assert.equal(reconciledWithoutEffects(s.privateWorker.companyMail,p.cycleId),false);
console.log('PASS no-effects recovery: CEO boundary, owner/pause/lease gates, no effect override, stale snapshot rejection, immutable original and append-only receipt, no overlap or false completion. Synthetic only.');
