import 'server-only';
import {createClient} from '@supabase/supabase-js';
import {createServerClient} from '@supabase/ssr';
import {cookies} from 'next/headers';
import {companyMatches,type Company} from '../company-accounts';
export function serverConfig(){const url=process.env.NEXT_PUBLIC_SUPABASE_URL,secret=process.env.SUPABASE_SERVER_KEY,workspace=process.env.OG_WORKSPACE_ID;if(!url||!secret||!workspace)throw Error('OG server configuration is incomplete');const parsed=new URL(url);if(parsed.protocol!=='https:'||!parsed.hostname.endsWith('.supabase.co'))throw Error('Invalid Supabase URL');return {url,secret,workspace};}
export function admin(){const {url,secret}=serverConfig();return createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});}
export async function sessionClient(){const store=await cookies();const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;if(!url||!key)throw Error('OG sign-in configuration is incomplete');return createServerClient(url,key,{cookieOptions:{sameSite:'lax',secure:process.env.NODE_ENV==='production',httpOnly:true},cookies:{getAll:()=>store.getAll(),setAll:(list)=>{try{for(const {name,value,options} of list)store.set(name,value,options);}catch{/* Page rendering cannot write; proxy refreshes cookies. */}}}});}
export async function rpc(name:string,input:Record<string,unknown>){const {data,error}=await admin().rpc(name,input);if(error)throw Error('Database operation failed');return data;}

export async function registerSession(client:Awaited<ReturnType<typeof sessionClient>>,authId:string,companyLogin=''){
 const claims=await client.auth.getClaims(),verified=await client.auth.getUser();const sid=claims.data?.claims.session_id,user=verified.data.user;
 if(claims.error||typeof sid!=='string'||verified.error||user?.id!==authId)throw Error('Unable to verify login session');
 const db=admin();const owner=await db.from('og_platform_owners').select('email,auth_id,active').eq('email',user.email?.toLowerCase()??'').eq('active',true).maybeSingle();if(owner.error)throw Error('Account registry unavailable');
 if(owner.data&&user.email_confirmed_at){if(owner.data.auth_id&&owner.data.auth_id!==authId)throw Error('Platform identity mismatch');if(!owner.data.auth_id){const bound=await db.from('og_platform_owners').update({auth_id:authId}).eq('email',owner.data.email).is('auth_id',null).select('auth_id').single();if(bound.error||bound.data?.auth_id!==authId)throw Error('Platform identity registration failed');}const saved=await db.from('og_platform_sessions').upsert({session_id:sid,auth_id:authId,active:true},{onConflict:'session_id'});if(saved.error)throw Error('Session registration failed');return {redirect:'/platform'};}
 const {data:member,error}=await db.from('og_app_users').select('workspace_id,status').eq('auth_id',authId).maybeSingle();if(error||!member||member.status!=='Active')throw Error('No active company access');
 const company=await db.from('og_companies').select('*').eq('workspace_id',member.workspace_id).maybeSingle();if(company.error||!company.data||!companyMatches(company.data as Company,companyLogin))throw Error('No access to this company');
 const saved=await db.from('og_app_sessions').upsert({session_id:sid,auth_id:authId,workspace_id:member.workspace_id,active:true},{onConflict:'session_id'});if(saved.error)throw Error('Session registration failed');return {redirect:'/workspace'};
}
