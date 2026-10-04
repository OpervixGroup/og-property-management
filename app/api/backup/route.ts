import {documentBytes,listDocuments} from '@/lib/document-storage';
import {systemLog} from '@/lib/system-log';
import {load} from '@/lib/storage';
import {getChatGPTUser} from '@/app/chatgpt-auth';
import {access} from '@/lib/server/request';
import {zipSync,strToU8} from 'fflate';
export async function GET(){
 try{
  const user=access(await getChatGPTUser(),['Global Admin']);
  const snapshot=await load(user.userId);
  const docs={results:await listDocuments(user.userId)};
  const files:Record<string,Uint8Array>={'records.json':strToU8(JSON.stringify(snapshot))};let bytes=files['records.json'].length;if(bytes>50000000)throw Error('Records exceed the 50 MB download limit');
  const manifest:any={format:'og-workspace-backup-v1',created:new Date().toISOString(),userId:user.userId,revision:snapshot.revision,scope:'Current saved workspace, including in-record statement versions and audit events, plus all linked documents. Historical database snapshots, hosting credentials and authentication accounts are excluded.',files:[]};
  for(const d of docs.results){
   if(!/^[a-zA-Z0-9-]+$/.test(d.id))throw Error('Invalid document identifier');
   bytes+=d.size;if(bytes>50000000)throw Error('Workspace exceeds the 50 MB download limit. An administrator must create a streamed database and document backup.');
   const content=new Uint8Array(await documentBytes(user.userId,d));if(content.byteLength!==d.size)throw Error('Document size mismatch; backup cancelled');
   const path='documents/'+d.id;files[path]=content;manifest.files.push({path,document:{id:d.id,statementId:d.statement_id,expenseId:d.expense_id,name:d.name,mime:d.mime,size:d.size,created:d.created}});
  }
  if((await load(user.userId)).revision!==snapshot.revision)throw Error('Records changed while backing up. Save changes and retry.');
  const after={results:await listDocuments(user.userId)};if(JSON.stringify(after.results.map(d=>d.id))!==JSON.stringify(docs.results.map(d=>d.id)))throw Error('Documents changed while backing up. Retry.');
  for(const [path,content] of Object.entries(files)){const hash=await crypto.subtle.digest('SHA-256',new Uint8Array(content));const entry=manifest.files.find((f:any)=>f.path===path);const sha256=Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,'0')).join('');if(entry)entry.sha256=sha256;else manifest.files.push({path,sha256});}
  files['manifest.json']=strToU8(JSON.stringify(manifest,null,2));
  const archive=zipSync(files,{level:0});await systemLog(user.userId,user.displayName,'Backup','Info','Workspace backup prepared','Revision '+snapshot.revision+' · '+docs.results.length+' documents. Browser download delivery is not verified.');
  return new Response(archive,{headers:{'Content-Type':'application/zip','Content-Disposition':'attachment; filename="OG_Backup_'+new Date().toISOString().slice(0,10)+'_r'+snapshot.revision+'.zip"','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
 }catch(e){return Response.json({error:e instanceof Error?e.message:'Backup failed'},{status:503});}
}
