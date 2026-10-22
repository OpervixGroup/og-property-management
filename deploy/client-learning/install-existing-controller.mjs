// Run as the existing node user from a reviewed, private candidate directory.
// Installs in STANDBY; never activates learning, creates a timer or clears a lock.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const candidate=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..'),root='/home/node/opervix-cloud-team-20261021';
if(process.getuid()!==1000||fs.realpathSync(root)!==root||fs.existsSync(root+'/cycle.lock'))throw Error('Existing private runtime must be idle; preserve every lock');
const read=p=>{const s=fs.lstatSync(p);if(!s.isFile()||s.isSymbolicLink()||s.uid!==1000||(s.mode&0o077)!==0)throw Error('Private regular node-owned package required');return fs.readFileSync(p);};
const activation=JSON.parse(read(root+'/activation.json'));if(activation.clientLearningEnabled===true)throw Error('Learning must remain in standby during installation');
const manifest=JSON.parse(read(root+'/package-manifest.json'));
for(const f of manifest.files){if(!/^[a-zA-Z0-9_./-]+$/.test(f.path)||f.path.split('/').includes('..')||path.isAbsolute(f.path))throw Error('Invalid manifest path');if(createHash('sha256').update(read(path.join(root,f.path))).digest('hex')!==f.sha256)throw Error('Original runtime integrity mismatch');}
let controller=read(root+'/cycle.mjs').toString();
if(controller.includes('runClientLearning'))throw Error('Learning integration already present; verify instead of reinstalling');
const anchor=" atomic(path.join(root,'last-cycle.json'),";
if(controller.split(anchor).length!==2||controller.split('const root=path.dirname').length!==2)throw Error('Exact reviewed controller shape required');
controller="import {runClientLearning} from './deploy/client-learning/integration.mjs';\n"+controller.replace('const root=path.dirname','const cycleStartedAt=Date.now();\nconst root=path.dirname').replace(anchor," const learning=await runClientLearning({root,activation:cfg,raw,app,signal:stop.signal,cycleStartedAt,corporateStatus:result.status});\n atomic(path.join(root,'last-client-learning.json'),{...learning,at:new Date().toISOString(),runId});\n"+anchor);
const files=['lib/client-learning.mjs','deploy/client-learning/cycle.mjs','deploy/client-learning/model.mjs','deploy/client-learning/integration.mjs'];
const data=new Map(files.map(f=>[f,read(path.join(candidate,f))]));data.set('cycle.mjs',Buffer.from(controller));
const backup=path.join(root,'learning-backup-'+Date.now());fs.mkdirSync(backup,{mode:0o700});
for(const f of ['cycle.mjs','package-manifest.json','activation.json'])fs.writeFileSync(path.join(backup,f),read(path.join(root,f)),{mode:0o600,flag:'wx'});
for(const [f,b]of data){const target=path.join(root,f);if(f!=='cycle.mjs'&&fs.existsSync(target))throw Error('Existing integration file; preserve before reconciliation');fs.mkdirSync(path.dirname(target),{recursive:true,mode:0o700});fs.writeFileSync(target,b,{mode:0o600});}
for(const [f,b]of data){const row={path:f,sha256:createHash('sha256').update(b).digest('hex')},i=manifest.files.findIndex(x=>x.path===f);if(i<0)manifest.files.push(row);else manifest.files[i]=row;}
fs.writeFileSync(root+'/package-manifest.json',JSON.stringify(manifest,null,2)+'\n',{mode:0o600});
for(const f of manifest.files)if(createHash('sha256').update(read(path.join(root,f.path))).digest('hex')!==f.sha256)throw Error('Installed package mismatch; retain standby');
console.log(JSON.stringify({installed:true,learningEnabled:false,existingTimerPreserved:true,backup,at:new Date().toISOString()}));
