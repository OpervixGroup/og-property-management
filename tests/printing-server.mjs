import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {stripTypeScriptTypes} from 'node:module';
import {PDFDocument} from 'pdf-lib';
import {prepareModels} from './prepare-models.mjs';
const root=new URL('./.mock-runtime/printing-server/',import.meta.url);
await prepareModels(root,['seed','exports','access-policy']);
let policy=stripTypeScriptTypes(await readFile(new URL('../lib/server/request.ts',import.meta.url),'utf8'),{mode:'transform'}).replace("'@/lib/access-policy'","'./access-policy.mjs'");await writeFile(new URL('request.mjs',root),policy);
await writeFile(new URL('auth.mjs',root),'let user=null;export function setup(value){user=value;}export async function getChatGPTUser(){return user;}');
await writeFile(new URL('storage.mjs',root),"import {seed} from './seed.mjs';export const data=seed();export async function load(){return {data};}");
await writeFile(new URL('documents.mjs',root),"export async function listDocuments(){return [];}export async function documentBytes(){throw Error('Unexpected document access');}");
let code=stripTypeScriptTypes(await readFile(new URL('../app/api/owner-report/route.ts',import.meta.url),'utf8'),{mode:'transform'});
for(const [source,target] of Object.entries({'@/app/chatgpt-auth':'./auth.mjs','@/lib/server/request':'./request.mjs','@/lib/storage':'./storage.mjs','@/lib/document-storage':'./documents.mjs','@/lib/exports':'./exports.mjs','@/lib/pool':'./pool.mjs'}))code=code.replaceAll("'"+source+"'","'"+target+"'");
await writeFile(new URL('route.mjs',root),code);
const {GET}=await import(new URL('route.mjs',root)),auth=await import(new URL('auth.mjs',root)),{data}=await import(new URL('storage.mjs',root));
const request=path=>new Request('https://og.example.test/api/owner-report?'+path);
assert.equal((await GET(request('statement='+data.statements[0].id))).status,403);
for(const role of ['Maintenance','Accounting Clerk','Analyst / Agent']){auth.setup({userId:'test',role,mustChangePassword:false});assert.equal((await GET(request('statement='+data.statements[0].id))).status,403);}
auth.setup({userId:'test',role:'Accountant',mustChangePassword:true});assert.equal((await GET(request('statement='+data.statements[0].id))).status,403);
for(const role of ['Global Admin','Management','Accountant','External CPA']){
 auth.setup({userId:'test',role,mustChangePassword:false});const response=await GET(request('statement='+data.statements[0].id));assert.equal(response.status,200);assert.equal(response.headers.get('content-type'),'application/pdf');assert.match(response.headers.get('content-disposition'),/^attachment/);assert.equal(response.headers.get('cache-control'),'private, no-store');assert.ok((await PDFDocument.load(await response.arrayBuffer())).getPageCount());
}
const first=data.statements[0],other=data.statements.find(s=>s.ownerId!==first.ownerId);
assert.equal((await GET(request('owner='+first.ownerId+'&period=2026-10&unit='+other.unitId))).status,400);
assert.equal((await GET(request('owner='+first.ownerId+'&period=invalid&unit='+first.unitId))).status,400);
assert.equal((await GET(request('statement=missing'))).status,400);
const response=await GET(request('statement='+first.id+'&inline=1'));assert.match(response.headers.get('content-disposition'),/^inline/);
const zip=await GET(request('statement='+first.id+'&format=zip'));assert.equal(zip.status,200);assert.equal(zip.headers.get('content-type'),'application/zip');
console.log('PASS owner report endpoint: role and password-change gates, all report-authorized roles, ownership isolation, invalid selections, private noncached PDF/ZIP responses and inline PDF printing');
