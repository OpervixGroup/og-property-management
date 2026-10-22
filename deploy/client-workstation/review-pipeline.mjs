import {createHash} from 'node:crypto';
export const digest=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const desks=new Set(['devonshire-leasing','devonshire-hoa']);
function assertCheckpoint(c,task,at){
 const age=Date.parse(at)-Date.parse(c?.verifiedAt);
 const p=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:'America/Chicago',weekday:'short',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(at)).map(x=>[x.type,x.value]));
 const minutes=Number(p.hour)*60+Number(p.minute);
 if(['Sat','Sun'].includes(p.weekday)||minutes<510||minutes>=930)throw Error('Outside client service hours');
 if(!Number.isFinite(age)||age<0||age>90000||c.clientId!==task.clientId||c.taskId!==task.id||c.epoch!==task.epoch||c.leaseToken!==task.leaseToken||c.corporatePaused!==false||c.deskPaused!==false||c.rolePaused!==false||c.calendarVerified!==true||c.windowOpen!==true||c.executionOwner!=='digitalocean-corporate-v1'||Date.parse(c.leaseUntil)<=Date.parse(at)||!Number.isFinite(Date.parse(c.leaseUntil)))throw Error('Fresh exact coordinator checkpoint required');
}
/** Candidate protocol, not a connection or scheduler. Adapters must use real authenticated receipts. */
export async function reviewPipeline({task,coordinator,source,chatgpt,claude,storage,clock=()=>new Date().toISOString()}={}){
 if(!task||!desks.has(task.clientId)||typeof task.id!=='string'||!task.id||!Number.isSafeInteger(task.epoch)||task.epoch<0||typeof task.leaseToken!=='string'||!task.leaseToken||typeof task.sourceId!=='string'||!task.sourceId||typeof task.folderId!=='string'||!task.folderId||task.type!=='procedure_proposal'||task.scope!=='bounded-procedure-excerpts'||task.providers?.openai!==true||task.providers?.anthropic!==true)throw Error('Exact client task and approved provider data flow required');
 for(const [adapter,methods] of [[coordinator,['checkpoint','prepare','saved','finish','hold']],[source,['read']],[chatgpt,['draft']],[claude,['review']],[storage,['save','readback']]])if(methods.some(m=>typeof adapter?.[m]!=='function'))throw Error('Verified adapters are required; desktop apps alone are insufficient');
 let intent=null;
 const check=async()=>{const at=clock();assertCheckpoint(await coordinator.checkpoint(task),task,at);};
 try{
  await check();const original=await source.read(task);if(original.clientId!==task.clientId||original.sourceId!==task.sourceId||typeof original.version!=='string'||!original.version||typeof original.text!=='string'||!original.text.trim()||original.text.length>16000)throw Error('Exact bounded client source required');
  const sourceDigest=digest(original);
  await check();const draft=await chatgpt.draft({clientId:task.clientId,taskId:task.id,source:original,sourceDigest});
  if(draft.clientId!==task.clientId||draft.sourceDigest!==sourceDigest||typeof draft.text!=='string'||!draft.text.trim()||draft.text.length>20000)throw Error('Exact proposed draft required');
  await check();const review=await claude.review({clientId:task.clientId,taskId:task.id,source:original,draft,sourceDigest});
  const artifactDigest=digest(draft);
  if(review.verdict!=='Pass'||review.clientId!==task.clientId||review.artifactDigest!==artifactDigest||typeof review.evidence!=='string'||!review.evidence||review.reviewMode!=='separate AI assessment')throw Error('Exact Claude assessment required; no automatic acceptance');
  await check();intent=await coordinator.prepare({task,sourceDigest,artifactDigest,review});
  if(intent?.state!=='Prepared'||intent.clientId!==task.clientId||intent.taskId!==task.id||intent.folderId!==task.folderId||intent.artifactDigest!==artifactDigest||typeof intent.intentId!=='string'||!intent.intentId)throw Error('Durable exact save intent required');
  await check();const receipt=await storage.save({task,draft,intent});
  if(receipt.clientId!==task.clientId||receipt.folderId!==task.folderId||receipt.artifactDigest!==artifactDigest||typeof receipt.itemId!=='string'||!receipt.itemId)throw Error('Exact save receipt required');
  await coordinator.saved({task,intent,receipt});
  await check();const persisted=await storage.readback({task,receipt});
  if(persisted.clientId!==task.clientId||persisted.itemId!==receipt.itemId||persisted.folderId!==task.folderId||digest(persisted.draft)!==artifactDigest)throw Error('Stored proposed lesson readback mismatch');
  await check();const result=await coordinator.finish({task,intent,receipt,sourceDigest,artifactDigest,review,readbackVerified:true,disposition:'Proposed lesson; human procedure approval remains required'});
  if(result?.status!=='Completed'||result.clientId!==task.clientId||result.taskId!==task.id)throw Error('Final coordinator receipt required');
  return result;
 }catch(error){try{await coordinator.hold({task,intentId:intent?.intentId??null,reason:'Pipeline acceptance failed; reconcile exact evidence; never repeat an uncertain save'});}catch{}throw error;}
}
