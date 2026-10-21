import {timingSafeEqual} from 'node:crypto';
import {readyTask} from './department-functions.mjs';
export function verifiedWorker(request,secret){const value=request.headers.get('authorization')||'';if(typeof secret!=='string'||secret.length<32)return false;const expected=Buffer.from('Bearer '+secret),actual=Buffer.from(value);return actual.length===expected.length&&timingSafeEqual(actual,expected);}
export function workerHTTP({secret,read,execute}){return async request=>{
 if(!verifiedWorker(request,secret))return Response.json({error:'Worker authorization required'},{status:403});
 try{const text=await request.text();if(text.length>1000||text.trim()&&text.trim()!=='{}')return Response.json({error:'No arbitrary task payload accepted'},{status:400});
  const state=await read();if(!state?.control||!state.tasks)throw Error('Unavailable');if(state.control.paused)return Response.json({status:'Paused'});
  const task=Object.values(state.tasks).find(t=>t.plan?.handlerKey!=='private-codex-draft-v1'&&readyTask(t)&&!state.control.roles[t.plan.agentId]?.paused);
  if(!task)return Response.json({status:'No executable task'});
  const result=await execute(task);return Response.json({taskId:task.plan.id,status:result.status});
 }catch{return Response.json({error:'Execution not confirmed; reconcile task state before retry'},{status:503});}
};}

