import {getChatGPTUser} from '@/app/chatgpt-auth';
import {fullAccess,sameOrigin,body} from '@/lib/server/request';
import {downloadReview,qboAudit} from '@/lib/server/qbo';
import {QBO_KINDS} from '@/lib/qbo-exchange';
export async function POST(request:Request){try{sameOrigin(request);const u=fullAccess(await getChatGPTUser()),p=await body(request);if(!QBO_KINDS.includes(p.kind)||!['Cash','Accrual'].includes(p.basis)||typeof p.month!=='string')throw Error('Invalid download selection');await qboAudit(u.userId,u.authId,'QBO download requested',p.kind+' / '+p.month+' / '+p.basis);const result=await downloadReview(u.userId,p.kind,p.month,p.basis);await qboAudit(u.userId,u.authId,'QBO review download prepared',p.kind+' / '+p.month+' / records '+(result.source.records??'report'));return Response.json(result,{headers:{'Cache-Control':'private, no-store'}});}catch(e){return Response.json({error:(e as Error).message},{status:400,headers:{'Cache-Control':'private, no-store'}});}}
