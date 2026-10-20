import {departmentReadiness} from './department-readiness.mjs';
import {progressSnapshot} from './task-coordinator-progress.mjs';
const headers={'Cache-Control':'private, no-store'};
export function controlHTTP({authenticate,isCEO,origin,read,change}){
 const authorized=async request=>{const actor=await authenticate(request);return actor&&await isCEO(actor)?actor:null;};
 return {
  async GET(request){try{if(!await authorized(request))return Response.json({error:'CEO access required'},{status:403,headers});const row=await read();if(!row?.control)throw Error();const tasks=Object.values(row.tasks||{}).map(t=>({id:String(t.plan?.id||""),agentId:String(t.plan?.agentId||""),status:String(t.status||"Unknown"),artifact:t.outcome?.artifact||null,result:String(t.outcome?.result||"").slice(0,1000)}));return Response.json({control:row.control,tasks,readiness:departmentReadiness(),progress:progressSnapshot({...row,events:row.events||[]}),connected:true},{headers});}catch{return Response.json({error:'Control store unavailable; hold execution',connected:false},{status:503,headers});}},
  async POST(request){try{
   const actor=await authorized(request);if(!actor)return Response.json({error:'CEO access required'},{status:403,headers});
   if(!origin||request.headers.get('origin')!==new URL(origin).origin)return Response.json({error:'Invalid origin'},{status:403,headers});
   const text=await request.text();if(text.length>4000)throw Error('Invalid input');const p=JSON.parse(text);
   if(typeof p.paused!=='boolean'||typeof p.evidence!=='string'||!p.evidence.trim()||p.evidence.length>2000||p.agentId!==undefined&&typeof p.agentId!=='string'||Object.keys(p).some(k=>!['paused','evidence','agentId'].includes(k)))throw Error('Invalid input');
   const control=await change(p,actor);return Response.json({control,connected:true},{headers});
  }catch{return Response.json({error:'Control change not confirmed; reload state before retry'},{status:503,headers});}}
 };
}
