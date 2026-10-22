import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {clientLearningBridge,clientLearningWindow,clientLearningStatus,learningDigest} from '../lib/client-learning.mjs';
import {learningStatusHTTP} from '../lib/client-learning-http.mjs';
import {learningCycle} from '../deploy/client-learning/cycle.mjs';
const at='2026-10-21T15:00:00.000Z',id='devonshire-leasing';
const calendar={timezone:'America/Chicago',state:'TX',tenantId:'synthetic-tenant',identityEvidence:'Synthetic fixture only',holidayCalendarVerified:true,calendarSources:[{kind:'federal',url:'https://www.opm.gov/'},{kind:'state',state:'TX',url:'https://comptroller.texas.gov/'}],calendarValidFrom:'2026-10-21',calendarValidThrough:'2027-08-31',observedHolidays:[{date:'2026-11-26'}]};
function fixture(){return {control:{paused:false,epoch:1,roles:{},executionOwner:'digitalocean-corporate-v1'},clientLearning:{version:1,authorityRef:'ceo-client-procedure-learning-20261021',enabled:true,schedulerVerified:true,runtimeVerified:true,runs:{},clients:Object.fromEntries(['devonshire-leasing','devonshire-hoa'].map(id=>[id,{id,enabled:true,paused:false,rolePaused:false,roleId:id.endsWith('hoa')?'hoa-community-manager':'leasing-property-manager',calendar,sharepoint:{appId:'connector_1e4f6a44acf14e3ca1d96672f8c945bc',linkId:'synthetic',hostname:'devonshirecondos.sharepoint.com',sitePath:id.endsWith('hoa')?'/sites/DevonshireHOA':'/sites/devonshireLeasing',siteId:'site-'+id,driveId:'drive-'+id,reportFolderId:'folder-'+id,reportFolderPath:'Synthetic'},sources:[{id:'approved-source',itemId:'source-'+id}]}]))}};}
function context(){let state=fixture();const store={transaction:async fn=>{const candidate=structuredClone(state),value=fn(candidate);state=candidate;return value;}};const api=clientLearningBridge({store,read:async()=>structuredClone(state),clock:()=>at});return {api,store,get state(){return state;}};}
assert.equal(clientLearningWindow(calendar,at).open,true);
for(const t of ['2026-10-21T13:29:59Z','2026-10-21T20:30:00Z','2026-10-24T15:00:00Z','2026-11-26T16:00:00Z'])assert.equal(clientLearningWindow(calendar,t).open,false,t);
assert.equal(clientLearningWindow({...calendar,calendarValidThrough:'2026-10-20'},at).open,false);
const ctx=context(),run=await ctx.api('learningClaim',{clientId:id,attemptId:randomUUID()}),base={clientId:id,runId:run.runId,token:run.token,epoch:run.epoch,configDigest:run.configDigest};
await assert.rejects(ctx.api('learningClaim',{clientId:id,attemptId:randomUUID()}),/reconciliation/);
await assert.rejects(ctx.api('learningCheckpoint',{...base,clientId:'devonshire-hoa',role:'knowledge'}),/lease/);
ctx.state.control.epoch++;
await assert.rejects(ctx.api('learningCheckpoint',{...base,role:'knowledge'}),/epoch/);
ctx.state.control.epoch--;ctx.state.clientLearning.runs[run.runId].until='invalid';
await assert.rejects(ctx.api('learningPrepare',{...base,sourceDigest:'a'.repeat(64),artifactDigest:'b'.repeat(64),fileName:'bad',reviews:{}}),/lease/);
ctx.state.clientLearning.runs[run.runId].until=run.until;
ctx.state.control.roles.risk={paused:true};await assert.rejects(ctx.api('learningCheckpoint',{...base,role:'knowledge'}),/pause/);delete ctx.state.control.roles.risk;
ctx.state.clientLearning.clients[id].paused=true;
await assert.rejects(ctx.api('learningCheckpoint',{...base,role:'knowledge'}),/held/);
assert.equal(clientLearningStatus(ctx.state,at).clients[id].permitted,false);
const http=learningStatusHTTP({authenticate:async()=>({id:'ceo'}),isCEO:async()=>true,origin:'https://example.test',read:async()=>ctx.state,store:ctx.store,clock:()=>at});
assert.equal((await http.POST(new Request('https://example.test',{method:'POST',headers:{origin:'https://evil.test'},body:JSON.stringify({clientId:id,paused:false,evidence:'Synthetic'})}))).status,403);
const epoch=ctx.state.control.epoch;
assert.equal((await http.POST(new Request('https://example.test',{method:'POST',headers:{origin:'https://example.test'},body:JSON.stringify({clientId:id,paused:false,evidence:'Synthetic CEO resume'})}))).status,200);
assert.equal(ctx.state.control.epoch,epoch+1);
const originsHTTP=learningStatusHTTP({authenticate:async()=>({id:'ceo'}),isCEO:async()=>true,origin:['https://og.opervixgroup.com','https://z64hid4a52.preview.c39.airoapp.ai'],read:async()=>ctx.state,store:ctx.store,clock:()=>at});
for(const origin of ['https://og.opervixgroup.com','https://z64hid4a52.preview.c39.airoapp.ai'])assert.equal((await originsHTTP.POST(new Request(origin+'/api/platform/client-learning',{method:'POST',headers:{origin},body:JSON.stringify({clientId:id,paused:false,evidence:'Synthetic exact approved-origin control'})}))).status,200);
for(const origin of ['https://og.opervixgroup.com.evil.test','https://evil.test','null'])assert.equal((await originsHTTP.POST(new Request('https://og.opervixgroup.com/api/platform/client-learning',{method:'POST',headers:{origin},body:JSON.stringify({clientId:id,paused:true,evidence:'Must be rejected'})}))).status,403);
const denied=learningStatusHTTP({authenticate:async()=>null,isCEO:async()=>false,read:async()=>{throw Error('must not read');}});
assert.equal((await denied.GET(new Request('https://example.test'))).status,403);
async function cycleTest({uncertain=false,badQuote=false}={}){
 const c=context(),memory=new Map(),uploads=[],models=[],quote='Synthetic procedure: check the source before proposing a change.';
 const filesFor=()=>({dir:'/synthetic-private',write(n,t){if(memory.has(n))assert.equal(memory.get(n),t);memory.set(n,t);return '/synthetic-private/'+n;},read:n=>memory.get(n)});
 const response=x=>({structuredContent:x});
 const app=async({action,args,authorize})=>{assert.equal(await authorize(),true);const sp=c.state.clientLearning.clients[id].sharepoint;
  if(action==='get_site')return response({id:sp.siteId});
  if(action==='get_drive_item')return response({id:args.item_id,folder:args.item_id===sp.reportFolderId?{}:undefined,parentReference:{driveId:sp.driveId,id:sp.reportFolderId}});
  if(action==='fetch')return response({content:args.url.endsWith('saved-file')?memory.get('lesson.txt'):quote});
  if(action==='upload_file_to_folder'){uploads.push(args);if(uncertain)throw Error('Unknown remote outcome');return response({id:'saved-file',parentReference:{driveId:sp.driveId,id:sp.reportFolderId}});}
  if(action==='list_folder_items')return response({value:[{id:'saved-file',name:uploads[0].file_name}]});
  throw Error('Unexpected action');};
 const model=async(kind,item,{checkpoint})=>{await checkpoint();models.push(kind);return {output:kind==='Learn'?{verdict:'Ready',observedWorkflow:'Review approved source.',proposedImprovement:'Record source version.',sourceQuote:badQuote?'This unsupported quotation does not exist.':quote,changeFromPrior:'First proposed lesson.'}:{verdict:'Pass',rationale:'Synthetic explicit review',checks:['scope','source','destination']},evidence:'synthetic-'+kind};};
 const args={api:c.api,app,model,filesFor,digest:learningDigest,clock:()=>new Date(at),deadline:Date.parse(at)+600000};
 const first=await learningCycle(args);
 if(badQuote){assert.equal(first.status,'Held');assert.equal(uploads.length,0);return;}
 if(uncertain){assert.equal(first.status,'Held');assert.equal(uploads.length,1);assert.equal(Object.values(c.state.clientLearning.runs)[0].status,'Held');const recovered=await learningCycle(args);assert.equal(recovered.status,'Completed');assert.equal(recovered.recovered,true);assert.equal(uploads.length,1,'Recovery must never upload again');}
 else {assert.equal(first.status,'Completed');assert.deepEqual(models,['Learn','Legal','Risk','Audit']);assert.equal(uploads.length,1);}
 assert.equal(c.state.clientLearning.lastLessons[id].lessonStatus,'Proposed');assert.equal(c.state.clientLearning.lastLessons['devonshire-hoa'],undefined);
}
await cycleTest();await cycleTest({uncertain:true});await cycleTest({badQuote:true});
let called=false;const closed=context();closed.state.control.paused=true;
assert.equal((await learningCycle({api:closed.api,app:async()=>{called=true;},model:async()=>{called=true;},filesFor:()=>{},digest:learningDigest,clock:()=>new Date(at),deadline:Date.parse(at)+60000})).status,'Standby');assert.equal(called,false);
console.log('PASS client learning: hours, holidays, lease/epoch fencing, CEO origin/auth, source-backed proposal, exact destination, saved readback, Audit and read-only uncertain-save recovery. Synthetic fixtures only.');
