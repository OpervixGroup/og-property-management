'use client';
import {useState} from 'react';
import {createPortal} from 'react-dom';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {letterReportPDF} from '@/lib/letter-report';
import {download} from '@/lib/exports';
import {toast} from 'sonner';
export default function PrintPreview({title,lines,label='Print / PDF'}:{title:string;lines:string[];label?:string}){const [open,setOpen]=useState(false);async function pdf(){try{download(await letterReportPDF(title,lines),title.replace(/[^a-zA-Z0-9_-]/g,'_')+'.pdf');}catch(e){toast.error((e as Error).message);}}const sheet=<article className="og-letter-sheet"><h1>{title}</h1>{lines.map((line,i)=><p key={i}>{line||'\u00a0'}</p>)}<footer>OG · Letter size · 8.5 × 11 inches</footer></article>;return <><button type="button" className="secondary" onClick={()=>setOpen(true)}>{label}</button><Dialog open={open} onOpenChange={setOpen}><DialogContent className="app-dialog print-dialog"><DialogHeader><DialogTitle>Print · {title}</DialogTitle><DialogDescription>US Letter · all matching records · select Letter in your printer settings.</DialogDescription></DialogHeader><div className="toolbar"><button type="button" onClick={()=>window.print()}>Print</button><button type="button" onClick={pdf}>Download letter PDF</button></div><div className="print-preview-scroll">{sheet}</div></DialogContent></Dialog>{open&&createPortal(<div id="og-print-root">{sheet}</div>,document.body)}</>;}
