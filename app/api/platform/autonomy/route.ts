import {platformOwner} from '@/lib/server/platform';
import {admin} from '@/lib/server/supabase';
import {coordinator} from '@/lib/task-coordinator.mjs';
import {durableStore} from '@/lib/task-coordinator-store.mjs';
import {controlHTTP} from '@/lib/task-coordinator-http.mjs';
import {roles} from '@/lib/ai-role-ids.mjs';
const isCEO=(actor:unknown)=>!!process.env.OG_CEO_AUTH_ID&&!!actor&&typeof actor==='object'&&'authId' in actor&&actor.authId===process.env.OG_CEO_AUTH_ID;
function handlers(){return controlHTTP({authenticate:async()=>platformOwner(),isCEO,origin:process.env.OG_APP_URL,read:async()=>{const r=await admin().rpc('og_coordinator_read');if(r.error)throw Error('Unavailable');return r.data.state;},change:async(p: {paused:boolean;evidence:string;agentId?:string},actor:unknown)=>coordinator({store:durableStore(admin()),roles,authorityRefs:['corporate-internal-reviewed-v1'],verifyCEO:isCEO}).control(p,actor)});}
export async function GET(request:Request){return handlers().GET(request);}
export async function POST(request:Request){return handlers().POST(request);}
