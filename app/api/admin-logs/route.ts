import {getChatGPTUser} from '@/app/chatgpt-auth';
import {admin} from '@/lib/server/supabase';
import {access} from '@/lib/server/request';
export async function GET(){try{const u=access(await getChatGPTUser(),['Global Admin']);const {data,error}=await admin().from('og_app_logs').select('*').eq('workspace_id',u.userId).order('at',{ascending:false}).limit(1000);if(error)throw Error();return Response.json({logs:data,limited:data.length===1000,connection:{active:1,verified_revision:null,updated:null}},{headers:{'Cache-Control':'no-store'}});}catch{return Response.json({error:'Global Admin access required'},{status:403});}}
