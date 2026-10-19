import {readFile,stat} from 'node:fs/promises';
import {platformOwner} from '@/lib/server/platform';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'private, no-store'};
export async function GET(){
 if(!await platformOwner())return Response.json({error:'Unauthorized'},{status:401,headers});
 // A trusted executor must maintain this private file outside the web root and repository.
 const file=process.env.OG_WORKFORCE_STATE_FILE;
 if(!file)return Response.json({connected:false,runs:[],reason:'Cloud activity feed is not configured.'},{headers});
 try{
  if((await stat(file)).size>2_000_000)throw Error('Oversized feed');
  const state=JSON.parse(await readFile(file,'utf8'));
  if(!Array.isArray(state.runs)||!Number.isFinite(Date.parse(state.updatedAt)))throw Error('Invalid feed');
  const text=(value:unknown,max=1000)=>typeof value==='string'?value.slice(0,max):'';
  const runs=state.runs.slice(-300).filter((r:any)=>r&&['Working','Completed','Blocked','Failed'].includes(r.status)).map((r:any)=>({id:text(r.id,100),agentId:text(r.agentId,100),office:text(r.office,40),role:text(r.role,150),task:text(r.task),status:r.status,result:text(r.result,2000),startedAt:text(r.startedAt,40),finishedAt:text(r.finishedAt,40)}));
  const messages=Array.isArray(state.messages)?state.messages.slice(-300).filter((m:any)=>m&&typeof m.id==='string'&&typeof m.text==='string'&&Number.isFinite(Date.parse(m.recordedAt))).map((m:any)=>({id:text(m.id,100),office:text(m.office,40),sender:text(m.sender,150),recipient:text(m.recipient,150),kind:text(m.kind,50),text:text(m.text,4000),recordedAt:text(m.recordedAt,40),taskId:text(m.taskId,100)})):[];
  return Response.json({connected:true,updatedAt:state.updatedAt,runs,messages},{headers});
 }catch{return Response.json({connected:false,runs:[],reason:'Activity feed unavailable. No current work can be verified.'},{status:503,headers});}
}