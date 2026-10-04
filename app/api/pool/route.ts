import {systemLog} from '@/lib/system-log';
import {load,save} from '@/lib/storage';
import {getChatGPTUser} from '@/app/chatgpt-auth';
import {fullAccess,sameOrigin,body} from '@/lib/server/request';
import {audit} from '@/lib/pool';
export async function GET(){try{const u=fullAccess(await getChatGPTUser());return Response.json(await load(u.userId),{headers:{'Cache-Control':'private, no-store'}});}catch{return Response.json({error:'Access denied or records unavailable'},{status:403});}}
export async function POST(request:Request){try{sameOrigin(request);const u=fullAccess(await getChatGPTUser(),true),p=await body(request,4000000);if(!Number.isInteger(p.revision)||typeof p.operation!=='string'||!p.operation||p.operation.length>100)throw Error('Invalid save request');const old=await load(u.userId,p.operation);if(old.operationApplied)return Response.json(old);if(p.revision!==old.revision)throw Error('CONFLICT: Records changed. Reload before saving.');const incoming=p.data;if(!incoming||!Array.isArray(incoming.audit))throw Error('Invalid record payload');
 // A client cannot supply the actor of a new audit event or rewrite an existing audit event.
 audit(incoming,'Workspace saved',u.displayName+' · changes saved with immutable revision history');const oldIds=new Set(old.data.audit.map(e=>e.id));for(const event of incoming.audit)if(!oldIds.has(event.id)){event.actor=u.displayName;event.actorId=u.authId;event.at=new Date().toISOString();}
 const saved=await save(u.userId,p.revision,p.operation,incoming);await systemLog(u.userId,u.displayName,'Records','Info','Workspace saved','Revision '+saved.revision+' · Supabase PostgreSQL');return Response.json(saved);
 }catch(e){const message=e instanceof Error?e.message:'Save failed';return Response.json({error:message},{status:message.startsWith('CONFLICT')?409:400});}}
