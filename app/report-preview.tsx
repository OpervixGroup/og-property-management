'use client';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {csv,download} from '@/lib/exports';
import {Grid} from './report-controls';
export type PreviewReport={title:string;rows:unknown[][];note?:string};
export default function ReportPreview({report,close}:{report:PreviewReport|null;close:()=>void}){return <Dialog open={!!report} onOpenChange={v=>{if(!v)close();}}><DialogContent className="app-dialog ops-dialog"><DialogHeader><DialogTitle>{report?.title??'Report'}</DialogTitle><DialogDescription>{report?.note??'All matching saved records. Letter printing includes every row.'}</DialogDescription></DialogHeader>{report&&<><button onClick={()=>download(new Blob([csv(report.rows)],{type:'text/csv'}),report.title.replace(/[^a-zA-Z0-9_-]/g,'_')+'.csv')}>Export CSV</button><Grid printTitle={report.title} printNote={report.note} headers={(report.rows[0]??[]).map(String)} rows={report.rows.slice(1).map(row=>row.map(c=>String(c??'')))}/></>}</DialogContent></Dialog>;}
