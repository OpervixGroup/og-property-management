import {createHash} from 'node:crypto';
const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
export const safetyDigest=v=>createHash('sha256').update(JSON.stringify(canonical(v))).digest('hex');
export const safetyOwner=Object.freeze({accountableRole:'risk',securityRole:'security',authorityRole:'legal-lead',testRole:'quality',outcomeRole:'audit',note:'Existing logical roles; no independent worker or human certification is implied.'});
const stages=Object.freeze({'before-source':['risk','security','legal-lead'],'before-save':['risk','security','legal-lead','quality'],'after-readback':['audit']});
const desks=new Set(['devonshire-leasing','devonshire-hoa']);
const hex=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
export async function validateSafety({request,assessments,verifyAssessment,at=new Date().toISOString()}={}){
 const now=Date.parse(at),required=stages[request?.stage];
 if(!Number.isFinite(now)||!required||request.kind!=='procedure-proposal'||!desks.has(request.clientId)||typeof request.taskId!=='string'||!request.taskId||!Number.isSafeInteger(request.epoch)||request.epoch<0||!hex(request.planDigest)||!Object.hasOwn(request,'sourceDigest')||!Object.hasOwn(request,'artifactDigest')||request.stage==='before-source'&&(request.sourceDigest!==null||request.artifactDigest!==null)||request.stage!=='before-source'&&(!hex(request.sourceDigest)||!hex(request.artifactDigest)))throw Error('Exact safety request required');
 if(!Array.isArray(assessments)||assessments.length!==required.length||new Set(assessments.map(a=>a?.roleId)).size!==required.length||typeof verifyAssessment!=='function')throw Error('Verified safety assessments required');
 const requestDigest=safetyDigest(request);
 for(const roleId of required){
  const a=assessments.find(a=>a.roleId===roleId),issued=Date.parse(a?.issuedAt),expires=Date.parse(a?.expiresAt);
  if(!a||a.verdict!=='Pass'||a.requestDigest!==requestDigest||typeof a.evidence!=='string'||!a.evidence.trim()||a.evidence.length>2000||typeof a.actorId!=='string'||!a.actorId||!['same-executor AI review','separate AI review','authorized human review'].includes(a.reviewMode)||!Number.isFinite(issued)||issued>now||now-issued>20*60000||!Number.isFinite(expires)||expires<=now||expires-issued>20*60000||await verifyAssessment(a,request)!==true)throw Error('Safety validation held: '+roleId);
 }
 return {status:'Validated',requestDigest,roles:[...required],scope:'Only this exact stage and proposal; no business action, access grant, policy promotion or publication is authorized.'};
}
