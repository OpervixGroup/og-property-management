import {timingSafeEqual} from 'node:crypto';
import {getChatGPTUser} from '@/app/chatgpt-auth';
import {fullAccess,sameOrigin} from '@/lib/server/request';
import {mailConfigured,processWorkMail} from '@/lib/server/work-mail';
import {serverConfig} from '@/lib/server/supabase';
export const runtime='nodejs';
async function processMailbox(workspace:string){try{return {...await processWorkMail(workspace),mode:'reply-review-only'};}catch{return {configured:mailConfigured(),error:'Mailbox reply review failed; no notification dispatch was attempted',mode:'reply-review-only'};}}
export async function GET(request:Request){try{const auth=request.headers.get('authorization');if(auth){const secret=process.env.OG_WORK_EMAIL_CRON_SECRET;if(!secret||secret.length<32)throw Error('Access denied');const supplied=Buffer.from(auth),expected=Buffer.from('Bearer '+secret);if(supplied.length!==expected.length||!timingSafeEqual(supplied,expected))throw Error('Access denied');const result=await processMailbox(serverConfig().workspace);return Response.json(result,{status:'error' in result?503:200,headers:{'Cache-Control':'no-store'}});}const u=fullAccess(await getChatGPTUser());const own=u.userId===serverConfig().workspace;return Response.json({configured:own&&mailConfigured(),mailbox:own?'dla@devonshirecondos.com':'Company mailbox setup required',schedulerConfigured:!!process.env.OG_WORK_EMAIL_CRON_SECRET},{headers:{'Cache-Control':'private, no-store'}});}catch{return Response.json({error:'Email connection unavailable or access denied'},{status:403});}}
export async function POST(request:Request){try{sameOrigin(request);const u=fullAccess(await getChatGPTUser(),true);const result=await processMailbox(u.userId);return Response.json(result,{status:'error' in result?503:200});}catch{return Response.json({error:'Email reply review failed. No queued notification was dispatched by this check.'},{status:400});}}

