import type {Data} from './pool';
export type AuditEvent={id:string;at:string;action:string;detail:string;actor?:string;actorId?:string;actorRole?:string;operation?:string;revision?:number;entity?:string;recordId?:string;kind?:string;before?:unknown;after?:unknown;relatedEventId?:string};
export const auditAccess=(role:string)=>role==='Global Admin'||role==='Management';
const secret=/password|secret|token|authorization|credential/i;
function safe(value:unknown):unknown{if(Array.isArray(value))return value.map(safe);if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,secret.test(k)?'[redacted]':safe(v)]));return value;}
const stable=(v:unknown):string=>JSON.stringify(v===undefined?null:v,(_,x)=>x&&typeof x==='object'&&!Array.isArray(x)?Object.fromEntries(Object.keys(x).sort().map(k=>[k,x[k]])):x);
export function captureChanges(old:Data,next:Data,actor:{id:string;name:string;role:string},operation:string,revision:number,at=new Date().toISOString()){
 const events:AuditEvent[]=[];
 function emit(entity:string,recordId:string,kind:string,before:unknown,after:unknown){events.push({id:crypto.randomUUID(),at,action:kind+' · '+entity,detail:recordId,actor:actor.name,actorId:actor.id,actorRole:actor.role,operation,revision,entity,recordId,kind,before:safe(before??null),after:safe(after??null)});}
 function walk(a:unknown,b:unknown,path:string){if(stable(a)===stable(b))return;
  if(Array.isArray(a)||Array.isArray(b)){const aa=Array.isArray(a)?a:[],bb=Array.isArray(b)?b:[];if([...aa,...bb].every(r=>r&&typeof r==='object'&&typeof r.id==='string')){const am=new Map(aa.map(r=>[r.id,r])),bm=new Map(bb.map(r=>[r.id,r]));for(const id of new Set([...am.keys(),...bm.keys()])){const x=am.get(id),y=bm.get(id);if(stable(x)!==stable(y)){const state=String(y?.action??y?.kind??y?.status??'');const kind=!y?'Deleted':/void/i.test(state)?'Voided':/revers/i.test(state)?'Reversed':/delet/i.test(state)?'Deleted':/restor/i.test(state)?'Restored':!x?'Created':'Updated';emit(path,id,kind,x,y);}}}else emit(path,path,'Updated',a,b);return;}
  if((a&&typeof a==='object')||(b&&typeof b==='object')){const x=(a??{}) as Record<string,unknown>,y=(b??{}) as Record<string,unknown>;for(const key of new Set([...Object.keys(x),...Object.keys(y)])){if(!path&&key==='audit')continue;walk(x[key],y[key],path?path+'.'+key:key);}return;}
  emit(path,path,'Updated',a,b);
 }
 walk(old,next,'');next.audit.unshift(...events);return events;
}
export function auditCsv(events:AuditEvent[]){const cell=(v:unknown)=>{const s=typeof v==='string'?v:JSON.stringify(v??'');return '"'+(/^[=+@\-\t\r]/.test(s)?"'"+s:s).replaceAll('"','""')+'"';};return [['Timestamp UTC','User','User ID','Role','Action','Entity','Record','Revision','Details','Before','After'],...events.map(e=>[e.at,e.actor??'Not recorded',e.actorId??'',e.actorRole??'',e.action,e.entity??'',e.recordId??'',e.revision??'',e.detail,e.before??'',e.after??''])].map(r=>r.map(cell).join(',')).join('\r\n');}
