import type {Data} from './pool';
export type SupabaseRecordConfig={url:string;secret:string};
export type RecordSnapshot={revision:number;data:Data;operationApplied?:boolean};
export function supabaseRecords(config:SupabaseRecordConfig,request:typeof fetch=fetch){
 const url=new URL(config.url);if(url.protocol!=='https:'||!url.hostname.endsWith('.supabase.co')||url.pathname!=='/'||url.search||url.hash||url.username||url.password)throw Error('Invalid Supabase project URL');if(!config.secret)throw Error('Supabase server secret is missing');
 async function rpc(name:string,input:unknown):Promise<RecordSnapshot>{
  const response=await request(new URL('/rest/v1/rpc/'+name,url),{method:'POST',headers:{apikey:config.secret,...(config.secret.startsWith('sb_secret_')?{}:{Authorization:'Bearer '+config.secret}),'Content-Type':'application/json'},body:JSON.stringify(input),signal:AbortSignal.timeout(15000)});
  if(!response.ok){let code='';try{code=(await response.json() as {code?:string}).code??'';}catch{}if(code==='OG409')throw Error('CONFLICT: Another save changed these records. Reload before saving.');if(code==='OG404')throw Error('Supabase workspace has not been migrated. Current records must be transferred before switching storage.');throw Error('Supabase record storage unavailable');}
  const result=await response.json() as RecordSnapshot;if(!result||!Number.isSafeInteger(result.revision)||result.revision<0||!result.data||typeof result.data!=='object')throw Error('Invalid Supabase record response');return result;
 }
 return {load:(user:string,operation?:string)=>rpc('og_load_records',{p_user:user,p_operation:operation??null}),save:(user:string,revision:number,operation:string,data:Data)=>rpc('og_save_records',{p_user:user,p_revision:revision,p_operation:operation,p_data:data})};
}
