import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {stripTypeScriptTypes} from 'node:module';
import {fixture} from './model-loader.mjs';
const d=await fixture(),root=new URL('./.mock-runtime/',import.meta.url),{queueWorkChanges}=await import(new URL('work-mail-model.mjs',root));d.operations.workOrders=[];const n=structuredClone(d);n.operations.workOrders.push({id:'mail-wo',number:'WO-MAIL',unitId:d.units[0].id,title:'Test',description:'Fixture',notes:'',status:'New',priority:'Normal',scheduled:'',assignee:'',vendor:''});queueWorkChanges(d,n,false);
await writeFile(new URL('mail-storage.mjs',root),`let data,revision=0;export function setup(d){data=structuredClone(d);revision=0;}export async function load(){return {data:structuredClone(data),revision};}export async function save(workspace,expected,operation,next){if(expected!==revision)throw Error('CONFLICT');data=structuredClone(next);revision++;return {data:structuredClone(data),revision};}`);
let code=stripTypeScriptTypes(await readFile(new URL('../lib/server/work-mail.ts',import.meta.url),'utf8'),{mode:'transform'}).replace("import 'server-only';",'').replace("'@/lib/storage'","'./mail-storage.mjs'").replace("'@/lib/pool'","'./pool.mjs'").replace("'@/lib/work-mail-model'","'./work-mail-model.mjs'").replaceAll("'./mail-config'","'./mail-config.mjs'");await writeFile(new URL('work-mail-server.mjs',root),code);
await writeFile(new URL('mail-config.mjs',root),stripTypeScriptTypes(await readFile(new URL('../lib/server/mail-config.ts',import.meta.url),'utf8'),{mode:'transform'}).replace("import 'server-only';",''));
const storage=await import(new URL('mail-storage.mjs',root)),{processWorkMail,dispatchWorkMail}=await import(new URL('work-mail-server.mjs',root));const keys=['OG_WORK_EMAIL_ENABLED','MS_TENANT_ID','MS_CLIENT_ID','MS_CLIENT_SECRET'],previous=Object.fromEntries(keys.map(k=>[k,process.env[k]])),originalFetch=globalThis.fetch;Object.assign(process.env,{OG_WORK_EMAIL_ENABLED:'true',MS_TENANT_ID:'12345678-1234-1234-1234-123456789abc',MS_CLIENT_ID:'12345678-1234-1234-1234-123456789abc',MS_CLIENT_SECRET:'test-secret'});let sent=0,mode='accept';globalThis.fetch=async(url,options)=>{if(String(url).includes('oauth2'))return Response.json({access_token:'fixture-access'});if(String(url).endsWith('/sendMail')){sent++;assert.equal(JSON.parse(options.body).message.toRecipients[0].emailAddress.address,'dla@devonshirecondos.com');if(mode==='timeout')throw Error('timeout');return new Response(null,{status:202});}assert.ok(String(url).startsWith('https://graph.microsoft.com/v1.0/users/'));return Response.json({value:[]});};
try{
 storage.setup(n);
 await Promise.all([processWorkMail('test'),processWorkMail('test')]);
 assert.equal(sent,0,'Mailbox review must not release pending notifications');
 assert.deepEqual((await storage.load()).data.workMail.notifications,n.workMail.notifications,'Reply checks preserve outbound queue');
 const second=structuredClone(n);second.workMail.notifications.push({...second.workMail.notifications[0],id:'unapproved-backlog'});storage.setup(second);
 const id=n.workMail.notifications[0].id;
 await assert.rejects(dispatchWorkMail('test',[]),/approved notification IDs/);
 await assert.rejects(dispatchWorkMail('test',[id,id]),/approved notification IDs/);
 await Promise.all([dispatchWorkMail('test',[id]),dispatchWorkMail('test',[id])]);
 assert.equal(sent,1,'CAS must prevent duplicate explicit dispatch');
 assert.equal((await storage.load()).data.workMail.notifications[0].state,'Accepted by Outlook');
 assert.equal((await storage.load()).data.workMail.notifications[1].state,n.workMail.notifications[0].state,'Unselected backlog stays held');
 await processWorkMail('test');await dispatchWorkMail('test',[id]);assert.equal(sent,1);
 storage.setup(n);mode='timeout';await dispatchWorkMail('test',[id]);
 assert.equal((await storage.load()).data.workMail.notifications[0].state,'Delivery uncertain');
 await processWorkMail('test');await dispatchWorkMail('test',[id]);assert.equal(sent,2,'Uncertain delivery must not resend');
 const {continuationAllowed}=await import(new URL('work-mail-server.mjs',root));
 assert.equal(continuationAllowed('https://evil.example/messages?token=steal'),false);
 assert.equal(continuationAllowed('https://graph.microsoft.com/v1.0/users/other@example.test/mailFolders/inbox/messages?$skiptoken=x'),false);
 assert.equal(continuationAllowed('https://graph.microsoft.com/v1.0/users/dla%40devonshirecondos.com/mailFolders/inbox/messages?$skiptoken=x'),true);
 const originalWorkspace=process.env.OG_WORKSPACE_ID;process.env.OG_WORKSPACE_ID='test';const beforeBlocked=sent;
 try{assert.equal((await processWorkMail('other-company')).configured,false);assert.equal((await dispatchWorkMail('other-company',[id])).configured,false);assert.equal(sent,beforeBlocked);}finally{if(originalWorkspace===undefined)delete process.env.OG_WORKSPACE_ID;else process.env.OG_WORKSPACE_ID=originalWorkspace;}
 console.log('PASS Outlook worker: reply review sends nothing, backlog held, selected dispatch only, concurrency claim, no resend after timeout, exact mailbox scope');
}finally{globalThis.fetch=originalFetch;for(const k of keys)if(previous[k]===undefined)delete process.env[k];else process.env[k]=previous[k];}

// Route regression: scheduled and manual review must not invoke any sender.
await writeFile(new URL('mail-route-provider.mjs',root),`export let reviewed=[],dispatches=0,failReview=false;export function setReviewFailure(){failReview=true;}export function getChatGPTUser(){return {userId:'test',role:'Management'};}export function fullAccess(u){if(!u)throw Error('Denied');return u;}export function sameOrigin(r){if(r.headers.get('origin')!=='https://example.test')throw Error('Invalid origin');}export function mailConfigured(){return true;}export async function processWorkMail(w){if(failReview)throw Error('Synthetic failure');reviewed.push(w);return {configured:true,accepted:0,replies:0};}export async function processSupportMail(){dispatches++;throw Error('Dispatch forbidden in review');}export function serverConfig(){return {workspace:'test'};}`);
const routeCode=stripTypeScriptTypes(await readFile(new URL('../app/api/work-email/route.ts',import.meta.url),'utf8'),{mode:'transform'}).replace(/'@\/[^']+'/g,"'./mail-route-provider.mjs'");
await writeFile(new URL('mail-route.mjs',root),routeCode);
const route=await import(new URL('mail-route.mjs',root)),routeProvider=await import(new URL('mail-route-provider.mjs',root));
const priorCron=process.env.OG_WORK_EMAIL_CRON_SECRET;process.env.OG_WORK_EMAIL_CRON_SECRET='synthetic-cron-secret-32-characters-only';
try{
 const cron=await route.GET(new Request('https://example.test/api/work-email',{headers:{authorization:'Bearer '+process.env.OG_WORK_EMAIL_CRON_SECRET}}));
 assert.equal(cron.status,200);assert.equal((await cron.json()).mode,'reply-review-only');
 const manual=await route.POST(new Request('https://example.test/api/work-email',{method:'POST',headers:{origin:'https://example.test'}}));
 assert.equal(manual.status,200);assert.equal((await manual.json()).accepted,0);
 assert.equal(routeProvider.dispatches,0);assert.deepEqual(routeProvider.reviewed,['test','test']);
 const denied=await route.GET(new Request('https://example.test/api/work-email',{headers:{authorization:'Bearer wrong'}}));assert.equal(denied.status,403);
 const csrf=await route.POST(new Request('https://example.test/api/work-email',{method:'POST',headers:{origin:'https://other.test'}}));assert.equal(csrf.status,400);
 assert.equal(routeProvider.reviewed.length,2);
 routeProvider.setReviewFailure();
 const failure=await route.GET(new Request('https://example.test/api/work-email',{headers:{authorization:'Bearer '+process.env.OG_WORK_EMAIL_CRON_SECRET}}));
 assert.equal(failure.status,503,'Scheduler must observe review failure');assert.match((await failure.json()).error,/review failed/);
 console.log('PASS mailbox routes: cron and session checks review only; support dispatch excluded; invalid secret and origin denied');
}finally{if(priorCron===undefined)delete process.env.OG_WORK_EMAIL_CRON_SECRET;else process.env.OG_WORK_EMAIL_CRON_SECRET=priorCron;}
