import {missingOwnerSupport} from '@/lib/month-close';
import {listDocuments} from '@/lib/document-storage';
import {canonicalRecord} from '@/lib/workflow-controls';
import {systemLog} from '@/lib/system-log';
import {load,save} from '@/lib/storage';
import {getChatGPTUser} from '@/app/chatgpt-auth';
import {fullAccess,sameOrigin,body} from '@/lib/server/request';
import {audit} from '@/lib/pool';
export async function GET(){try{const u=fullAccess(await getChatGPTUser());return Response.json(await load(u.userId),{headers:{'Cache-Control':'private, no-store'}});}catch{return Response.json({error:'Access denied or records unavailable'},{status:403});}}
export async function POST(request:Request){try{sameOrigin(request);const u=fullAccess(await getChatGPTUser(),true),p=await body(request,4000000);if(!Number.isInteger(p.revision)||typeof p.operation!=='string'||!p.operation||p.operation.length>100)throw Error('Invalid save request');const old=await load(u.userId,p.operation);if(old.operationApplied)return Response.json(old);if(p.revision!==old.revision)throw Error('CONFLICT: Records changed. Reload before saving.');const incoming=p.data;if(!incoming||!Array.isArray(incoming.audit))throw Error('Invalid record payload');
 if(canonicalRecord(incoming.workflow??null)!==canonicalRecord(old.data.workflow??null))throw Error('Use the approval workflow to change approvals or record states');
 for(const chart of incoming.glControls?.charts??[])if(!old.data.glControls?.charts.some(c=>c.id===chart.id)){if(typeof chart.source!=='string')throw Error('Invalid chart source');const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(chart.source)))).map(b=>b.toString(16).padStart(2,'0')).join('');if(hash!==chart.hash)throw Error('Chart source hash does not match uploaded file');}
 for(const key of ['contributions','events'] as const)for(const record of incoming.closeControls?.[key]??[])if(!old.data.closeControls?.[key].some(r=>r.id===record.id)){record.reviewer=u.displayName;record.created=new Date().toISOString();}
 const closing=(incoming.closeControls?.events??[]).filter((e:any)=>e.kind==='Closed'&&!old.data.closeControls?.events.some(p=>p.id===e.id));if(closing.length){const docs=(await listDocuments(u.userId)).map(d=>({statementId:d.statement_id,expenseId:d.expense_id}));for(const e of closing)if(missingOwnerSupport(incoming,e.period,docs).length)throw Error('Attach supporting invoices for manual repair, labor and material charges before closing.');}
 // A client cannot supply the actor of a new audit event or rewrite an existing audit event.
 audit(incoming,'Workspace saved',u.displayName+' · changes saved with immutable revision history');const oldIds=new Set(old.data.audit.map(e=>e.id));for(const event of incoming.audit)if(!oldIds.has(event.id)){event.actor=u.displayName;event.actorId=u.authId;event.at=new Date().toISOString();}
 const saved=await save(u.userId,p.revision,p.operation,incoming);await systemLog(u.userId,u.displayName,'Records','Info','Workspace saved','Revision '+saved.revision+' · Supabase PostgreSQL');return Response.json(saved);
 }catch(e){const message=e instanceof Error?e.message:'Save failed';return Response.json({error:message},{status:message.startsWith('CONFLICT')?409:400});}}
