export type InboxMessage={external_id:string;sender:string;recipient:string;kind:string;text:string;recorded_at:string};
export function inboxMessageState(message:InboxMessage,messages:InboxMessage[],now:number){
 if(message.sender!=='CEO')return {label:message.kind,retry:false};
 const reply=messages.find(row=>row.external_id===message.external_id+':r');
 if(reply)return {label:reply.kind,retry:reply.kind==='Internal reply unavailable'};
 if(message.kind!=='Internal reply pending')return {label:'Saved; no reply; no automatic dispatch',retry:true};
 const age=now-Date.parse(message.recorded_at);
 if(!Number.isFinite(age)||age<0||age>60000)return {label:'No reply verified; review required. No automatic retry.',retry:true};
 return {label:'Awaiting this internal reply; no company action started',retry:false};
}
