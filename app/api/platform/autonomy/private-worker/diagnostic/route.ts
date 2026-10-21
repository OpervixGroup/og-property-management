// Candidate: app/api/platform/autonomy/private-worker/diagnostic/route.ts
// Uses existing CEO identity gate. Never a worker-auth fallback.
import {platformOwner} from '@/lib/server/platform';
import {admin} from '@/lib/server/supabase';
import {durableStore} from '@/lib/task-coordinator-store.mjs';
import {privateWorkerBridge,privateWorkerHTTP,tenantId} from '@/lib/private-worker-http.mjs';
import {workerSecretFlags} from '@/lib/worker-auth-diagnostic.mjs';
export const dynamic='force-dynamic';
export const runtime='nodejs';
const headers={'Cache-Control':'private, no-store'};
export async function GET(){
 try{
  const actor=await platformOwner();
  if(!process.env.OG_CEO_AUTH_ID||!actor||actor.authId!==process.env.OG_CEO_AUTH_ID)return Response.json({error:'CEO access required'},{status:403,headers});
  const secret=process.env.OG_PRIVATE_WORKER_SECRET,flags=workerSecretFlags(secret);
  if(!flags.configured)return Response.json({diagnosticVersion:'1',...flags,internalAuthentication:'Not assessed',controlRead:'Not assessed'},{headers});
  let controlRead='Not assessed';
  const execute=async(operation:string,input:unknown)=>{
   const client=admin();
   const bridge=privateWorkerBridge({store:durableStore(client),read:async()=>{const r=await client.rpc('og_coordinator_read');if(r.error||!r.data?.state)throw Error('Unavailable');return r.data.state;}});
   const result=await bridge(operation,input);controlRead='Verified';return result;
  };
  // Generated request is in process only. No external call, no mutation, no
  // credential returned. This does not establish equality with the runner token.
  const request=new Request('https://internal.invalid/private-worker',{method:'POST',headers:{authorization:'Bearer '+secret,'content-type':'application/json'},body:JSON.stringify({operation:'readControls',input:{tenantId}})});
  const result=await privateWorkerHTTP({secret,execute})(request);
  return Response.json({diagnosticVersion:'1',...flags,internalAuthentication:result.status===401?'Failed':'Verified',controlRead,resultStatus:result.status,limitations:'Read-only in-process check; does not verify external header delivery or equality with runner credential.'},{headers});
 }catch{return Response.json({error:'Diagnostic unavailable; no execution authorized'},{status:503,headers});}
}
