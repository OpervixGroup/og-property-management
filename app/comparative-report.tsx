'use client';
import {useState} from 'react';
import type {Data} from '@/lib/pool';
import {native} from '@/lib/native-accounting';
import {nativeReport} from '@/lib/accounting-tools';
import {monthBounds} from '@/lib/tenancy';
import {money} from '@/lib/pool';
import {comparativeReport,type ComparativeName} from '@/lib/comparative-reports';
import {csv,download} from '@/lib/exports';
import {reportTablePDF} from '@/lib/report-pdf';
import {Grid,Pick} from './report-controls';
import {toast} from 'sonner';
export default function ComparativeReport({data,name,period}:{data:Data;name:ComparativeName;period:string}){
 const [detail,setDetail]=useState<{key:string;period:string}|null>(null),[bookId,setBookId]=useState(''),[exporting,setExporting]=useState(false);const books=native(data).books;
 let result:ReturnType<typeof comparativeReport>|null=null,error='';if(bookId)try{result=comparativeReport(data,bookId,name,period);}catch(e){error=(e as Error).message;}
 async function exportFile(pdf:boolean){if(!result)return;setExporting(true);try{const file='OG_'+name.replace(/[^a-z0-9]+/gi,'_')+'_'+period;download(pdf?await reportTablePDF(name,(books.find(b=>b.id===bookId)?.company??'')+' | '+period,result.note,result.headers,result.rows):new Blob([csv([result.headers,...result.rows])],{type:'text/csv'}),file+(pdf?'.pdf':'.csv'));}catch(e){toast.error((e as Error).message);}finally{setExporting(false);}}
 return <><label className="field">Company ledger<Pick label="Comparison company ledger" value={bookId||'none'} onChange={v=>{setBookId(v==='none'?'':v);setDetail(null);}} items={[{value:'none',label:'Choose company ledger'},...books.map(b=>({value:b.id,label:b.company+' · opening '+b.openingDate}))]}/></label>{!books.length&&<p className="notice">Initialize verified company opening balances in Accounting before running financial comparisons.</p>}{error&&<p role="alert">{error}</p>}{result&&<><p className="notice">{result.note}</p><div className="toolbar"><button disabled={exporting} onClick={()=>void exportFile(true)}>Download PDF / print</button><button className="secondary" disabled={exporting} onClick={()=>void exportFile(false)}>Export CSV</button></div><Grid headers={result.headers} rows={result.rows.map((row,i)=>row.map((v,j)=>j>0&&j<=result!.periods.length&&result!.raw[i].key!=='earnings'&&result!.raw[i].values[j-1]!==null?<button className="text-button" onClick={()=>setDetail({key:result!.raw[i].key,period:result!.periods[j-1]})}>{v}</button>:v))}/>{detail&&<section className="panel" aria-label="Comparison source details"><div className="panel-heading"><h4>Posted account activity · {detail.period}</h4><button className="secondary" onClick={()=>setDetail(null)}>Close source details</button></div><p>Monthly posted entries for this account. Balance sheet balances also include the verified opening and earlier activity.</p><Grid headers={['Date','Reference','Account','Debit','Credit','Running balance']} rows={nativeReport(data,bookId,'General ledger',detail.period+'-01',monthBounds(detail.period).last,detail.key).map(r=>[r.date,r.reference,r.label,money(r.debit),money(r.credit),money(r.balance)])}/></section>}</>}</>;
}
