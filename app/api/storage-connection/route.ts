import {getChatGPTUser} from '@/app/chatgpt-auth';
import {access} from '@/lib/server/request';
export async function GET(){try{access(await getChatGPTUser(),['Global Admin']);return Response.json({active:true,ready:true,standalone:true,verifiedRevision:null,updated:null},{headers:{'Cache-Control':'no-store'}});}catch{return Response.json({error:'Access denied'},{status:403});}}
export async function POST(){return Response.json({error:'Standalone OG uses private server environment variables. Keys cannot be changed in this screen.'},{status:405});}
