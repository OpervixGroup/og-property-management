// Candidate only: app/api/platform/autonomy/private-worker/route.ts
import {privateMailWorkerBridge} from '@/lib/private-mail-worker.mjs';
import {clientLearningBridge} from '@/lib/client-learning.mjs';
import {admin} from '@/lib/server/supabase';
import {durableStore} from '@/lib/task-coordinator-store.mjs';
import {privateWorkerBridge,privateWorkerHTTP} from '@/lib/private-worker-http.mjs';
import {workerAuthObserver,boundedWorkerAuthLogger} from '@/lib/worker-auth-diagnostic.mjs';
const authLog=boundedWorkerAuthLogger((entry:{reason:string})=>console.warn('[private-worker-auth] '+entry.reason));
export const dynamic='force-dynamic';
export const runtime='nodejs';
export async function POST(request:Request){
 workerAuthObserver(process.env.OG_PRIVATE_WORKER_SECRET,request,authLog);
 const execute=async(operation:string,input:unknown)=>{
  const client=admin();
  const bridge=operation.startsWith('learning')?clientLearningBridge:operation.startsWith('mail')?privateMailWorkerBridge:privateWorkerBridge;
  return bridge({store:durableStore(client),read:async()=>{const r=await client.rpc('og_coordinator_read');if(r.error||!r.data?.state)throw Error('Unavailable');return r.data.state;}})(operation,input);
 };
 return privateWorkerHTTP({secret:process.env.OG_PRIVATE_WORKER_SECRET,execute})(request);
}

