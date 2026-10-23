import 'server-only';
import {admin} from './supabase';
import {internalConfigured,internalReply} from './internal-coo';

// Existing private storage; optional replies use only the configured internal service.
export const privateChatPrefix='ceo-chat:';
export function inboxInput(value:unknown){
 const p=value as {id?:unknown;text?:unknown};
 if(!p||typeof p.id!=='string'||! /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(p.id)||typeof p.text!=='string'||!p.text.trim()||p.text.length>4000)throw Error('Invalid message');
 return {id:p.id.toLowerCase(),text:p.text.trim()};
}
function ownerPrefix(authId:string){
 if(!/^[0-9a-f-]{36}$/i.test(authId))throw Error('Invalid identity');
 return privateChatPrefix+authId+':';
}
export async function inboxHistory(authId:string){
 const result=await admin().from('og_workforce_messages').select('external_id,sender,recipient,kind,text,recorded_at').like('external_id',ownerPrefix(authId)+'%').order('recorded_at',{ascending:false}).order('external_id',{ascending:false}).limit(60);
 if(result.error)throw Error('Conversation storage unavailable');
 return (result.data??[]).reverse();
}
export async function saveInboxMessage(authId:string,input:{id:string;text:string}){
 const db=admin(),id=ownerPrefix(authId)+input.id;
 const configured=internalConfigured();
 const saved=await db.from('og_workforce_messages').insert({external_id:id,office:'ceo',sender:'CEO',recipient:'Alejandro Torres',kind:configured?'Internal reply pending':'Saved; internal responder disabled',text:input.text,recorded_at:new Date().toISOString()});
 if(saved.error){
  if(saved.error.code!=='23505')throw Error('Message was not saved');
  const prior=await db.from('og_workforce_messages').select('text').eq('external_id',id).single();
  if(prior.error||prior.data?.text!==input.text)throw Error('Message identifier conflict');
  return {id,state:'Already saved; refresh history' as const};
 }
 if(configured){
  let text:string,kind:string;
  try{const history=(await inboxHistory(authId)).filter(row=>row.external_id!==id&&(row.sender==='CEO'||row.kind==='Internal AI reply'));text=await internalReply([...history,{sender:'CEO',text:input.text}]);kind='Internal AI reply';}
  catch{text='Your request is saved. A complete internal AI reply was not obtained. No company action was started. Sending a new request may try the internal responder again.';kind='Internal reply unavailable';}
  const reply=await db.from('og_workforce_messages').insert({external_id:id+':r',office:'ceo',sender:'Alejandro Torres · AI',recipient:'CEO',kind,text,task_id:id,recorded_at:new Date().toISOString()});
  if(reply.error)throw Error('Reply storage unavailable');
  return {id,state:kind};
 }
 return {id,state:'Saved; no reply; no automatic dispatch' as const};
}
