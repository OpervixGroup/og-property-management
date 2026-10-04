import {getChatGPTUser} from '@/app/chatgpt-auth';
import {access,sameOrigin,body} from '@/lib/server/request';
import {load,save} from '@/lib/storage';
import {requestRecordAction,reviewRecordRequest,changeRecordState,withdrawRecordRequest,visibleRequests,recordState,allowedCollections,type ControlCollection} from '@/lib/workflow-controls';
import {managers,scopedUnits} from '@/lib/access-policy';
const roles=['Global Admin','Management','Analyst / Agent','Maintenance','Accounting Clerk'];
export async function GET(){try{const u=access(await getChatGPTUser(),roles),s=await load(u.userId),units=new Set(scopedUnits(u.member,s.data).map(x=>x.id));const records=allowedCollections(u.member).flatMap(collection=>(s.data.operations?.[collection]??[]).filter(r=>managers(u.role)||units.has(r.unitId)).map(r=>({collection,id:r.id,unitId:r.unitId,label:'number' in r?r.number+' · '+r.title:'title' in r?r.title:'subject' in r?r.subject:r.name,state:recordState(s.data,collection,r.id)})));return Response.json({revision:s.revision,requests:visibleRequests(s.data,u.member),records,canReview:managers(u.role)},{headers:{'Cache-Control':'private, no-store'}});}catch{return Response.json({error:'Approval access denied or records unavailable'},{status:403});}}
export async function POST(request:Request){try{sameOrigin(request);const u=access(await getChatGPTUser(),roles),p=await body(request,10000);if(!Number.isSafeInteger(p.revision)||typeof p.operation!=='string'||!p.operation||p.operation.length>100)throw Error('Invalid save request');const old=await load(u.userId,p.operation);if(old.operationApplied)return Response.json({ok:true,revision:old.revision});if(p.revision!==old.revision)throw Error('CONFLICT: Records changed. Refresh before reviewing.');const next=structuredClone(old.data);let status:string|undefined;
 if(p.action==='request')status=requestRecordAction(next,u.member,p.collection as ControlCollection,p.recordId,p.state,p.reason).status;
 else if(p.action==='review')status=reviewRecordRequest(next,u.member,p.requestId,p.decision,p.comment).status;
 else if(p.action==='state')changeRecordState(next,u.member,p.collection,p.recordId,p.state);
 else if(p.action==='withdraw')withdrawRecordRequest(next,u.member,p.requestId);
 else throw Error('Invalid approval action');const result=await save(u.userId,p.revision,p.operation,next);return Response.json({ok:true,revision:result.revision,status});
 }catch(e){const message=e instanceof Error?e.message:'Approval failed';return Response.json({error:message},{status:message.startsWith('CONFLICT')?409:400});}}
