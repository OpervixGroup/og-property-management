import {getChatGPTUser} from '@/app/chatgpt-auth';
import {access} from '@/lib/server/request';
import {listDocuments,privateFiles} from '@/lib/document-storage';
export async function GET(){try{const u=access(await getChatGPTUser(),['Global Admin']);await privateFiles(u.userId);const docs=await listDocuments(u.userId);return Response.json({backend:'supabase',connected:true,total:docs.length,migrated:docs.length,remaining:0},{headers:{'Cache-Control':'no-store'}});}catch{return Response.json({error:'Access denied or metadata migration incomplete'},{status:403});}}
export async function POST(){return Response.json({error:'Import document metadata from a verified workspace backup using the standalone migration script.'},{status:405});}
