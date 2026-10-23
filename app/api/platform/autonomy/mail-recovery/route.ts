import {platformOwner} from '@/lib/server/platform';
import {admin} from '@/lib/server/supabase';
import {durableStore} from '@/lib/task-coordinator-store.mjs';
import {recoveryService} from '@/lib/mail-cycle-recovery.mjs';
import {recoveryHTTP} from '@/lib/mail-cycle-recovery-http.mjs';
export const dynamic='force-dynamic';
const isCEO=(actor:unknown)=>!!process.env.OG_CEO_AUTH_ID&&!!actor&&typeof actor==='object'&&'authId' in actor&&actor.authId===process.env.OG_CEO_AUTH_ID;
function handlers(){
 const client=admin();
 const service=recoveryService({store:durableStore(client),verifyCEO:isCEO,read:async()=>{const r=await client.rpc('og_coordinator_read');if(r.error||!r.data?.state)throw Error('Unavailable');return r.data.state;}});
 return recoveryHTTP({authenticate:async()=>platformOwner(),isCEO,origin:['https://og.opervixgroup.com','https://z64hid4a52.preview.c39.airoapp.ai'],service});
}
export async function GET(request:Request){return handlers().GET(request);}
export async function POST(request:Request){return handlers().POST(request);}
