import 'server-only';
import {timingSafeEqual} from 'node:crypto';
import {staff} from '@/lib/ai-workforce';
import {admin} from './supabase';

export const workforceStatuses=['Working','Completed','Blocked','Failed'] as const;
type WorkforceStatus=(typeof workforceStatuses)[number];
export type WorkforceRun={id:string;agentId:string;office:string;role:string;task:string;status:WorkforceStatus;result:string;startedAt:string;finishedAt:string};
export type WorkforceMessage={id:string;office:string;sender:string;recipient:string;kind:string;text:string;recordedAt:string;taskId:string};
const clean=(value:unknown,max:number)=>typeof value==='string'?value.trim().slice(0,max):'';
const iso=(value:unknown,required=true)=>{const text=clean(value,40);if((required||text)&&!Number.isFinite(Date.parse(text)))throw Error('Invalid event timestamp');return text;};
const roleById=new Map(staff.map(person=>[person.id,person]));

export function verifyWorkforceSecret(request:Request){
 const secret=process.env.OG_WORKFORCE_INGEST_SECRET,auth=request.headers.get('authorization')??'';
 if(!secret||secret.length<32)throw Error('Cloud workforce ingestion is not configured');
 const supplied=Buffer.from(auth),expected=Buffer.from('Bearer '+secret);
 if(supplied.length!==expected.length||!timingSafeEqual(supplied,expected))throw Error('Access denied');
}

export function parseRun(value:unknown):WorkforceRun{
 if(!value||typeof value!=='object')throw Error('Invalid workforce event');
 const item=value as Record<string,unknown>,id=clean(item.id,100),agentId=clean(item.agentId,100),profile=roleById.get(agentId),status=clean(item.status,20) as WorkforceStatus;
 if(!id||!profile||!workforceStatuses.includes(status))throw Error('Use a registered role ID and valid status');
 const task=clean(item.task,1000),result=clean(item.result,2000),startedAt=iso(item.startedAt),finishedAt=iso(item.finishedAt,false);
 if(!task||status!=='Working'&&!finishedAt)throw Error('Task and completion timestamp are required');
 return {id,agentId,office:profile.office,role:profile.role,task,status,result,startedAt,finishedAt};
}

export function parseMessage(value:unknown):WorkforceMessage{
 if(!value||typeof value!=='object')throw Error('Invalid workforce message');
 const item=value as Record<string,unknown>,id=clean(item.id,100),senderId=clean(item.senderId,100),recipientId=clean(item.recipientId,100),sender=roleById.get(senderId),recipient=roleById.get(recipientId),text=clean(item.text,4000);
 if(!id||!sender||!recipient||!text)throw Error('Use registered sender and recipient role IDs');
 return {id,office:sender.office,sender:sender.name,recipient:recipient.name,kind:clean(item.kind,50)||'Update',text,recordedAt:iso(item.recordedAt),taskId:clean(item.taskId,100)};
}

export async function workforceFeed(){
 const db=admin(),[runsResult,messagesResult]=await Promise.all([
  db.from('og_workforce_runs').select('external_id,agent_id,office,role,task,status,result,started_at,finished_at').order('started_at',{ascending:false}).limit(300),
  db.from('og_workforce_messages').select('external_id,office,sender,recipient,kind,text,recorded_at,task_id').order('recorded_at',{ascending:false}).limit(300)
 ]);
 if(runsResult.error||messagesResult.error)throw Error('Cloud workforce storage unavailable');
 const runs=(runsResult.data??[]).reverse().map(row=>({id:row.external_id,agentId:row.agent_id,office:row.office,role:row.role,task:row.task,status:row.status,result:row.result??'',startedAt:row.started_at,finishedAt:row.finished_at??''}));
 const messages=(messagesResult.data??[]).reverse().map(row=>({id:row.external_id,office:row.office,sender:row.sender,recipient:row.recipient,kind:row.kind,text:row.text,recordedAt:row.recorded_at,taskId:row.task_id??''}));
 const latest=[...runs.map(x=>x.finishedAt||x.startedAt),...messages.map(x=>x.recordedAt)].sort().at(-1)??new Date().toISOString();
 return {connected:true,updatedAt:latest,runs,messages};
}

export async function recordWorkforce(input:{runs?:unknown[];messages?:unknown[]}){
 const runs=(input.runs??[]).map(parseRun),messages=(input.messages??[]).map(parseMessage);
 if(!runs.length&&!messages.length||runs.length>50||messages.length>50)throw Error('Submit 1–50 workforce records');
 const db=admin();
 if(runs.length){const saved=await db.from('og_workforce_runs').upsert(runs.map(item=>({external_id:item.id,agent_id:item.agentId,office:item.office,role:item.role,task:item.task,status:item.status,result:item.result,started_at:item.startedAt,finished_at:item.finishedAt||null,updated_at:new Date().toISOString()})),{onConflict:'external_id'});if(saved.error)throw Error('Workforce run was not recorded');}
 if(messages.length){const saved=await db.from('og_workforce_messages').upsert(messages.map(item=>({external_id:item.id,office:item.office,sender:item.sender,recipient:item.recipient,kind:item.kind,text:item.text,recorded_at:item.recordedAt,task_id:item.taskId||null})),{onConflict:'external_id'});if(saved.error)throw Error('Workforce message was not recorded');}
 return {accepted:runs.length+messages.length,runs:runs.length,messages:messages.length};
}
