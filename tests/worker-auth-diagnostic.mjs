import test from 'node:test';import assert from 'node:assert/strict';
import {workerAuthDiagnostic as check,workerAuthObserver} from '../lib/worker-auth-diagnostic.mjs';
const secret='synthetic_only_'.repeat(4);
test('exact secret passes without altering authorization',()=>assert.equal(check(secret,'Bearer '+secret),'MATCH'));
test('missing short runtime value distinguished',()=>{for(const s of [undefined,null,'','short'])assert.equal(check(s,'Bearer '+secret),'RUNTIME_SECRET_UNAVAILABLE');});
test('proxy/header absence distinguished',()=>assert.equal(check(secret,null),'AUTHORIZATION_HEADER_MISSING'));
test('whitespace runtime mismatch identified without normalization',()=>assert.equal(check(secret+'\n','Bearer '+secret),'RUNTIME_SECRET_WHITESPACE_OR_CONTROL'));
test('quoted runtime mismatch identified without accepting unquoted token',()=>assert.equal(check('"'+secret+'"','Bearer '+secret),'RUNTIME_SECRET_SURROUNDING_QUOTES'));
test('scheme mismatch distinguished',()=>assert.equal(check(secret,'Basic '+secret),'AUTHORIZATION_SCHEME_MISMATCH'));
test('wrong value remains mismatch',()=>assert.equal(check(secret,'Bearer '+'x'.repeat(secret.length)),'CREDENTIAL_MISMATCH'));
test('observer emits enumerated code only and never client credentials',()=>{const logs=[];const req=new Request('https://synthetic.invalid',{headers:{authorization:'Bearer '+secret+'wrong'}});workerAuthObserver(secret,req,row=>logs.push(row));assert.deepEqual(logs,[{event:'private-worker-auth',diagnosticVersion:'1',reason:'CREDENTIAL_MISMATCH'}]);assert.equal(JSON.stringify(logs).includes(secret),false);});
test('matched request emits no log',()=>{const logs=[];workerAuthObserver(secret,new Request('https://synthetic.invalid',{headers:{authorization:'Bearer '+secret}}),x=>logs.push(x));assert.equal(logs.length,0);});
import {workerSecretFlags} from '../lib/worker-auth-diagnostic.mjs';
test('CEO diagnostic flags expose booleans only',()=>{for(const s of [undefined,'short',secret,secret+'\n','"'+secret+'"']){const flags=workerSecretFlags(s);assert.deepEqual(Object.keys(flags),['configured','hasWhitespaceOrControl','hasSurroundingQuotes']);assert.ok(Object.values(flags).every(v=>typeof v==='boolean'));assert.equal(JSON.stringify(flags).includes(secret),false);}});
import {boundedWorkerAuthLogger} from '../lib/worker-auth-diagnostic.mjs';
test('protected log observer limits repetitions and strips injected fields',()=>{const logs=[],log=boundedWorkerAuthLogger(x=>logs.push(x));for(let n=0;n<10;n++)log({event:'private-worker-auth',diagnosticVersion:'1',reason:'CREDENTIAL_MISMATCH',secret});assert.equal(logs.length,1);assert.equal(JSON.stringify(logs).includes(secret),false);});
test('protected logger ignores unregistered diagnostic values',()=>{const logs=[],log=boundedWorkerAuthLogger(x=>logs.push(x));log({event:'private-worker-auth',diagnosticVersion:'1',reason:secret});assert.equal(logs.length,0);});

