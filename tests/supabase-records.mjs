import assert from 'node:assert/strict';
import {stripTypeScriptTypes} from 'node:module';
import {readFile,writeFile,rm} from 'node:fs/promises';
const path=new URL('../lib/.supabase-records-test.mjs',import.meta.url);
try{
await writeFile(path,stripTypeScriptTypes(await readFile(new URL('../lib/supabase-records.ts',import.meta.url),'utf8'),{mode:'transform'}));
const {supabaseRecords}=await import(path);let calls=[];const config={url:'https://conganplywqzmuktmyxd.supabase.co',secret:'test-only-secret'};
const adapter=supabaseRecords(config,async(url,options)=>{calls.push({url:String(url),options});return Response.json({revision:3,data:{units:[]},operationApplied:true});});
assert.equal((await adapter.load('private-owner','saved-op')).operationApplied,true);assert.deepEqual(JSON.parse(calls[0].options.body),{p_user:'private-owner',p_operation:'saved-op'});assert.ok(calls[0].url.endsWith('/rpc/og_load_records'));assert.equal(calls[0].options.headers.apikey,config.secret);
await supabaseRecords({...config,secret:'sb_secret_test'},async(url,options)=>{assert.equal(options.headers.Authorization,undefined);return Response.json({revision:0,data:{}});}).load('owner');
await adapter.save('private-owner',3,'new-op',{units:[]});assert.equal(JSON.parse(calls[1].options.body).p_revision,3);
for(const code of ['OG409','OG404','42501']){const fail=supabaseRecords(config,async()=>Response.json({code,message:'sensitive backend details'},{status:400}));await assert.rejects(()=>fail.load('owner'),code==='OG409'?/CONFLICT/:code==='OG404'?/not been migrated/:/unavailable/);}
assert.throws(()=>supabaseRecords({...config,url:'https://attacker.example'}));assert.throws(()=>supabaseRecords({...config,secret:''}));assert.throws(()=>supabaseRecords({...config,url:config.url+'/?x=1'}));
await assert.rejects(()=>supabaseRecords(config,async()=>Response.json({revision:-1,data:{}})).load('owner'),/Invalid/);
console.log('PASS Supabase transport: server authorization, owner binding, operations, conflicts, missing migration, sanitized errors and URL restrictions. Actual PostgreSQL execution remains pending.');
}finally{await rm(path,{force:true});}
