// Print only the chosen report, with no sidebar, form controls or pagination.
export function printReport(element:HTMLElement){
 const frame=document.createElement('iframe');frame.title='Print report';frame.className='report-print-frame';
 const html=element.cloneNode(true) as HTMLElement;
 html.querySelectorAll('button,input,select,.no-print,.toolbar,.leasing-screen-table').forEach(node=>node.remove());
 frame.srcdoc='<!doctype html><html><head><meta charset="utf-8"><title>Owner distribution statement</title><style>@page{size:letter;margin:.5in}body{font:12px Arial,sans-serif;color:#173b56}h1,h2,h3{break-after:avoid}table{width:100%;border-collapse:collapse}th,td{padding:8px;border-bottom:1px solid #ccd8e6;text-align:left}thead{display:table-header-group}tr,dl>div{break-inside:avoid}dl>div{display:flex;justify-content:space-between;padding:7px;border-bottom:1px solid #ccd8e6}dd{margin:0}article{break-before:page}article:first-of-type{break-before:auto}.devonshire-wordmark{font:italic bold 32px Georgia;color:#a27a23}.toolbar,.no-print,.leasing-screen-table{display:none}.leasing-print-table{display:table}.owner-report-preview{max-height:none;overflow:visible}.paper-note,.owner-report-preview article>p{white-space:pre-wrap;overflow-wrap:anywhere}</style></head><body>'+html.outerHTML+'</body></html>';
 const cleanup=()=>frame.remove();
 frame.onload=()=>{const target=frame.contentWindow;if(!target){cleanup();return;}target.addEventListener('afterprint',cleanup,{once:true});target.focus();target.print();};
 document.body.append(frame);
 // Some browser PDF/print implementations do not emit afterprint.
 setTimeout(cleanup,300000);
}
