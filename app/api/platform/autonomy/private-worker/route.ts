// Candidate only: app/api/platform/autonomy/private-worker/route.ts
import {admin} from '@/lib/server/supabase';
import {durableStore} from '@/lib/task-coordinator-store.mjs';
import {privateWorkerBridge,privateWorkerHTTP} from '@/lib/private-worker-http.mjs';
import {workerAuthObserver,boundedWorkerAuthLogger} from '@/lib/worker-auth-diagnostic.mjs';
const authLog=boundedWorkerAuthLogger((entry:unknown)=>console.warn(JSON.stringify(entry)));
export const dynamic='force-dynamic';
export const runtime='nodejs';
export async function POST(request:Request){
 workerAuthObserver(process.env.OG_PRIVATE_WORKER_SECRET,request,authLog);
 const execute=async(operation:string,input:unknown)=>{
  const client=admin();
  return privateWorkerBridge({store:durableStore(client),read:async()=>{const r=await client.rpc('og_coordinator_read');if(r.error||!r.data?.state)throw Error('Unavailable');return r.data.state;}})(operation,input);
 };
 return privateWorkerHTTP({secret:process.env.OG_PRIVATE_WORKER_SECRET,execute})(request);
}
