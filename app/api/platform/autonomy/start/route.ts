import {platformOwner} from '@/lib/server/platform';
import {startHTTP} from '@/lib/task-coordinator-start-http.mjs';
import {POST as runReviewedTask} from '../run/route';
export const runtime='nodejs';
export async function POST(request:Request){return startHTTP({
 authenticate:platformOwner,
 isCEO:async(actor:{authId:string})=>!!process.env.OG_CEO_AUTH_ID&&actor.authId===process.env.OG_CEO_AUTH_ID,
 origin:process.env.OG_APP_URL,
 execute:async()=>{
  const secret=process.env.OG_WORKFORCE_INGEST_SECRET;
  if(!secret||secret.length<32)throw Error('Worker unavailable');
  return runReviewedTask(new Request(new URL('/api/platform/autonomy/run',request.url),{method:'POST',headers:{authorization:'Bearer '+secret,'Content-Type':'application/json'},body:'{}'}));
 }
})(request);}
