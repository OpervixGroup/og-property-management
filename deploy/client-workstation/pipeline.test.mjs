import assert from 'node:assert/strict';
import {reviewPipeline,digest} from './review-pipeline.mjs';
function fixture({wrongSource=false,pausedAt=Infinity,reviewBlocked=false,duplicate=false,readbackMismatch=false,stale=false,at='2026-10-22T15:00:00Z'}={}){
 const calls={checkpoint:0,source:0,chatgpt:0,claude:0,save:0,finish:0,hold:0};
 const task={id:'synthetic-task',clientId:'devonshire-leasing',epoch:1,leaseToken:'synthetic-lease',sourceId:'synthetic-source',folderId:'synthetic-folder',type:'procedure_proposal',scope:'bounded-procedure-excerpts',providers:{openai:true,anthropic:true}};
 let draft,intent;
 const args={task,clock:()=>at,coordinator:{
  checkpoint:async()=>{calls.checkpoint++;return {verifiedAt:stale?'2026-10-22T14:00:00Z':at,clientId:task.clientId,taskId:task.id,epoch:1,leaseToken:task.leaseToken,corporatePaused:false,deskPaused:calls.checkpoint>=pausedAt,rolePaused:false,calendarVerified:true,windowOpen:true,executionOwner:'digitalocean-corporate-v1',leaseUntil:'2026-10-22T23:00:00Z'};},
  prepare:async({artifactDigest})=>{if(duplicate)throw Error('Existing immutable intent; do not repeat');intent={state:'Prepared',clientId:task.clientId,taskId:task.id,folderId:task.folderId,artifactDigest,intentId:'synthetic-intent'};return intent;},
  saved:async()=>{},finish:async()=>{calls.finish++;return {status:'Completed',clientId:task.clientId,taskId:task.id};},hold:async()=>{calls.hold++;}},
  source:{read:async()=>{calls.source++;return {clientId:wrongSource?'devonshire-hoa':task.clientId,sourceId:task.sourceId,version:'synthetic-v1',text:'Synthetic procedure: verify the exact original request before preparing a draft.'};}},
  chatgpt:{draft:async({sourceDigest})=>{calls.chatgpt++;draft={clientId:task.clientId,sourceDigest,text:'PROPOSED LESSON: retain the original request identifier. Requires procedure-owner approval.'};return draft;}},
  claude:{review:async()=>{calls.claude++;return {verdict:reviewBlocked?'Blocked':'Pass',clientId:task.clientId,artifactDigest:digest(draft),evidence:'Synthetic separate-provider fixture receipt',reviewMode:'separate AI assessment'};}},
  storage:{save:async()=>{calls.save++;return {clientId:task.clientId,folderId:task.folderId,artifactDigest:digest(draft),itemId:'synthetic-item'};},readback:async()=>({clientId:task.clientId,folderId:task.folderId,itemId:'synthetic-item',draft:readbackMismatch?{text:'mismatch'}:structuredClone(draft)})}};
 return {args,calls};
}
let f=fixture();assert.equal((await reviewPipeline(f.args)).status,'Completed');assert.equal(f.calls.chatgpt,1);assert.equal(f.calls.claude,1);assert.equal(f.calls.save,1);assert.equal(f.calls.finish,1);
for(const options of [{wrongSource:true},{stale:true},{pausedAt:2},{pausedAt:5},{reviewBlocked:true},{duplicate:true}]){f=fixture(options);await assert.rejects(reviewPipeline(f.args));assert.equal(f.calls.save,0);assert.equal(f.calls.finish,0);assert.equal(f.calls.hold,1);}
f=fixture({readbackMismatch:true});await assert.rejects(reviewPipeline(f.args));assert.equal(f.calls.save,1,'A failed readback must not repeat a save');assert.equal(f.calls.finish,0);assert.equal(f.calls.hold,1);
for(const at of ['2026-10-22T13:29:59Z','2026-10-22T20:30:00Z','2026-10-24T15:00:00Z']){f=fixture({at});await assert.rejects(reviewPipeline(f.args));assert.equal(f.calls.source,0);}
f=fixture({at:'2026-10-22T13:30:00Z'});assert.equal((await reviewPipeline(f.args)).status,'Completed');
f=fixture();f.args.task.providers.anthropic=false;await assert.rejects(reviewPipeline(f.args));assert.equal(f.calls.checkpoint,0);
f=fixture();f.args.claude={};await assert.rejects(reviewPipeline(f.args));assert.equal(f.calls.source,0);
console.log('PASS synthetic candidate protocol: separate model steps, desk/source isolation, fresh pauses, stale controls, blocked review, duplicate intent, no repeated uncertain save, readback acceptance, client-hour boundaries and provider-scope hold. No real models, client records, coordinator or storage were used.');
