import {platformIdentity} from '@/lib/server/platform-identity';
import {admin,rpc,sessionClient} from '@/lib/server/supabase';
import {sameOrigin,body,password} from '@/lib/server/request';
import {platformAudit} from '@/lib/server/platform-audit';
export async function POST(request:Request){const headers={'Cache-Control':'private, no-store'};try{
 sameOrigin(request);const user=await platformIdentity();if(!user)return Response.json({error:'Sign in required'},{status:401,headers});
 if(!await rpc('og_auth_attempt',{p_bucket:'platform-password:'+user.authId+':'+Math.floor(Date.now()/900000),p_limit:5}))return Response.json({error:'Try again in 15 minutes'},{status:429,headers});
 const p=await body(request),next=password(p.password);
 if(typeof p.currentPassword!=='string'||p.currentPassword.length>128)throw Error('Enter your current password');
 if(p.currentPassword===next)throw Error('Choose a new password');
 const db=admin(),verification=await db.auth.signInWithPassword({email:user.email,password:p.currentPassword});
 if(verification.error||verification.data.user?.id!==user.authId)throw Error('Current password is incorrect');
 await db.auth.signOut({scope:'local'});
 await platformAudit(user.authId,'Platform password change requested',{});
 const client=await sessionClient(),changed=await client.auth.updateUser({password:next});if(changed.error)throw Error('Password update failed');
 await platformAudit(user.authId,'Platform password changed',{password_value_excluded:true});
 const marked=await db.auth.admin.updateUserById(user.authId,{app_metadata:{...user.metadata,og_platform_password_required:false}});
 if(marked.error)throw Error('Password changed, but access confirmation failed. Sign in and retry using your new password.');
 return Response.json({ok:true,redirect:'/platform'},{headers});
 }catch(e){return Response.json({error:e instanceof Error?e.message:'Password change unavailable'},{status:400,headers});}}
