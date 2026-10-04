import {getChatGPTUser} from '@/app/chatgpt-auth';
import {access} from '@/lib/server/request';
import {microsoftLoginConfig} from '@/lib/microsoft-login';
import {mailConfigured} from '@/lib/server/work-mail';
export async function GET(){try{access(await getChatGPTUser(),['Global Admin','Management']);return Response.json({microsoftSignIn:microsoftLoginConfig(process.env)!==null,workEmail:mailConfigured(),scheduler:!!process.env.OG_WORK_EMAIL_CRON_SECRET,checked:new Date().toISOString()},{headers:{'Cache-Control':'private, no-store'}});}catch{return Response.json({error:'Administration access denied'},{status:403});}}