import {getChatGPTUser} from '@/app/chatgpt-auth';
import {fullAccess} from '@/lib/server/request';
import {connectionStatus} from '@/lib/server/qbo';
export async function GET(){try{const u=fullAccess(await getChatGPTUser());return Response.json({...await connectionStatus(u.userId),canConnect:u.role==='Global Admin'},{headers:{'Cache-Control':'private, no-store'}});}catch{return Response.json({error:'Connection status unavailable'},{status:403});}}
