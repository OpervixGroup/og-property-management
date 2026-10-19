import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {stripTypeScriptTypes} from 'node:module';
const root=new URL('./.ceo-inbox-runtime/',import.meta.url);await mkdir(root,{recursive:true});
const provider=`export const state={rows:[],actor:null,rate:true,fail:false,failReply:false};
export const PLATFORM_OWNER_EMAIL='founder@example.test';
export async function platformOwner(){return state.actor;}
export async function rpc(){return state.rate;}
export function sameOrigin(r){if(r.headers.get('origin')!=='https://og.example.test')throw Error();}
export async function body(r,limit){const text=await r.text();if(text.length>limit)throw Error();return JSON.parse(text);}
export function admin(){return {from(table){let filters=table==='og_workforce_runs'?[()=>false]:[],limit=60;const q={select(){return q},not(k,op,v){filters.push(r=>!r[k].startsWith(v.slice(0,-1)));return q},like(k,v){filters.push(r=>r[k].startsWith(v.slice(0,-1)));return q},eq(k,v){filters.push(r=>r[k]===v);return q},order(){return q},limit(n){limit=n;return q},then(resolve){return Promise.resolve({data:state.rows.filter(r=>filters.every(f=>f(r))).slice(-limit).reverse(),error:state.fail?Error():null}).then(resolve)},async single(){const rows=state.rows.filter(r=>filters.every(f=>f(r)));return {data:rows[0],error:state.fail?Error():null}},async insert(row){if(state.fail||state.failReply&&row.external_id.endsWith(':r'))return {error:{code:'unavailable'}};if(state.rows.some(r=>r.external_id===row.external_id))return {error:{code:'23505'}};state.rows.push(row);return {error:null}}};return q}}}
`;
await writeFile(new URL('provider.mjs',root),provider);
async function load(path,name){let source=stripTypeScriptTypes(await readFile(new URL(path,import.meta.url),'utf8'),{mode:'transform'}).replace(/^import 'server-only';\s*/m,'');source=source.replace(/from ['"](?:@\/lib\/server\/ceo-inbox|\.\/ceo-inbox)['"]/g,"from './inbox.mjs'").replace(/from ['"](?:@\/lib\/server\/internal-coo|\.\/internal-coo)['"]/g,"from './internal.mjs'").replace(/from ['"][^'"]+['"]/g,(match)=>match.includes('./inbox.mjs')||match.includes('./internal.mjs')?match:"from './provider.mjs'");await writeFile(new URL(name,root),source);return import(new URL(name,root));}
const internal=await load('../lib/server/internal-coo.ts','internal.mjs'),inbox=await load('../lib/server/ceo-inbox.ts','inbox.mjs'),route=await load('../app/api/platform/headquarters/conversation/route.ts','route.mjs'),{state}=await import(new URL('provider.mjs',root));
const authId='11111111-1111-4111-8111-111111111111',input={id:'22222222-2222-4222-8222-222222222222',text:'Synthetic internal question'};
const request=(data=input,origin='https://og.example.test')=>new Request('https://og.example.test/api/platform/headquarters/conversation',{method:'POST',headers:{origin},body:JSON.stringify(data)});
delete process.env.OG_INTERNAL_COO_ENABLED;
let calls=0;const originalFetch=globalThis.fetch;globalThis.fetch=async()=>{calls++;throw Error('No network allowed');};
assert.equal(internal.internalConfigured(),false);
assert.throws(()=>inbox.inboxInput({...input,text:' '.repeat(2)}));assert.throws(()=>inbox.inboxInput({...input,text:'x'.repeat(4001)}));assert.throws(()=>inbox.inboxInput({...input,id:'not-uuid'}));
assert.equal((await route.GET()).status,403);assert.equal((await route.POST(request())).status,403);
state.actor={authId,email:'other@example.test'};assert.equal((await route.GET()).status,403);
state.actor.email='founder@example.test';assert.equal((await route.POST(request(input,'https://evil.example.test'))).status,403);assert.equal(state.rows.length,0);
assert.equal((await route.POST(request({...input,text:''}))).status,400);
state.rate=false;assert.equal((await route.POST(request())).status,429);state.rate=true;
assert.equal((await route.POST(request())).status,202);assert.equal(calls,0);assert.equal(state.rows.length,1);
assert.equal((await route.POST(request())).status,202);assert.equal(state.rows.length,1);
assert.equal((await route.POST(request({...input,text:'changed'}))).status,503);assert.equal(state.rows[0].text,input.text);
state.rows.push({...state.rows[0],external_id:'ceo-chat:33333333-3333-4333-8333-333333333333:'+input.id,text:'Other owner'});
const history=await (await route.GET()).json();assert.equal(history.messages.length,1);assert.equal(history.responderConfigured,false);
state.fail=true;assert.equal((await route.GET()).status,503);assert.equal((await route.POST(request({...input,id:'44444444-4444-4444-8444-444444444444'}))).status,503);state.fail=false;
process.env.OG_INTERNAL_COO_ENABLED='true';process.env.OG_INTERNAL_COO_MODEL='reviewed-local-model';process.env.OG_INTERNAL_COO_ISOLATED='true';
for(const url of ['https://api.openai.com/','http://169.254.169.254/','http://10.1.2.3/','http://127.0.0.1/private','http://127.0.0.1/?next=evil','http://user:pass@127.0.0.1/']){process.env.OG_INTERNAL_COO_URL=url;assert.equal(internal.internalConfigured(),false,url);}
process.env.OG_INTERNAL_COO_URL='http://127.0.0.1:11434';assert.equal(internal.internalConfigured(),true);
const messages=Array.from({length:15},(_,i)=>({sender:'CEO',text:'Synthetic '+i}));
const answer=await internal.internalReply(messages,async(url,options)=>{assert.equal(url.href,'http://127.0.0.1:11434/api/chat');assert.equal(options.redirect,'error');const payload=JSON.parse(options.body);assert.equal(payload.messages.length,13);assert.equal(payload.messages.at(-1).content,'Synthetic 14');assert.equal(payload.stream,false);assert.ok(!payload.tools);return Response.json({done:true,done_reason:'stop',message:{role:'assistant',content:'Synthetic advisory reply'}});});assert.equal(answer,'Synthetic advisory reply');
await assert.rejects(internal.internalReply(messages,async()=>Response.json({done:false,message:{content:'partial'}})));
await assert.rejects(internal.internalReply(messages,async()=>Response.json({done:true,done_reason:'length',message:{role:'assistant',content:'cut off'}})));
await assert.rejects(internal.internalReply(messages,async()=>Response.json({done:true,done_reason:'stop',message:{role:'assistant',content:'x'.repeat(33000)}})));
globalThis.fetch=async()=>{calls++;return Response.json({done:true,done_reason:'stop',message:{role:'assistant',content:'Synthetic internal advice'}});};
const newInput={...input,id:'55555555-5555-4555-8555-555555555555'};await inbox.saveInboxMessage(authId,newInput);assert.equal(calls,1);assert.equal(state.rows.at(-1).kind,'Internal AI reply');await inbox.saveInboxMessage(authId,newInput);assert.equal(calls,1);
globalThis.fetch=async()=>{calls++;throw Error('offline');};await inbox.saveInboxMessage(authId,{...input,id:'66666666-6666-4666-8666-666666666666'});assert.equal(state.rows.at(-1).kind,'Internal reply unavailable');
process.env.OG_INTERNAL_COO_MODEL='model:cloud';assert.equal(internal.internalConfigured(),false);
globalThis.fetch=originalFetch;
assert.throws(()=>internal.boundedContext([{sender:'CEO',text:'😀'.repeat(2000)}]));
const bounded=internal.boundedContext([{sender:'CEO',text:'x'.repeat(4000)},{sender:'AI',text:'y'.repeat(4000)},{sender:'CEO',text:'Current question'}]);
assert.equal(bounded[0].role,'system');assert.equal(bounded.at(-1).content,'Current question');assert.ok(bounded.reduce((sum,m)=>sum+Buffer.byteLength(m.content)+32,0)<6100);
process.env.OG_INTERNAL_COO_MODEL='reviewed-local-model';
process.env.OG_INTERNAL_COO_KEEP_ALIVE_SECONDS='301';assert.equal(internal.internalConfigured(),false);
process.env.OG_INTERNAL_COO_KEEP_ALIVE_SECONDS='60';assert.equal(internal.internalConfig().keepAlive,60);
delete process.env.OG_INTERNAL_COO_KEEP_ALIVE_SECONDS;
let concurrentCalls=0,release;
const gate=new Promise(resolve=>release=resolve);
globalThis.fetch=async()=>{concurrentCalls++;await gate;return Response.json({done:true,done_reason:'stop',message:{role:'assistant',content:'Concurrent advice'}});};
const concurrent={...input,id:'77777777-7777-4777-8777-777777777777'};
const first=inbox.saveInboxMessage(authId,concurrent),second=inbox.saveInboxMessage(authId,concurrent);
await new Promise(resolve=>setTimeout(resolve,0));assert.equal(concurrentCalls,1);release();await Promise.all([first,second]);assert.equal(concurrentCalls,1);
let failureCalls=0;globalThis.fetch=async()=>{failureCalls++;return Response.json({done:true,done_reason:'stop',message:{role:'assistant',content:'Generated but not stored'}});};
state.failReply=true;const lostReply={...input,id:'88888888-8888-4888-8888-888888888888'};
await assert.rejects(inbox.saveInboxMessage(authId,lostReply));state.failReply=false;await inbox.saveInboxMessage(authId,lostReply);assert.equal(failureCalls,1);assert.ok(!state.rows.some(row=>row.external_id.endsWith(lostReply.id+':r')));
globalThis.fetch=originalFetch;
await writeFile(new URL('state.mjs',root),stripTypeScriptTypes(await readFile(new URL('../lib/ceo-inbox-state.ts',import.meta.url),'utf8'),{mode:'transform'}));
const {inboxMessageState}=await import(new URL('state.mjs',root)),now=Date.now(),question={external_id:'question',sender:'CEO',kind:'Internal reply pending',text:'Synthetic',recorded_at:new Date(now-10000).toISOString()};
assert.equal(inboxMessageState(question,[question],now).retry,false);
assert.match(inboxMessageState(question,[question],now+61000).label,/No reply verified/);
assert.match(inboxMessageState({...question,kind:'Saved; internal responder disabled'},[],now).label,/no automatic dispatch/);
assert.equal(inboxMessageState(question,[{...question,external_id:'question:r',sender:'AI',kind:'Internal AI reply'}],now).label,'Internal AI reply');
console.log('PASS review regressions: concurrent same-ID saves invoke model once; reply-storage failure never replays; context byte budget; stale/disabled/replied state; bounded model warm setting.');
const roster=stripTypeScriptTypes(await readFile(new URL('../lib/ai-workforce.ts',import.meta.url),'utf8'),{mode:'transform'});await writeFile(new URL('roster.mjs',root),roster);
const feed=await readFile(new URL('../lib/server/workforce.ts',import.meta.url),'utf8');assert.ok(feed.includes(".not('external_id','like','ceo-chat:%')"));assert.ok(feed.includes("id.startsWith('ceo-chat:')"));
console.log('PASS CEO inbox: founder/origin/rate/input/storage gates, private history, immutable retries, no default dispatch, private-only connector, bounded context, complete reply validation, failure receipts. Synthetic storage and model only.');
let workforceSource=stripTypeScriptTypes(feed,{mode:'transform'}).replace(/^import 'server-only';\s*/m,'').replace("from '@/lib/ai-workforce'","from './roster.mjs'").replace("from './supabase'","from './provider.mjs'");await writeFile(new URL('workforce.mjs',root),workforceSource);const workforce=await import(new URL('workforce.mjs',root));assert.throws(()=>workforce.parseMessage({id:'ceo-chat:reserved',senderId:'coo',recipientId:'ceo',text:'Cannot spoof',recordedAt:new Date().toISOString()}));state.rows.push({external_id:'public-evidence',sender:'Synthetic COO',recipient:'CEO',kind:'Evidence',text:'Synthetic result',recorded_at:new Date().toISOString(),office:'ceo'});const general=await workforce.workforceFeed();assert.equal(general.messages.length,1);assert.equal(general.messages[0].id,'public-evidence');console.log('PASS private inbox records excluded by actual workforce feed and ingestion parser.');

state.rows=[];const emptyFeed=await workforce.workforceFeed();assert.equal(emptyFeed.updatedAt,'');assert.equal(emptyFeed.runs.length,0);assert.equal(emptyFeed.messages.length,0);console.log('PASS empty workforce history does not fabricate a fresh timestamp.');
