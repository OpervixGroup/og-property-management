import 'server-only';
import {assertMailUnchanged,queueWorkChanges} from './work-mail-model';
import {mailConfigured} from './server/mail-config';
import {validateWorkflowControls} from './workflow-controls';
import {validateSharedRecordHistory} from './shared-records';
import {validate,applyDevonshirePropertyDetails,type Data} from './pool';
import {normalizeStaffScopes} from './staff-users';
import {supabaseRecords} from './supabase-records';
import {serverConfig} from './server/supabase';
export async function supabaseConfig(user:string){const c=serverConfig();const company=await (await import('./server/supabase')).admin().from('og_companies').select('status').eq('workspace_id',user).maybeSingle();if(company.error||company.data?.status!=='Active')throw Error('Unknown or disabled company');return {url:c.url,secret:c.secret};}
export async function load(user:string,operation?:string){const result=await supabaseRecords(await supabaseConfig(user)).load(user,operation);return {...result,storage:'Supabase PostgreSQL',data:normalizeStaffScopes(applyDevonshirePropertyDetails(result.data))};}
export async function save(user:string,revision:number,operation:string,data:Data,systemMail=false){const adapter=supabaseRecords(await supabaseConfig(user));const old=await adapter.load(user,operation);if(old.operationApplied)return {...old,storage:'Supabase PostgreSQL'};if(!systemMail){assertMailUnchanged(old.data,data);queueWorkChanges(old.data,data,user===serverConfig().workspace&&mailConfigured());}validate(normalizeStaffScopes(applyDevonshirePropertyDetails(old.data)),data);validateWorkflowControls(old.data,data);validateSharedRecordHistory(old.data,data);return {...await adapter.save(user,revision,operation,data),storage:'Supabase PostgreSQL'};}
