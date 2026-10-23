import {PLATFORM_OWNER_EMAIL} from '@/lib/company-accounts';
import {platformOwner} from '@/lib/server/platform';
import {rpc} from '@/lib/server/supabase';
import {sameOrigin,body} from '@/lib/server/request';
import {inboxInput,inboxHistory,saveInboxMessage} from '@/lib/server/ceo-inbox';
import {internalConfigured} from '@/lib/server/internal-coo';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'private, no-store'};
export async function GET(){
 try{
  const actor=await platformOwner();
  if(!actor||actor.email!==PLATFORM_OWNER_EMAIL)return Response.json({error:'CEO access required'},{status:403,headers});
  return Response.json({responderConfigured:internalConfigured(),messages:await inboxHistory(actor.authId)},{headers});
 }catch{return Response.json({error:'Conversation storage unavailable'},{status:503,headers});}
}
export async function POST(request:Request){
 try{sameOrigin(request);}catch{return Response.json({error:'Invalid request origin'},{status:403,headers});}
 try{
  const actor=await platformOwner();
  if(!actor||actor.email!==PLATFORM_OWNER_EMAIL)return Response.json({error:'CEO access required'},{status:403,headers});
  let input;try{input=inboxInput(await body(request,16000));}catch{return Response.json({error:'Enter a valid message of 1–4,000 characters'},{status:400,headers});}
  if(!await rpc('og_auth_attempt',{p_bucket:'ceo-inbox:'+actor.authId+':'+Math.floor(Date.now()/60000),p_limit:10}))return Response.json({error:'Please wait a minute before trying again'},{status:429,headers});
  const receipt=await saveInboxMessage(actor.authId,input);
  return Response.json({receipt,responderConfigured:internalConfigured()},{status:202,headers});
 }catch{return Response.json({error:'Saving could not be confirmed. Refresh history before retrying.'},{status:503,headers});}
}
