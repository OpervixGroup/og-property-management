import {randomUUID} from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
const clientIds=['devonshire-leasing','devonshire-hoa'];
const dataOf=r=>r?.result?.structuredContent??r?.structuredContent;
function contentOf(r){const d=dataOf(r),c=d?.content??d?.structuredContent?.content;if(typeof c!=='string'||!c.trim()||Buffer.byteLength(c)>200000)throw Error('Bounded original client source required');return c;}
const driveOf=d=>d?.parent_reference?.drive_id??d?.parentReference?.driveId;
const parentOf=d=>d?.parent_reference?.id??d?.parentReference?.id;
export function privateLearningFiles(root){
 if(!path.isAbsolute(root))throw Error('Private client context root required');
 fs.mkdirSync(root,{recursive:true,mode:0o700});if(fs.realpathSync(root)!==root)throw Error('No context symlinks');
 return (clientId,attemptId)=>{
  if(!clientIds.includes(clientId)||!/^[a-f0-9-]{36}$/.test(attemptId))throw Error('Exact client context identity required');
  const dir=path.join(root,clientId,attemptId);fs.mkdirSync(dir,{recursive:true,mode:0o700});if(fs.realpathSync(dir)!==dir)throw Error('No client context symlinks');
  const target=name=>{if(!/^[a-zA-Z0-9_.-]+$/.test(name))throw Error('Exact private filename required');return path.join(dir,name);};
  return {dir,write(name,text){if(typeof text!=='string'||Buffer.byteLength(text)>400000)throw Error('Bounded private artifact required');const file=target(name);if(fs.existsSync(file)){const s=fs.lstatSync(file);if(s.isSymbolicLink()||!s.isFile()||(s.mode&0o077)!==0||fs.readFileSync(file,'utf8')!==text)throw Error('Preserve original client artifact');return file;}fs.writeFileSync(file,text,{mode:0o600,flag:'wx'});return file;},read(name){const file=target(name),s=fs.lstatSync(file);if(s.isSymbolicLink()||!s.isFile()||(s.mode&0o077)!==0||s.size>400000)throw Error('Private original client artifact required');return fs.readFileSync(file,'utf8');}};
 };
}
export async function learningCycle({api,app,model,filesFor,digest,clock=()=>new Date(),signal,deadline=Date.now()+12*60000}={}){
 if([api,app,model,filesFor,digest].some(f=>typeof f!=='function'))throw Error('Explicit learning dependencies required');
 if(signal?.aborted||clock().getTime()>=deadline)return {status:'Standby',reason:'No learning runtime capacity'};
 let snapshot;try{snapshot=await api('learningRead',{});}catch{return {status:'Held',reason:'Learning controller unavailable; no client effect attempted'};}let run=null,c=null,files=null;
 const available=id=>snapshot.status?.clients?.[id]?.enabled===true&&snapshot.status.clients[id].permitted===true;
 const recovery=snapshot.recoverable?.find(r=>available(r.clientId)&&r.recoveryAttempts<2);
 try{
  if(recovery){run=await api('learningRecover',{clientId:recovery.clientId,runId:recovery.runId});c=snapshot.registry[run.clientId];}
  else for(const clientId of clientIds){if(!available(clientId))continue;run=await api('learningClaim',{clientId,attemptId:randomUUID()});if(run){c=snapshot.registry[clientId];break;}}
  if(!run)return {status:'Standby',reason:'No eligible uncompleted client learning review'};
  const base={clientId:run.clientId,runId:run.runId,token:run.token,epoch:run.epoch,configDigest:run.configDigest};
  const check=async(role='knowledge')=>{if(signal?.aborted||clock().getTime()>=deadline)throw Error('Learning canceled or runtime capacity exhausted');return await api('learningCheckpoint',{...base,role})===true;};
  const native=async(action,args)=>{await check();return app({appId:c.sharepoint.appId,action,args,authorize:()=>check(),signal});};
  const sp=c.sharepoint,graph=itemId=>'https://graph.microsoft.com/v1.0/drives/'+encodeURIComponent(sp.driveId)+'/items/'+encodeURIComponent(itemId);
  const fetched=async itemId=>contentOf(await native('fetch',{link_id:sp.linkId,url:graph(itemId)}));
  const site=dataOf(await native('get_site',{link_id:sp.linkId,hostname:sp.hostname,site_path:sp.sitePath}));if(site?.id!==sp.siteId)throw Error('Current exact client site identity not confirmed');
  const folder=dataOf(await native('get_drive_item',{link_id:sp.linkId,drive_id:sp.driveId,item_id:sp.reportFolderId}));if(folder?.id!==sp.reportFolderId||driveOf(folder)!==sp.driveId||!folder.folder)throw Error('Current exact client output folder not confirmed');
  files=filesFor(run.clientId,run.attemptId);
  const excerpts=sources=>sources.map(s=>({itemId:s.itemId,sourceExcerpt:s.content.slice(0,Math.floor(48000/sources.length)),excerptOnly:true}));
  let source,artifact,artifactText,itemId;
  if(recovery){
   source=JSON.parse(files.read('source.json'));artifactText=files.read('lesson.txt');artifact=JSON.parse(artifactText);
   if(source.clientId!==run.clientId||source.roleId!==c.roleId||digest(source.sources)!==run.sourceDigest||digest(artifactText.trim())!==run.artifactDigest||artifact.clientId!==run.clientId||artifact.roleId!==c.roleId)throw Error('Original client recovery evidence mismatch');
   const listed=dataOf(await native('list_folder_items',{link_id:sp.linkId,hostname:sp.hostname,site_path:sp.sitePath,folder_path:sp.reportFolderPath,top:200}));
   const matches=Array.isArray(listed?.value)?listed.value.filter(x=>x.name===run.fileName):[];
   if(matches.length!==1||typeof matches[0].id!=='string')throw Error('Exact prior saved file not found; no resend permitted');itemId=matches[0].id;
  }else{
   source={clientId:run.clientId,roleId:c.roleId,sources:[]};for(const s of c.sources)source.sources.push({id:s.id,itemId:s.itemId,content:await fetched(s.itemId)});
   files.write('source.json',JSON.stringify(source));
   let prior=null;const last=snapshot.lastLessons?.[run.clientId];
   if(last){if(last.clientId!==run.clientId||last.roleId!==c.roleId||last.driveId!==sp.driveId||last.folderId!==sp.reportFolderId)throw Error('Prior client lesson identity mismatch');const oldText=await fetched(last.itemId);if(digest(oldText.trim())!==last.artifactDigest)throw Error('Prior lesson version changed; review before reuse');const old=JSON.parse(oldText);if(old.clientId!==run.clientId||old.roleId!==c.roleId||old.status!=='Proposed')throw Error('Prior retained lesson mismatch');prior={proposal:old.proposal,status:'Proposed; never approved operating instructions'};}
   const result=await model('Learn',{clientId:run.clientId,roleId:c.roleId,sources:excerpts(source.sources),priorLesson:prior,scope:'Procedure-source learning only; no financial, housing, CRM or messaging actions'},{checkpoint:check,dir:files.dir,signal});
   const proposal=result.output;
   if(proposal?.verdict!=='Ready'||typeof proposal.observedWorkflow!=='string'||!proposal.observedWorkflow.trim()||proposal.observedWorkflow.length>1500||typeof proposal.proposedImprovement!=='string'||!proposal.proposedImprovement.trim()||proposal.proposedImprovement.length>2000||typeof proposal.sourceQuote!=='string'||proposal.sourceQuote.length<20||proposal.sourceQuote.length>500||!source.sources.some(s=>s.content.includes(proposal.sourceQuote))||typeof proposal.changeFromPrior!=='string'||proposal.changeFromPrior.length>1000)throw Error('Source-backed bounded learning proposal not confirmed');
   artifact={version:1,clientId:run.clientId,roleId:c.roleId,status:'Proposed',humanApprovalRequired:true,createdAt:clock().toISOString(),sourceDigest:digest(source.sources),priorArtifactDigest:last?.artifactDigest??null,sourceReferences:source.sources.map(s=>({itemId:s.itemId,contentDigest:digest(s.content)})),proposal,reviewNote:'Exact Legal/Risk and stored-outcome Audit assessments are retained in protected run records. A proposed lesson does not authorize a business action.'};
   artifactText=JSON.stringify(artifact,null,2)+'\n';run.sourceDigest=artifact.sourceDigest;run.artifactDigest=digest(artifactText.trim());run.fileName=`OPERVIX-LEARNING-${run.clientId}-${run.runId.split(':')[1]}-${run.attemptId}.txt`;
   files.write('lesson.txt',artifactText);
   const reviews={};for(const role of ['Legal','Risk']){const assessment=await model(role,{artifact,sources:excerpts(source.sources),acceptance:'Exact registered client, source quote, proposed-only scope, private same-client destination, zero financial/housing decisions, no cross-entity use, no sending, no new access and no approved procedure changes'},{checkpoint:check,dir:files.dir,signal});if(assessment.output?.verdict!=='Pass')throw Error('Exact client proposal assessment blocked');reviews[role]={role,verdict:'Pass',artifactDigest:run.artifactDigest,sourceDigest:run.sourceDigest,evidence:assessment.evidence,reviewMode:'same-executor AI review'};}
   await check();await api('learningPrepare',{...base,sourceDigest:run.sourceDigest,artifactDigest:run.artifactDigest,fileName:run.fileName,reviews});
   const receipt=dataOf(await native('upload_file_to_folder',{link_id:sp.linkId,drive_id:sp.driveId,parent_folder_id:sp.reportFolderId,file_name:run.fileName,file_uri:files.write('lesson.txt',artifactText),mime_type:'text/plain'}));
   if(typeof receipt?.id!=='string'||driveOf(receipt)!==sp.driveId||parentOf(receipt)!==sp.reportFolderId)throw Error('Exact learning save receipt not confirmed');itemId=receipt.id;
  }
  const item=dataOf(await native('get_drive_item',{link_id:sp.linkId,drive_id:sp.driveId,item_id:itemId}));if(item?.id!==itemId||driveOf(item)!==sp.driveId||parentOf(item)!==sp.reportFolderId)throw Error('Saved client folder identity mismatch');
  const actualText=await fetched(itemId);if(digest(actualText.trim())!==run.artifactDigest)throw Error('Actual saved lesson content not confirmed');
  await api('learningSaved',{...base,itemId,driveId:sp.driveId,folderId:sp.reportFolderId,artifactDigest:run.artifactDigest});
  const assessment=await model('Audit',{expected:artifact,actual:JSON.parse(actualText),sources:excerpts(source.sources),acceptance:'The actual saved client document matches the exact proposal and original source quote. Review is proposed knowledge only, not accepted SOP changes or business work completed.'},{checkpoint:check,dir:files.dir,signal});if(assessment.output?.verdict!=='Pass')throw Error('Stored client lesson Audit blocked');
  const audit={role:'Audit',verdict:'Pass',artifactDigest:run.artifactDigest,sourceDigest:run.sourceDigest,evidence:assessment.evidence,reviewMode:'same-executor AI review'};
  await api('learningFinish',{...base,audit});return {status:'Completed',clientId:run.clientId,runId:run.runId,lessonStatus:'Proposed',recovered:!!recovery};
 }catch{
  if(run){try{await api('learningHeld',{clientId:run.clientId,runId:run.runId,token:run.token,epoch:run.epoch,configDigest:run.configDigest,reason:'Learning source, controls, model review or saved-content acceptance not confirmed. Preserve original files; no automatic resend.'});}catch{}}
  return {status:'Held',clientId:run?.clientId??null,reason:'Reconcile the protected client learning attempt; no automatic resend'};
 }
}
