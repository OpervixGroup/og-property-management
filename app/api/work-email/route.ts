import {timingSafeEqual} from 'node:crypto';
import {getChatGPTUser} from '@/app/chatgpt-auth';
import {fullAccess,sameOrigin} from '@/lib/server/request';
import {mailConfigured,processWorkMail} from '@/lib/server/work-mail';
import {serverConfig} from '@/lib/server/supabase';
export const runtime='nodejs';
export async function GET(request:Request){try{const auth=request.headers.get('authorization');if(auth){const secret=process.env.OG_WORK_EMAIL_CRON_SECRET;if(!secret||secret.length<32)throw Error('Access denied');const supplied=Buffer.from(auth),expected=Buffer.from('Bearer '+secret);if(supplied.length!==expected.length||!timingSafeEqual(supplied,expected))throw Error('Access denied');return Response.json(await processWorkMail(serverConfig().workspace),{headers:{'Cache-Control':'no-store'}});}fullAccess(await getChatGPTUser());return Response.json({configured:mailConfigured(),mailbox:'dla@devonshirecondos.com',schedulerConfigured:!!process.env.OG_WORK_EMAIL_CRON_SECRET},{headers:{'Cache-Control':'private, no-store'}});}catch{return Response.json({error:'Email connection unavailable or access denied'},{status:403});}}
export async function POST(request:Request){try{sameOrigin(request);const u=fullAccess(await getChatGPTUser(),true);return Response.json(await processWorkMail(u.userId));}catch{return Response.json({error:'Email synchronization failed. Review the connection and queue; delivery may be uncertain.'},{status:400});}}
