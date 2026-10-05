import 'server-only';
import {SUPPORT_EMAIL} from '../support-model';
export function supportMailConfigured(){return process.env.OG_SUPPORT_EMAIL_ENABLED==='true'&&/^[a-f0-9-]{36}$/i.test(process.env.SUPPORT_MS_TENANT_ID??'')&&/^[a-f0-9-]{36}$/i.test(process.env.SUPPORT_MS_CLIENT_ID??'')&&!!process.env.SUPPORT_MS_CLIENT_SECRET;}
export async function sendSupportMessage(recipient:string,subject:string,text:string){
 if(recipient!==SUPPORT_EMAIL)throw Error('Unapproved support recipient');
 if(!supportMailConfigured())throw Error('Opervix support connection is not configured');
 const r=await fetch('https://login.microsoftonline.com/'+process.env.SUPPORT_MS_TENANT_ID+'/oauth2/v2.0/token',{method:'POST',body:new URLSearchParams({client_id:process.env.SUPPORT_MS_CLIENT_ID!,client_secret:process.env.SUPPORT_MS_CLIENT_SECRET!,scope:'https://graph.microsoft.com/.default',grant_type:'client_credentials'}),signal:AbortSignal.timeout(15000),cache:'no-store'});
 if(!r.ok)throw Error('Support authentication failed');const j=await r.json();if(typeof j.access_token!=='string')throw Error('Support authentication failed');
 const sent=await fetch('https://graph.microsoft.com/v1.0/users/'+encodeURIComponent(SUPPORT_EMAIL)+'/sendMail',{method:'POST',headers:{Authorization:'Bearer '+j.access_token,'Content-Type':'application/json'},body:JSON.stringify({message:{subject,body:{contentType:'Text',content:text},toRecipients:[{emailAddress:{address:SUPPORT_EMAIL}}],replyTo:[{emailAddress:{address:SUPPORT_EMAIL}}]},saveToSentItems:true}),signal:AbortSignal.timeout(20000)});return sent.status;
}
