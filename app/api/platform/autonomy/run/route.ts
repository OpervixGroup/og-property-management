import {internalFunctions,executorRoles} from '@/lib/department-functions.mjs';
import {admin} from '@/lib/server/supabase';
import {coordinator} from '@/lib/task-coordinator.mjs';
import {durableStore} from '@/lib/task-coordinator-store.mjs';
import {runOne} from '@/lib/task-coordinator-runner.mjs';
import {workerHTTP} from '@/lib/task-coordinator-worker-http.mjs';
export const runtime='nodejs';
export async function POST(request:Request){return workerHTTP({secret:process.env.OG_WORKFORCE_INGEST_SECRET,read:async()=>{const r=await admin().rpc('og_coordinator_read');if(r.error)throw Error('Unavailable');return r.data.state;},execute:async(task:{plan:{id:string}})=>{
 const core=coordinator({store:durableStore(admin()),roles:executorRoles,authorityRefs:['corporate-internal-reviewed-v1'],verifyCEO:async()=>false});
 return runOne({coordinator:core,id:task.plan.id,worker:'existing-cloud-control-cycle',handlers:{[task.plan.id]:async({checkpoint}:{checkpoint:()=>Promise<unknown>})=>{
  if((task as {plan:{id:string;handlerKey?:string}}).plan.handlerKey!=='og-headquarters-access-v1')return internalFunctions({read:async()=>{const r=await admin().rpc('og_coordinator_read');if(r.error)throw Error('Unavailable');return r.data.state;}})(task,{checkpoint});
  await checkpoint();const hq=await fetch('https://og.opervixgroup.com/platform/headquarters',{redirect:'follow',cache:'no-store',signal:AbortSignal.timeout(10000)});await hq.body?.cancel();await checkpoint();
  const feed=await fetch('https://og.opervixgroup.com/api/platform/workforce',{redirect:'manual',cache:'no-store',signal:AbortSignal.timeout(10000)});await feed.body?.cancel();await checkpoint();
  if(hq.status!==200||feed.status!==401)throw Error('Access acceptance failed; reconcile persisted task');
  return{result:`HTTP/login availability ${hq.status}; anonymous feed denied ${feed.status}. This checks access controls only, not company/client task readiness.`,evidence:`https://og.opervixgroup.com/platform/headquarters; https://og.opervixgroup.com/api/platform/workforce; checked ${new Date().toISOString()}`};
 }}});
}})(request);}
