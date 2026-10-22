import {platformOwner} from '@/lib/server/platform';
import {admin} from '@/lib/server/supabase';
import {durableStore} from '@/lib/task-coordinator-store.mjs';
import {learningStatusHTTP} from '@/lib/client-learning-http.mjs';
export const dynamic='force-dynamic';
// These are the verified project addresses. A redirect/callback URL setting must
// not silently disable CEO controls on the published custom domain.
const controlOrigins=['https://og.opervixgroup.com','https://z64hid4a52.preview.c39.airoapp.ai'];
function handlers(){const client=admin();return learningStatusHTTP({authenticate:platformOwner,isCEO:async(actor:{authId:string})=>!!process.env.OG_CEO_AUTH_ID&&actor.authId===process.env.OG_CEO_AUTH_ID,origin:controlOrigins,read:async()=>{const r=await client.rpc('og_coordinator_read');if(r.error||!r.data?.state)throw Error('Unavailable');return r.data.state;},store:durableStore(client)});}
export async function GET(request:Request){return handlers().GET(request);}
export async function POST(request:Request){return handlers().POST(request);}
