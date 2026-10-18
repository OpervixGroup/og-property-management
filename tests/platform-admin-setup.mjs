import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {stripTypeScriptTypes} from 'node:module';
const root=new URL('./.platform-admin-runtime/',import.meta.url);await mkdir(root,{recursive:true});
const provider=`export const state={};export function reset(){Object.assign(state,{identity:null,actor:null,rows:[],audits:[],created:[],changed:[],rate:true,auditFailure:false,createFailure:false,bindFailure:false,metadataFailure:false,current:'Synthetic temporary 123'});}
export const PLATFORM_OWNER_EMAIL='founder@example.test';
export async function platformOwner(){return state.actor}
export async function platformIdentity(){return state.identity}
export async function platformAudit(actor,event,detail){if(state.auditFailure)throw Error('Audit failed');state.audits.push({actor,event,detail});}
export async function rpc(){return state.rate}
export function sameOrigin(r){if(r.headers.get('origin')!=='https://og.example.test')throw Error('Invalid request origin')}
export async function body(r){const s=await r.text();if(s.length>6000)throw Error('Too large');return JSON.parse(s)}
export function password(s){if(typeof s!=='string'||s.length<12||s.length>128)throw Error('Use 12–128');return s}
export async function sessionClient(){return {auth:{async updateUser(p){state.changed.push(p);return {error:null}}}}}
export function admin(){return {auth:{async signInWithPassword(p){return {error:p.password===state.current?null:Error('Wrong'),data:{user:{id:state.identity?.authId}}}},async signOut(){return {}},admin:{async createUser(p){state.created.push(p);return {error:state.createFailure?Error('Duplicate'):null,data:{user:state.createFailure?null:{id:'new-identity'}}}},async updateUserById(id,p){state.changed.push({id,...p});return {error:state.metadataFailure?Error('failed'):null}}}},from(){let filters=[],patch;const q={select(){return q},eq(k,v){filters.push(r=>r[k]===v);return q},is(k,v){filters.push(r=>r[k]===v);return q},update(p){patch=p;return q},async maybeSingle(){if(patch&&state.bindFailure)return {error:Error('bind'),data:null};const found=state.rows.filter(r=>filters.every(f=>f(r)));if(patch)found.forEach(r=>Object.assign(r,patch));return {error:null,data:found.length===1?found[0]:null}}};return q}}}
reset();`;
await writeFile(new URL('provider.mjs',root),provider);
async function load(file,name){let code=stripTypeScriptTypes(await readFile(new URL(file,import.meta.url),'utf8'),{mode:'transform'});code=code.replace(/^import 'server-only';\s*/m,'').replace(/from ['"][^'"]+['"]/g,"from './provider.mjs'");await writeFile(new URL(name,root),code);return import(new URL(name,root));}
const mock=await import(new URL('provider.mjs',root)),create=await load('../app/api/platform/administrators/route.ts','create.mjs'),change=await load('../app/api/platform/password/route.ts','password.mjs'),owner=await load('../lib/server/platform.ts','owner.mjs');
const s=mock.state,email='synthetic@opervixgroup.com',payload={name:'Synthetic Admin',email,password:'Synthetic temporary 123'};
const request=(p,origin='https://og.example.test')=>new Request('https://og.example.test/api/platform/administrators',{method:'POST',headers:{origin,'Content-Type':'application/json'},body:JSON.stringify(p)});
function setup(){mock.reset();s.actor={authId:'founder',email:'founder@example.test'};s.rows=[{email,active:true,auth_id:null}];}
setup();s.actor=null;assert.equal((await create.POST(request(payload))).status,403);assert.equal(s.created.length,0);
setup();s.actor.email='other@example.test';assert.equal((await create.POST(request(payload))).status,403);
setup();assert.equal((await create.POST(request(payload,'https://evil.example.test'))).status,400);assert.equal(s.created.length,0);
setup();assert.equal((await create.POST(request({...payload,password:'short'}))).status,400);assert.equal(s.created.length,0);
setup();s.rows=[];assert.equal((await create.POST(request(payload))).status,400);assert.equal(s.created.length,0);
setup();s.rows[0].auth_id='existing';assert.equal((await create.POST(request(payload))).status,400);assert.equal(s.created.length,0);
setup();s.auditFailure=true;assert.equal((await create.POST(request(payload))).status,400);assert.equal(s.created.length,0);
setup();s.createFailure=true;assert.equal((await create.POST(request(payload))).status,400);assert.equal(s.rows[0].auth_id,null);
setup();assert.equal((await create.POST(request(payload))).status,200);assert.equal(s.rows[0].auth_id,'new-identity');assert.equal(s.created[0].email_confirm,true);assert.equal(s.created[0].app_metadata.og_platform_password_required,true);assert.ok(!JSON.stringify(s.audits).includes(payload.password));assert.equal((await create.POST(request(payload))).status,400);assert.equal(s.created.length,1);
setup();s.bindFailure=true;assert.equal((await create.POST(request(payload))).status,400);assert.equal(s.created[0].app_metadata.og_platform_password_required,true);assert.equal(s.rows[0].auth_id,null);
setup();s.identity={authId:'new-identity',email,metadata:{preserve:'yes'},mustChangePassword:true};assert.equal(await owner.platformOwner(),null);s.identity.mustChangePassword=false;assert.equal((await owner.platformOwner()).authId,'new-identity');s.identity.mustChangePassword=true;
const next={currentPassword:s.current,password:'Synthetic personal 456'};
assert.equal((await change.POST(request({...next,currentPassword:'wrong'}))).status,400);assert.equal(s.changed.length,0);
assert.equal((await change.POST(request({...next,password:s.current}))).status,400);
assert.equal((await change.POST(request(next))).status,200);assert.equal(s.changed[1].app_metadata.og_platform_password_required,false);assert.equal(s.changed[1].app_metadata.preserve,'yes');assert.ok(!JSON.stringify(s.audits).includes(next.password));
setup();s.identity={authId:'new-identity',email,metadata:{},mustChangePassword:true};s.auditFailure=true;assert.equal((await change.POST(request(next))).status,400);assert.equal(s.changed.length,0);
setup();s.identity={authId:'new-identity',email,metadata:{},mustChangePassword:true};s.metadataFailure=true;assert.equal((await change.POST(request(next))).status,400);
console.log('PASS platform admin setup: founder/CSRF/password/reservation/duplicate/audit gates, no email dependency, required change, current password verification and failure handling. Synthetic provider only.');
