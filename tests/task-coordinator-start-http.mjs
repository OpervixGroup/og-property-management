import assert from'node:assert/strict';import{startHTTP}from'../lib/task-coordinator-start-http.mjs';
let calls=0,actor={authId:'synthetic-ceo'},paused=true;
const handle=startHTTP({authenticate:async()=>actor,isCEO:async a=>a.authId==='synthetic-ceo',origin:'https://synthetic.example',execute:async()=>{calls++;return Response.json({status:paused?'Paused':'Awaiting audit'});}});
const req=(origin='https://synthetic.example',body='{}')=>new Request('https://synthetic.example/api',{method:'POST',headers:{origin},body});
actor=null;assert.equal((await handle(req())).status,403);actor={authId:'someone-else'};assert.equal((await handle(req())).status,403);actor={authId:'synthetic-ceo'};
assert.equal((await handle(req('https://attacker.example'))).status,403);assert.equal((await handle(req('https://synthetic.example','{"command":"arbitrary"}'))).status,400);assert.equal(calls,0);
assert.equal((await(await handle(req())).json()).status,'Paused');paused=false;assert.equal((await(await handle(req())).json()).status,'Awaiting audit');assert.equal(calls,2);
console.log('PASS CEO-only bounded start, origin and arbitrary input denial, paused result preserved, no automatic audit/completion or worker loop.');
