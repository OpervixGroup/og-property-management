import {getChatGPTUser} from '@/app/chatgpt-auth';
import {fullAccess} from '@/lib/server/request';
import {plaidSetup} from '@/lib/plaid-setup';
export async function GET(){try{fullAccess(await getChatGPTUser());return Response.json(plaidSetup(process.env),{headers:{'Cache-Control':'private, no-store'}});}catch{return Response.json({error:'Connection status unavailable or access denied'},{status:403});}}
