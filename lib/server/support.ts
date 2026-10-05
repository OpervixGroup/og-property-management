import 'server-only';
import {createHash} from 'node:crypto';
import {admin,serverConfig} from './supabase';
import {supportMailConfigured,sendSupportMessage} from './support-mail';
import {supportSubject,clientName,safeRoute,safeDigest,SUPPORT_EMAIL} from '../support-model';

const table='og_support_events';
function identity(){return {workspace:serverConfig().workspace,client:clientName(process.env.OG_CLIENT_NAME)};}
export async function queueSupport(authId:string,description:string,context:string){
 const {workspace,client}=identity(),db=admin();
 const recent=await db.from(table).select('id',{count:'exact',head:true}).eq('workspace_id',workspace).eq('auth_id',authId).eq('kind','Support').gte('created_at',new Date(Date.now()-3600000).toISOString());
 if(recent.error)throw Error('Support queue unavailable');if((recent.count??0)>=5)throw Error('You already have five support requests this hour. Please wait before submitting another.');
 const id=crypto.randomUUID();const {error}=await db.from(table).insert({id,workspace_id:workspace,auth_id:authId,client_name:client,kind:'Support',subject:supportSubject(client,'Support',id),message:description,context:context.slice(0,100),state:supportMailConfigured()?'Queued':'Pending connection'});
 if(error)throw Error('Support request could not be saved');return {id,state:supportMailConfigured()?'Queued':'Pending connection',recipient:SUPPORT_EMAIL};
}
export async function recordIncident(source:string,route:string,digest?:unknown){
 try{const {workspace,client}=identity(),path=safeRoute(route),code=safeDigest(digest),bucket=Math.floor(Date.now()/3600000);const fingerprint=createHash('sha256').update([workspace,source,path,code,bucket].join('|')).digest('hex');const id=crypto.randomUUID();
 const {error}=await admin().from(table).upsert({id,workspace_id:workspace,client_name:client,kind:'Incident',subject:supportSubject(client,'Incident',id),message:`Source: ${source}\nScreen/route: ${path}\nError reference: ${code}\nReview private runtime logs for technical details. No request body, headers, passwords or financial records are included.`,context:path,state:supportMailConfigured()?'Queued':'Pending connection',fingerprint},{onConflict:'fingerprint',ignoreDuplicates:true});
 if(error)console.error('OG incident queue unavailable');
 }catch{console.error('OG incident queue unavailable');}
}
export async function supportStatus(authId:string,all=false){const {workspace}=identity();let query=admin().from(table).select('id,kind,subject,state,created_at,context').eq('workspace_id',workspace).order('created_at',{ascending:false}).limit(20);if(!all)query=query.eq('auth_id',authId);const {data,error}=await query;if(error)throw Error('Support status unavailable');return {configured:supportMailConfigured(),recipient:SUPPORT_EMAIL,events:data??[]};}
export async function processSupportMail(){if(!supportMailConfigured())return {configured:false,accepted:0};const {workspace}=identity(),db=admin();let accepted=0;const result=await db.from(table).select('id,subject,message,context,auth_id').eq('workspace_id',workspace).in('state',['Queued','Pending connection']).order('created_at').limit(2);if(result.error)throw Error('Support queue unavailable');
 for(const item of result.data??[]){const claim=await db.from(table).update({state:'Delivery uncertain',attempted_at:new Date().toISOString()}).eq('workspace_id',workspace).eq('id',item.id).in('state',['Queued','Pending connection']).select('id');if(claim.error||!claim.data?.length)continue;
 let state='Delivery uncertain';try{const status=await sendSupportMessage(SUPPORT_EMAIL,item.subject,`Ticket: ${item.id}\nContext: ${item.context}\n\n${item.message}`);if(status===202){state='Accepted by Outlook';accepted++;}else if(status>=400&&status<500)state='Rejected';}catch{/* Never retry ambiguous delivery automatically. */}
 const saved=await db.from(table).update({state}).eq('workspace_id',workspace).eq('id',item.id);if(saved.error)console.error('OG support delivery status unavailable');
 }return {configured:true,accepted};}

