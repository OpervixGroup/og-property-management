import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const dir=path.dirname(fileURLToPath(import.meta.url));
const reportDir=path.join(dir,'local-state');fs.mkdirSync(reportDir,{recursive:true});
function discover(name){
 const lookup=spawnSync(process.platform==='win32'?'where.exe':'which',[name],{encoding:'utf8',timeout:10000,shell:false});
 const candidates=lookup.status===0?lookup.stdout.trim().split(/\r?\n/).filter(Boolean):[];
 const executable=candidates.find(p=>process.platform!=='win32'||/\.exe$/i.test(p));
 if(!executable)return {detected:candidates.length>0,executableVerified:false,version:null,note:candidates.length?'Command shim found; inspect the installed official CLI before execution':'CLI not found; a signed-in desktop app is a different integration'};
 const r=spawnSync(executable,['--version'],{encoding:'utf8',timeout:10000,shell:false});
 return {detected:true,executableVerified:r.status===0,version:r.status===0?r.stdout.trim().slice(0,120):null};
}
const report={version:1,at:new Date().toISOString(),host:os.hostname(),platform:process.platform,node:process.versions.node,nodeSupported:Number(process.versions.node.split('.')[0])===22,providers:{codex:discover('codex'),claude:discover('claude')},status:'Preflight only; no model, source or authentication acceptance',enabled:false,cloudOwnershipChanged:false,modelsInvoked:0,connectionsVerified:false,schedulerInstalled:false,next:'Open NEXT-ACTION.txt in the target computer chat. Establish authenticated adapters, approved provider scope and live acceptance before activation.'};
const target=path.join(reportDir,'preflight-'+Date.now()+'.json');fs.writeFileSync(target,JSON.stringify(report,null,2),{flag:'wx'});console.log(JSON.stringify(report,null,2));console.log('Local evidence: '+target);
if(!report.nodeSupported)process.exitCode=1;
