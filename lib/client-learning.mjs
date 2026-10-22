import {createHash,randomUUID} from 'node:crypto';
const plain=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const canonical=v=>Array.isArray(v)?v.map(canonical):plain(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
export const learningDigest=v=>createHash('sha256').update(JSON.stringify(canonical(v))).digest('hex');
const ids=['devonshire-leasing','devonshire-hoa'],reviewRoles=['legal-lead','risk','audit','knowledge'];
const hex=s=>typeof s==='string'&&/^[a-f0-9]{64}$/.test(s);
const text=(s,n=1000)=>typeof s==='string'&&s.trim().length>0&&s.length<=n&&!s.includes('\0');
const uuid=s=>typeof s==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(s);
const exact=(p,keys)=>{if(!plain(p)||Object.keys(p).some(k=>!keys.includes(k))||keys.some(k=>!Object.hasOwn(p,k)))throw Error('Exact learning payload required');};
export function clientLearningWindow(calendar,at=new Date().toISOString()){
 if(!Number.isFinite(Date.parse(at)))return {open:false,reason:'Invalid clock'};
 const p=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:'America/Chicago',weekday:'short',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(at)).map(x=>[x.type,x.value]));
 const day=`${p.year}-${p.month}-${p.day}`,minutes=Number(p.hour)*60+Number(p.minute),hold=reason=>({open:false,reason,day});
 if(!calendar||calendar.timezone!=='America/Chicago'||calendar.state!=='TX'||calendar.holidayCalendarVerified!==true||!text(calendar.tenantId)||!text(calendar.identityEvidence,4000)||!Array.isArray(calendar.calendarSources)||!calendar.calendarSources.some(s=>s.kind==='federal'&&/^https:\/\//.test(s.url))||!calendar.calendarSources.some(s=>s.kind==='state'&&s.state==='TX'&&/^https:\/\//.test(s.url)))return hold('Verified client identity and calendar required');
 const valid=d=>typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d)&&Number.isFinite(Date.parse(d))&&new Date(d).toISOString().slice(0,10)===d;
 if(!valid(calendar.calendarValidFrom)||!valid(calendar.calendarValidThrough)||calendar.calendarValidFrom>calendar.calendarValidThrough||!Array.isArray(calendar.observedHolidays)||!calendar.observedHolidays.length||calendar.observedHolidays.some(h=>!valid(h.date)))return hold('Invalid client calendar');
 if(day<calendar.calendarValidFrom||day>calendar.calendarValidThrough)return hold('Client calendar coverage expired or not yet valid');
 if(['Sat','Sun'].includes(p.weekday))return hold('Weekend');
 if(minutes<510||minutes>=930)return hold('Outside client service hours');
 if(calendar.observedHolidays.some(h=>h.date===day))return hold('Client holiday closure');
 return {open:true,day,reason:'Client service window open'};
}
function registration(s,id){
 if(!plain(s?.control)||typeof s.control.paused!=='boolean'||!Number.isSafeInteger(s.control.epoch)||s.control.epoch<0||!plain(s.control.roles)||s.control.executionOwner!=='digitalocean-corporate-v1')throw Error('Verified cloud controls and execution owner required');
 const l=s.clientLearning,c=l?.clients?.[id];
 if(!ids.includes(id)||l?.version!==1||l.authorityRef!=='ceo-client-procedure-learning-20261021'||!plain(c)||c.id!==id||typeof c.enabled!=='boolean'||typeof c.paused!=='boolean'||c.roleId!==(id==='devonshire-hoa'?'hoa-community-manager':'leasing-property-manager')||!plain(c.sharepoint)||!Array.isArray(c.sources)||!c.sources.length||c.sources.length>2||c.sources.some(x=>!text(x.itemId)||!text(x.id))||!plain(l.runs))throw Error('Approved client learning registry required');
 if(c.sharepoint.appId!=='connector_1e4f6a44acf14e3ca1d96672f8c945bc'||c.sharepoint.hostname!=='devonshirecondos.sharepoint.com'||c.sharepoint.sitePath!==(id==='devonshire-hoa'?'/sites/DevonshireHOA':'/sites/devonshireLeasing')||!text(c.sharepoint.siteId)||!text(c.sharepoint.driveId)||!text(c.sharepoint.reportFolderId)||!text(c.sharepoint.linkId))throw Error('Exact registered SharePoint client destination required');
 return {l,c};
}
function allowed(s,id,at,role='knowledge'){
 const {l,c}=registration(s,id),window=clientLearningWindow(c.calendar,at);
 for(const r of reviewRoles){const p=s.control.roles[r];if(p!==undefined&&(!plain(p)||typeof p.paused!=='boolean')||p?.paused)throw Error('CEO role pause or malformed role state');}
 if(!reviewRoles.includes(role)||l.enabled!==true||l.schedulerVerified!==true||l.runtimeVerified!==true||!c.enabled||s.control.paused||c.paused||c.rolePaused!==false||!window.open)throw Error('Client learning held by activation, pause or calendar');
 return {l,c,window};
}
export function clientLearningStatus(s,at=new Date().toISOString()){
 return {connected:true,checkedAt:at,clients:Object.fromEntries(ids.map(id=>{
  try{const {l,c}=registration(s,id),window=clientLearningWindow(c.calendar,at),runs=Object.values(l.runs).filter(r=>r.clientId===id),last=runs.filter(r=>r.status==='Completed').sort((a,b)=>Date.parse(b.finishedAt)-Date.parse(a.finishedAt))[0],held=runs.find(r=>['Working','Prepared','Saved','Held','Recovering'].includes(r.status));let permitted=false;try{allowed(s,id,at);permitted=true;}catch{}
   const enabled=l.enabled===true&&c.enabled&&l.schedulerVerified===true&&l.runtimeVerified===true;
   return [id,{enabled,paused:s.control.paused||c.paused||c.rolePaused||reviewRoles.some(r=>s.control.roles[r]?.paused===true),windowOpen:window.open,windowReason:window.reason,permitted,roleId:c.roleId,status:held?((!Number.isFinite(Date.parse(held.until))||Date.parse(held.until)<=Date.parse(at))?'Held':held.status):(runs.some(r=>r.status==='Blocked'&&r.runId.endsWith(':'+window.day))?'Blocked':enabled?'Scheduled':'Disabled'),completedReviews:runs.filter(r=>r.status==='Completed').length,lastReviewAt:last?.finishedAt??null,knowledgeStatus:last?'Proposed lessons retained; procedure changes require approval':'Awaiting first verified learning review',schedulerVerified:l.schedulerVerified===true}];
  }catch{return [id,{enabled:false,paused:true,windowOpen:false,permitted:false,status:'Setup required',knowledgeStatus:'Verified runner configuration unavailable'}];}
 }))};
}
const leaseKeys=['clientId','runId','token','epoch','configDigest'];
const schemas={learningRead:[],learningClaim:['clientId','attemptId'],learningRecover:['clientId','runId'],learningCheckpoint:[...leaseKeys,'role'],learningPrepare:[...leaseKeys,'sourceDigest','artifactDigest','fileName','reviews'],learningSaved:[...leaseKeys,'itemId','driveId','folderId','artifactDigest'],learningFinish:[...leaseKeys,'audit'],learningHeld:[...leaseKeys,'reason']};
function checkedLease(s,input,at,role='knowledge'){
 const {l,c}=allowed(s,input.clientId,at,role),run=l.runs[input.runId];
 if(!run||run.clientId!==input.clientId||run.token!==input.token||run.epoch!==input.epoch||run.configDigest!==input.configDigest||run.epoch!==s.control.epoch||run.configDigest!==learningDigest(c)||!Number.isFinite(Date.parse(run.until))||Date.parse(run.until)<=Date.parse(at)||!['Working','Prepared','Saved','Recovering'].includes(run.status))throw Error('Learning lease, configuration or epoch changed');
 return {l,c,run};
}
export function clientLearningBridge({store,read,clock=()=>new Date().toISOString()}={}){
 if(typeof store?.transaction!=='function'||typeof read!=='function')throw Error('Durable learning store required');
 return async(operation,input)=>{
  const keys=schemas[operation];if(!keys)throw Error('Unknown learning operation');exact(input,keys);
  if(operation==='learningRead'){const s=await read();return {status:clientLearningStatus(s,clock()),registry:s.clientLearning?.version===1?structuredClone(s.clientLearning.clients):{},lastLessons:Object.fromEntries(ids.map(id=>[id,s.clientLearning?.lastLessons?.[id]??null])),recoverable:Object.values(s.clientLearning?.runs??{}).filter(r=>r.status==='Held'&&r.fileName&&r.artifactDigest).map(r=>({clientId:r.clientId,runId:r.runId,recoveryAttempts:r.recoveryAttempts??0}))};}
  if(operation==='learningCheckpoint'){checkedLease(await read(),input,clock(),input.role);return true;}
  const token=randomUUID();
  return store.transaction(s=>{
   const at=clock();if(!Number.isFinite(Date.parse(at)))throw Error('Invalid server clock');
   if(operation==='learningRecover'){
    const {l,c}=allowed(s,input.clientId,at),run=l.runs[input.runId];
    if(!run||run.clientId!==input.clientId||run.status!=='Held'||!run.fileName||!hex(run.artifactDigest)||run.configDigest!==learningDigest(c)||(run.recoveryAttempts??0)>=2)throw Error('Saved-attempt recovery requires exact unchanged client intent');
    run.priorLeases??=[];run.priorLeases.push({token:run.token,epoch:run.epoch,until:run.until});run.token=token;run.epoch=s.control.epoch;run.until=new Date(Date.parse(at)+15*60000).toISOString();run.status='Recovering';run.recoveryAttempts=(run.recoveryAttempts??0)+1;return structuredClone(run);
   }
   if(operation==='learningClaim'){
    const {l,c,window}=allowed(s,input.clientId,at);if(!uuid(input.attemptId))throw Error('Exact learning attempt required');
    const runId=input.clientId+':'+window.day,prior=l.runs[runId];if(prior?.status==='Completed'||prior?.status==='Blocked')return null;
    if(prior||Object.values(l.runs).some(r=>r.clientId===input.clientId&&['Working','Prepared','Saved','Held','Recovering'].includes(r.status)))throw Error('Previous client attempt requires reconciliation');
    const run={runId,clientId:input.clientId,roleId:c.roleId,attemptId:input.attemptId,token,epoch:s.control.epoch,configDigest:learningDigest(c),status:'Working',startedAt:at,until:new Date(Date.parse(at)+15*60000).toISOString()};l.runs[runId]=run;return structuredClone(run);
   }
   const {l,c}=registration(s,input.clientId),run=l.runs[input.runId];
   if(!run||run.clientId!==input.clientId||run.token!==input.token||run.epoch!==input.epoch||run.configDigest!==input.configDigest)throw Error('Exact persisted learning lease required');
   if(operation==='learningHeld'){
    if(!text(input.reason,1000)||['Completed','Blocked'].includes(run.status))throw Error('Preserve terminal learning outcome');
    run.status=['Prepared','Saved','Held','Recovering'].includes(run.status)?'Held':'Blocked';run.reason=input.reason;run.stoppedAt=at;return true;
   }
   allowed(s,input.clientId,at,operation==='learningCheckpoint'?input.role:'knowledge');
   if(run.epoch!==s.control.epoch||run.configDigest!==learningDigest(c)||!Number.isFinite(Date.parse(run.until))||Date.parse(run.until)<=Date.parse(at)||!['Working','Prepared','Saved','Recovering'].includes(run.status))throw Error('Learning lease, configuration or epoch changed');
   if(operation==='learningCheckpoint')return true;
   const review=(r,role)=>plain(r)&&Object.keys(r).length===6&&Object.keys(r).every(k=>['role','verdict','artifactDigest','sourceDigest','evidence','reviewMode'].includes(k))&&r.role===role&&r.verdict==='Pass'&&r.artifactDigest===run.artifactDigest&&r.sourceDigest===run.sourceDigest&&text(r.evidence,4000)&&r.reviewMode==='same-executor AI review';
   if(operation==='learningPrepare'){
    if(run.status!=='Working'||!hex(input.sourceDigest)||!hex(input.artifactDigest)||input.fileName!==`OPERVIX-LEARNING-${input.clientId}-${input.runId.split(':')[1]}-${run.attemptId}.txt`)throw Error('Exact immutable learning save intent required');
    run.sourceDigest=input.sourceDigest;run.artifactDigest=input.artifactDigest;
    if(!plain(input.reviews)||!review(input.reviews.Legal,'Legal')||!review(input.reviews.Risk,'Risk'))throw Error('Exact Legal and Risk assessments required');
    run.fileName=input.fileName;run.reviews=structuredClone(input.reviews);run.status='Prepared';run.preparedAt=at;return true;
   }
   if(operation==='learningSaved'){
    if(!['Prepared','Recovering'].includes(run.status)||!text(input.itemId,200)||!/^[a-zA-Z0-9!_-]+$/.test(input.itemId)||input.driveId!==c.sharepoint.driveId||input.folderId!==c.sharepoint.reportFolderId||input.artifactDigest!==run.artifactDigest)throw Error('Exact client save and readback receipt required');
    run.receipt={itemId:input.itemId,driveId:input.driveId,folderId:input.folderId,artifactDigest:input.artifactDigest};run.status='Saved';run.savedAt=at;return true;
   }
   if(operation==='learningFinish'){
    if(run.status!=='Saved'||!review(input.audit,'Audit'))throw Error('Exact stored-outcome Audit required');
    run.audit=structuredClone(input.audit);run.status='Completed';run.finishedAt=at;run.lessonStatus='Proposed';l.lastLessons??={};l.lastLessons[input.clientId]={...run.receipt,clientId:input.clientId,roleId:run.roleId,sourceDigest:run.sourceDigest,at,lessonStatus:'Proposed'};return structuredClone(run);
   }
   throw Error('Unsupported learning transition');
  });
 };
}
