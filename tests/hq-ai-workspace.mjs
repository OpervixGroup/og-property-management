import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile,copyFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import path from 'node:path';
const require=createRequire(process.env.OPERVIX_TEST_DEPENDENCIES ? path.resolve(process.env.OPERVIX_TEST_DEPENDENCIES,'package.json') : new URL('../package.json',import.meta.url));
const ts=require('typescript'),React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
async function load(file,overrides={}){
 const source=await readFile(new URL('../'+file,import.meta.url),'utf8');
 const code=ts.transpileModule(source,{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022},reportDiagnostics:true});
 assert.equal((code.diagnostics??[]).filter(d=>d.category===ts.DiagnosticCategory.Error).length,0);
 const mod={exports:{}};
 new Function('require','module','exports',code.outputText)(id=>Object.hasOwn(overrides,id)?overrides[id]:id.endsWith('.css')?{}:require(id),mod,mod.exports);
 return mod.exports;
}
const {cloudFolderUrl}=await load('lib/hq-cloud-workspace.ts');
for(const value of [undefined,'','not a URL','javascript:alert(1)','http://example.sharepoint.com/sites/HQ','https://example.sharepoint.com.evil.test/sites/HQ','https://owner:secret@example.sharepoint.com/sites/HQ','https://example.sharepoint.com:444/sites/HQ','https://example.sharepoint.com/sites/HQ?token=secret','https://example.sharepoint.com/sites/HQ#token','https://example.sharepoint.com/other'])assert.equal(cloudFolderUrl(value),null);
const good='https://example-my.sharepoint.com/personal/owner/Documents/HQ';
assert.equal(cloudFolderUrl(good),good);
const {default:Workspace}=await load('app/platform/headquarters/ai-workspace/workspace.tsx');
let mode='denied',configurationReads=0;
const {default:Page,dynamic}=await load('app/platform/headquarters/ai-workspace/page.tsx',{
 'next/navigation':{redirect:location=>{throw Error('redirect:'+location);}},
 '@/lib/server/platform':{platformOwner:async()=>mode==='owner'?{authId:'synthetic-owner'}:null},
 '@/lib/hq-cloud-workspace':{cloudFolderUrl:value=>{configurationReads++;return cloudFolderUrl(value);}},
 './workspace':{default:Workspace,__esModule:true}
});
assert.equal(dynamic,'force-dynamic');
await assert.rejects(Page(),/redirect:\/login/);assert.equal(configurationReads,0,'Unauthorized route must stop before resolving cloud configuration');
const before=process.env.OG_HQ_CLOUD_FOLDER_URL;
try{
 mode='owner';process.env.OG_HQ_CLOUD_FOLDER_URL=good;
 const html=renderToStaticMarkup(await Page());
 assert.ok(html.includes('Open private cloud folder'));assert.ok(html.includes(good));
 assert.ok(html.includes('EMBEDDED CHAT · NOT CONNECTED'));assert.ok(html.includes('https://chatgpt.com/'));
 assert.ok(!/<iframe|<form|<textarea|<input/.test(html),'No pretend chat, embedding, credential or task form');
 delete process.env.OG_HQ_CLOUD_FOLDER_URL;
 const fallback=renderToStaticMarkup(await Page());
 assert.ok(fallback.includes('Open Microsoft 365'));assert.ok(!fallback.includes(good));
 assert.ok(fallback.includes('has not been configured'));assert.ok(fallback.includes('Back to Headquarters'));
 const hq=await readFile(new URL('../app/platform/headquarters/workforce.tsx',import.meta.url),'utf8');
 assert.equal(hq.split('href="/platform/headquarters/ai-workspace"').length-1,1);
 if(process.env.OPERVIX_REVIEW_OUTPUT){
  const dir=path.resolve(process.env.OPERVIX_REVIEW_OUTPUT);await mkdir(dir,{recursive:true});
  const css=await readFile(new URL('../app/platform/headquarters/headquarters.css',import.meta.url),'utf8')+'\n'+await readFile(new URL('../app/platform/headquarters/ai-workspace/workspace.css',import.meta.url),'utf8');
  await writeFile(path.join(dir,'index.html'),'<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Opervix AI Workspace · candidate review</title><style>body{margin:0;background:#f5f2eb}'+css+'</style></head><body>'+fallback+'</body></html>');
  await copyFile(new URL('../public/opervix-logo-luxury.webp',import.meta.url),path.join(dir,'opervix-logo-luxury.webp'));
 }
}finally{if(before===undefined)delete process.env.OG_HQ_CLOUD_FOLDER_URL;else process.env.OG_HQ_CLOUD_FOLDER_URL=before;}
console.log('PASS Workspace route authorization, force-dynamic, rejected credential-bearing/untrusted links, configured and missing navigation, actual React rendering, truthful disconnected status and Headquarters entry. Auth uses a stub; this is not live security acceptance.');
