import {platformOwner} from '@/lib/server/platform';
import {admin} from '@/lib/server/supabase';
import {coordinator} from '@/lib/task-coordinator.mjs';
import {durableStore} from '@/lib/task-coordinator-store.mjs';
import {controlHTTP} from '@/lib/task-coordinator-http.mjs';
const roles=['coo','cfo','sales-vp','cmo','cto','ai-resources','controller','legal-lead','cpo','secretary','strategy','operations-lead','project-manager','vendor-coordinator','account-executive','research','engineering-lead','developer','quality','designer','security','capacity','orchestration','knowledge','evaluation','receivables','payables','reconciliation','clients-lead','support','risk','audit'];
const isCEO=(actor:unknown)=>!!process.env.OG_CEO_AUTH_ID&&!!actor&&typeof actor==='object'&&'authId' in actor&&actor.authId===process.env.OG_CEO_AUTH_ID;
function handlers(){return controlHTTP({authenticate:async()=>platformOwner(),isCEO,origin:process.env.OG_APP_URL,read:async()=>{const r=await admin().rpc('og_coordinator_read');if(r.error)throw Error('Unavailable');return r.data.state;},change:async(p: {paused:boolean;evidence:string;agentId?:string},actor:unknown)=>coordinator({store:durableStore(admin()),roles,authorityRefs:['corporate-internal-reviewed-v1'],verifyCEO:isCEO}).control(p,actor)});}
export async function GET(request:Request){return handlers().GET(request);}
export async function POST(request:Request){return handlers().POST(request);}
