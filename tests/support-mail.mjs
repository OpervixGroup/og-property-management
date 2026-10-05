import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {stripTypeScriptTypes} from 'node:module';
const root=new URL('./.support-runtime/',import.meta.url);await mkdir(root,{recursive:true});
const code=stripTypeScriptTypes(await readFile(new URL('../lib/server/support-mail.ts',import.meta.url),'utf8'),{mode:'transform'}).replace("import 'server-only';",'').replace("'../support-model'","'./support-model.mjs'");
await writeFile(new URL('support-mail.mjs',root),code);
await writeFile(new URL('support-model.mjs',root),stripTypeScriptTypes(await readFile(new URL('../lib/support-model.ts',import.meta.url),'utf8'),{mode:'transform'}));
const keys=['OG_SUPPORT_EMAIL_ENABLED','SUPPORT_MS_TENANT_ID','SUPPORT_MS_CLIENT_ID','SUPPORT_MS_CLIENT_SECRET'];const previous=Object.fromEntries(keys.map(k=>[k,process.env[k]])),original=globalThis.fetch;
const mail=await import(new URL('support-mail.mjs',root));let calls=[];
try{
 for(const key of keys)delete process.env[key];assert.equal(mail.supportMailConfigured(),false);
 Object.assign(process.env,{OG_SUPPORT_EMAIL_ENABLED:'true',SUPPORT_MS_TENANT_ID:'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',SUPPORT_MS_CLIENT_ID:'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',SUPPORT_MS_CLIENT_SECRET:'synthetic-support-secret'});
 globalThis.fetch=async(url,options)=>{calls.push({url:String(url),options});return String(url).includes('oauth2')?Response.json({access_token:'synthetic-token'}):new Response(null,{status:202});};
 assert.equal(await mail.sendSupportMessage('support@opervixgroup.com','[Devonshire Leasing Agency Inc] Test','Synthetic'),202);
 assert.match(calls[0].url,/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/);assert.equal(calls[0].options.body.get('client_id'),'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');assert.equal(calls[0].options.body.get('client_secret'),'synthetic-support-secret');
 assert.equal(calls[1].url,'https://graph.microsoft.com/v1.0/users/support%40opervixgroup.com/sendMail');const payload=JSON.parse(calls[1].options.body);assert.equal(payload.message.replyTo[0].emailAddress.address,'support@opervixgroup.com');assert.equal(payload.message.toRecipients[0].emailAddress.address,'support@opervixgroup.com');
 await assert.rejects(mail.sendSupportMessage('dla@devonshirecondos.com','Test','Synthetic'),/Unapproved/);assert.equal(calls.length,2);
 delete process.env.SUPPORT_MS_CLIENT_SECRET;assert.equal(mail.supportMailConfigured(),false);await assert.rejects(mail.sendSupportMessage('support@opervixgroup.com','Test','Synthetic'),/not configured/);assert.equal(calls.length,2);
 console.log('PASS independent Opervix support credentials, sender, reply address, exact recipient and disabled transport');
}finally{globalThis.fetch=original;for(const key of keys)if(previous[key]===undefined)delete process.env[key];else process.env[key]=previous[key];}
