import 'server-only';
import {admin} from './server/supabase';
export async function systemLog(userId:string,actor:string,category:'Records'|'Connection'|'Backup'|'Access',level:'Info'|'Error',event:string,detail:string){const {error}=await admin().from('og_app_logs').insert({id:crypto.randomUUID(),workspace_id:userId,at:new Date().toISOString(),actor,category,level,event,detail});if(error)throw Error('Audit log write failed');}
