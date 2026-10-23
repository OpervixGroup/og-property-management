import 'server-only';
import {admin,sessionClient} from './supabase';
export async function platformIdentity(){
 const client=await sessionClient(),verified=await client.auth.getUser(),user=verified.data.user;
 if(verified.error||!user?.email_confirmed_at)return null;
 const claims=await client.auth.getClaims(),sid=claims.data?.claims.session_id;
 if(claims.error||typeof sid!=='string')return null;
 const db=admin(),owner=await db.from('og_platform_owners').select('email').eq('auth_id',user.id).eq('email',user.email?.toLowerCase()??'').eq('active',true).maybeSingle();
 if(owner.error||!owner.data)return null;
 const session=await db.from('og_platform_sessions').select('session_id').eq('session_id',sid).eq('auth_id',user.id).eq('active',true).maybeSingle();
 return session.error||!session.data?null:{authId:user.id,email:owner.data.email,metadata:user.app_metadata??{},mustChangePassword:user.app_metadata?.og_platform_password_required===true};
}
