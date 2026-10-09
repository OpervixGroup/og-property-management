import 'server-only';
import {captureChanges} from './audit-center';
import {getChatGPTUser} from '@/app/chatgpt-auth';
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
export async function save(user:string,revision:number,operation:string,data:Data,systemMail=false){const adapter=supabaseRecords(await supabaseConfig(user));const old=await adapter.load(user,operation);if(old.operationApplied)return {...old,storage:'Supabase PostgreSQL'};if(!systemMail){assertMailUnchanged(old.data,data);queueWorkChanges(old.data,data,user===serverConfig().workspace&&mailConfigured());}validate(normalizeStaffScopes(applyDevonshirePropertyDetails(old.data)),data);validateWorkflowControls(old.data,data);validateSharedRecordHistory(old.data,data);const signed=await getChatGPTUser();if(!signed&&!systemMail)throw Error('Authenticated audit actor required');if(signed&&signed.userId!==user)throw Error('Audit workspace mismatch');const actor={id:signed?.authId??'system',name:signed?.displayName??'System',role:signed?.role??'System'};const prior=new Set(old.data.audit.map(e=>e.id));const at=new Date().toISOString();for(const event of data.audit)if(!prior.has(event.id)){delete event.before;delete event.after;delete event.entity;delete event.recordId;event.actor=actor.name;event.actorId=actor.id;event.actorRole=actor.role;event.at=at;event.operation=operation;event.revision=revision+1;}captureChanges(old.data,data,actor,operation,revision+1,at);return {...await adapter.save(user,revision,operation,data),storage:'Supabase PostgreSQL'};}
