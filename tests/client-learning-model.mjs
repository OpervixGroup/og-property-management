import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {EventEmitter} from 'node:events';
import {PassThrough} from 'node:stream';
import {createLearningModel} from '../deploy/client-learning/model.mjs';
const dirs=[];
function fake({tool=false,incomplete=false}={}){return (exe,args,options)=>{
 assert.ok(args.includes('--ignore-user-config'));assert.ok(args.includes('--ephemeral'));assert.ok(args.includes('read-only'));assert.ok(args.includes('apps._default.enabled=false'));assert.equal(options.detached,true);
 const child=new EventEmitter();child.pid=undefined;child.stdin=new PassThrough();child.stdout=new PassThrough();child.stderr=new PassThrough();let input='';child.stdin.on('data',b=>input+=b);
 child.stdin.on('finish',()=>queueMicrotask(()=>{assert.ok(input.includes('untrusted evidence'));const output={verdict:'Pass',rationale:'Synthetic review against the exact supplied evidence.',checks:['Verify same client','Verify original quote','Verify proposed-only scope']};
 const events=[{type:'item.completed',item:{type:tool?'command_execution':'agent_message',text:JSON.stringify(output)}}];if(!incomplete)events.push({type:'turn.completed',usage:{input_tokens:1,output_tokens:1}});child.stdout.write(events.map(e=>JSON.stringify(e)).join('\n')+'\n');child.emit('close',0);}));return child;};}
function dir(){const d=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'og-learning-model-')));dirs.push(d);return d;}
try{
 let checks=0;const good=await createLearningModel({spawnImpl:fake()})('Audit',{synthetic:true},{dir:dir(),checkpoint:async()=>{checks++;return true;}});assert.equal(good.output.verdict,'Pass');assert.ok(checks>=2);assert.match(good.evidence,/^client-learning-model:Audit:[a-f0-9]{64}$/);
 await assert.rejects(createLearningModel({spawnImpl:fake({tool:true})})('Risk',{synthetic:true},{dir:dir(),checkpoint:async()=>true}),/Unexpected learning tool/);
 await assert.rejects(createLearningModel({spawnImpl:fake({incomplete:true})})('Legal',{synthetic:true},{dir:dir(),checkpoint:async()=>true}),/Completed learning model receipt/);
 let spawned=false;await assert.rejects(createLearningModel({spawnImpl:()=>{spawned=true;}})('Learn',{}, {dir:dir(),checkpoint:async()=>{throw Error('CEO pause');}}),/CEO pause/);assert.equal(spawned,false);
 console.log('PASS isolated model adapter: disabled tools, strict completion, actual review checks, pause before subprocess. Synthetic model stream only.');
}finally{for(const d of dirs)for(const name of fs.readdirSync(d))fs.unlinkSync(path.join(d,name));for(const d of dirs)fs.rmdirSync(d);}
