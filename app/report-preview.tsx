'use client';
import {useRef,useState,type ReactNode} from 'react';
import {Eye} from 'lucide-react';
import {Dialog,DialogContent,DialogDescription,DialogHeader,DialogTitle} from '@/components/ui/dialog';
import {printReport} from '@/lib/print-report';

export default function ReportPreview({title,children,disabled=false,unsaved=false}:{title:string;children:ReactNode;disabled?:boolean;unsaved?:boolean}){
 const [open,setOpen]=useState(false);
 const paper=useRef<HTMLDivElement>(null);
 return <>
  <button className="secondary" disabled={disabled} onClick={()=>setOpen(true)}><Eye size={16}/> Preview</button>
  <Dialog open={open} onOpenChange={setOpen}>
   <DialogContent className="report-preview-dialog">
    <DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription>Review the statement and its work and price details before printing.</DialogDescription></DialogHeader>
    {unsaved&&<p className="notice" role="status">This preview includes unsaved changes. Save the draft before printing.</p>}
    <div className="report-preview-scroll"><div ref={paper}>{children}</div></div>
    <div className="toolbar"><button className="secondary" onClick={()=>setOpen(false)}>Close preview</button><button disabled={unsaved} onClick={()=>{if(paper.current)printReport(paper.current);}}>Print statement</button></div>
   </DialogContent>
  </Dialog>
 </>;
}
