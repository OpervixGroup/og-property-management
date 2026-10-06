import {getChatGPTUser} from '@/app/chatgpt-auth';
import {fullAccess,sameOrigin,body} from '@/lib/server/request';
import {load,save} from '@/lib/storage';
import {importRentMaster} from '@/lib/rent-master';
export async function POST(request:Request){try{sameOrigin(request);const user=fullAccess(await getChatGPTUser(),true),p=await body(request,1000000),old=await load(user.userId);if(p.revision!==old.revision)throw Error('CONFLICT: Refresh before importing');const next=importRentMaster(old.data,p.input,user.displayName);const ids=new Set(old.data.audit.map(e=>e.id));for(const event of next.audit)if(!ids.has(event.id)){Object.assign(event,{actor:user.displayName,actorId:user.authId});event.at=new Date().toISOString();}return Response.json(await save(user.userId,old.revision,crypto.randomUUID(),next));}catch(e){return Response.json({error:(e as Error).message},{status:400});}}


