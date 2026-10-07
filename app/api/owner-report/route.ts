import {getChatGPTUser} from '@/app/chatgpt-auth';
import {fullAccess} from '@/lib/server/request';
import {load} from '@/lib/storage';
import {listDocuments,documentBytes} from '@/lib/document-storage';
import {combinedOwnerPDF,ownerPacketPDF,statementPDF,supportPackage,type Doc} from '@/lib/exports';
import {statementDeleted} from '@/lib/pool';

export const runtime='nodejs';
export async function GET(request:Request){
 const headers={'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'};
 let user;try{user=fullAccess(await getChatGPTUser());}catch{return Response.json({error:'Sign in with a report-authorized account.'},{status:403,headers});}
 try{
  const query=new URL(request.url).searchParams,{data}=await load(user.userId);
  const rows=await listDocuments(user.userId),docs:Doc[]=rows.map(d=>({id:d.id,statementId:d.statement_id,expenseId:d.expense_id,name:d.name,mime:d.mime,size:d.size}));
  const readReceipt=async(doc:Doc)=>{const stored=rows.find(d=>d.id===doc.id);if(!stored)throw Error('Receipt unavailable: '+doc.name);return documentBytes(user.userId,stored);};
  let report:Blob,name:string;
  if(query.has('statement')){
   const s=data.statements.find(s=>s.id===query.get('statement')&&!statementDeleted(data,s.id));if(!s)throw Error('Statement unavailable. Refresh and select a saved statement.');
   const unit=data.units.find(u=>u.id===s.unitId)?.number??s.unitId;
   const zip=query.get('format')==='zip';
   report=zip?await supportPackage(data,s,docs,readReceipt):query.get('receipts')==='1'?await ownerPacketPDF(data,s,docs,readReceipt):await statementPDF(data,s,docs);
   name='Devonshire_'+unit+'_'+s.period+'_v'+s.version+(zip?'.zip':'.pdf');
  }else{
   const ownerId=query.get('owner')??'',period=query.get('period')??'',units=query.getAll('unit');
   if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(period)||!data.owners.some(o=>o.id===ownerId)||units.length>data.units.length)throw Error('Select a valid owner, month and units.');
   report=await combinedOwnerPDF(data,ownerId,period,units,docs,query.get('receipts')==='1',readReceipt);
   name='Devonshire_Owner_'+ownerId+'_'+period+'.pdf';
  }
  const disposition=query.get('inline')==='1'&&report.type==='application/pdf'?'inline':'attachment';
  return new Response(await report.arrayBuffer(),{headers:{...headers,'Content-Type':report.type,'Content-Disposition':disposition+"; filename*=UTF-8''"+encodeURIComponent(name)}});
 }catch(e){return Response.json({error:e instanceof Error?e.message:'Report generation failed. Please retry.'},{status:400,headers});}
}
