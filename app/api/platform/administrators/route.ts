import {PLATFORM_OWNER_EMAIL} from '@/lib/company-accounts';
import {platformOwner} from '@/lib/server/platform';
import {admin,rpc} from '@/lib/server/supabase';
import {sameOrigin,body,password} from '@/lib/server/request';
import {platformAudit} from '@/lib/server/platform-audit';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'private, no-store'};
export async function POST(request:Request){try{
 sameOrigin(request);const actor=await platformOwner();
 if(!actor||actor.email!==PLATFORM_OWNER_EMAIL)return Response.json({error:'Founder access required'},{status:403,headers});
 if(!await rpc('og_auth_attempt',{p_bucket:'platform-create:'+actor.authId+':'+Math.floor(Date.now()/900000),p_limit:5}))return Response.json({error:'Try again in 15 minutes'},{status:429,headers});
 const p=await body(request),email=typeof p.email==='string'?p.email.trim().toLowerCase():'';
 if(!/^[^\s@]+@opervixgroup\.com$/.test(email)||email.length>254||email===PLATFORM_OWNER_EMAIL)throw Error('Use a separate Opervix login username');
 if(typeof p.name!=='string'||!p.name.trim()||p.name.length>200)throw Error('Enter the administrator name');
 const temporary=password(p.password),db=admin();
 const reservation=await db.from('og_platform_owners').select('email,auth_id,active').eq('email',email).eq('active',true).is('auth_id',null).maybeSingle();
 if(reservation.error||!reservation.data)throw Error('An approved unused Super Admin reservation is required');
 await platformAudit(actor.authId,'Platform administrator creation requested',{email,name:p.name.trim()});
 const created=await db.auth.admin.createUser({email,password:temporary,email_confirm:true,user_metadata:{name:p.name.trim()},app_metadata:{og_platform_password_required:true,og_platform_provisioned_by:actor.authId}});
 if(created.error||!created.data.user){await platformAudit(actor.authId,'Platform administrator creation failed',{email});throw Error('Account could not be created. Existing identities are never reset or reassigned.');}
 const id=created.data.user.id;
 const bound=await db.from('og_platform_owners').update({auth_id:id}).eq('email',email).eq('active',true).is('auth_id',null).select('auth_id').maybeSingle();
 if(bound.error||bound.data?.auth_id!==id){await platformAudit(actor.authId,'Platform administrator binding requires review',{email,auth_id:id});throw Error('Login created but access binding needs review. No existing account was changed.');}
 await platformAudit(actor.authId,'Platform administrator created',{email,auth_id:id,password_change_required:true});
 return Response.json({ok:true,message:'Account created. Share the temporary password privately. The user must change it before opening records.'},{headers});
 }catch(e){return Response.json({error:e instanceof Error?e.message:'Account creation unavailable'},{status:400,headers});}}
