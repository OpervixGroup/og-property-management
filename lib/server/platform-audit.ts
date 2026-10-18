import 'server-only';
import {admin} from './supabase';
export async function platformAudit(actor:string,event:string,detail:Record<string,unknown>){const result=await admin().from('og_platform_audit').insert({actor,event,detail});if(result.error)throw Error('Access audit could not be saved');}
