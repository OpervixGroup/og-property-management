import {getChatGPTUser} from '@/app/chatgpt-auth';
import {fullAccess} from '@/lib/server/request';
import {microsoftLoginConfig} from '@/lib/microsoft-login';
import {connectionStatus} from '@/lib/server/qbo';
import {mailConfigured} from '@/lib/server/mail-config';
export async function GET(){try{const u=fullAccess(await getChatGPTUser());const qbo=await connectionStatus(u.userId);return Response.json({microsoft:!!microsoftLoginConfig(process.env),mail:mailConfigured(),scheduler:!!process.env.OG_WORK_EMAIL_CRON_SECRET&&process.env.OG_WORK_EMAIL_CRON_SECRET.length>=32,qbo:qbo.status+'; CSV review available'},{headers:{'Cache-Control':'private, no-store'}});}catch{return Response.json({error:'Access denied'},{status:403});}}
