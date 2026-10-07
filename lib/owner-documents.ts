import {PDFDocument,StandardFonts,rgb} from 'pdf-lib';
import {type Data,type Statement,type Expense,money,totals} from './pool';
import {ownerLedgerLine,packetApproved} from './owner-run';
import {contributionTotal,ownerOutstanding} from './month-close';
import {importedInvoiceRow} from './invoice-import';
import {statementNoteBlocks} from './statement-notes';
const ink=rgb(.10,.25,.36),blue=rgb(.90,.95,.99),gold=rgb(.81,.65,.24),muted=rgb(.39,.46,.52);
const safe=(v:string)=>String(v??'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^\x20-\x7E]/g,' ');
export async function ownerDocument(title:string,subtitle:string){
 const pdf=await PDFDocument.create(),font=await pdf.embedFont(StandardFonts.Helvetica),bold=await pdf.embedFont(StandardFonts.HelveticaBold),brand=await pdf.embedFont(StandardFonts.TimesRomanBoldItalic);let page=pdf.addPage([612,792]),y=610;
 const text=(v:string,x:number,at:number,size=10,strong=false)=>page.drawText(safe(v),{x,y:at,size,font:strong?bold:font,color:ink});
 function header(){page.drawText('Devonshire',{x:36,y:737,size:32,font:brand,color:gold});text('LEASING AGENCY INC.',38,720,8,true);text('11843 Braesview Main Office',320,749,10);text('San Antonio, Texas 78213',320,733,10);text('210-493-3161',320,717,10);text('www.devonshirecondos.com',320,701,10);page.drawLine({start:{x:36,y:685},end:{x:576,y:685},thickness:1,color:gold});text(title,36,662,16,true);}
 header();
 function ensure(h:number){if(y-h<70){page=pdf.addPage([612,792]);header();y=637;}}
 function note(v:string,size=9,strong=false){const words=safe(v).split(/\s+/);let row='';for(const w of words){if(font.widthOfTextAtSize(row+' '+w,size)>520){ensure(size+7);text(row,42,y,size,strong);y-=size+7;row=w;}else row+=(row?' ':'')+w;}if(row){ensure(size+7);text(row,42,y,size,strong);y-=size+7;}}
 text(subtitle.slice(0,110),36,642,9);y=619;
 function section(v:string,bodyHeight=0){ensure(Math.min(550,42+bodyHeight));y-=9;page.drawRectangle({x:36,y:y-7,width:540,height:23,color:blue});text(v,44,y,10,true);y-=30;}
 function row(label:string,value:string,strong=false){const words=safe(label).split(/\s+/),lines:string[]=[];let v='';for(const w of words){if(font.widthOfTextAtSize(v+' '+w,10)>395){lines.push(v);v=w;}else v+=(v?' ':'')+w;}if(v)lines.push(v);const h=Math.max(23,lines.length*14+9);ensure(h);page.drawLine({start:{x:36,y:y-h+12},end:{x:576,y:y-h+12},thickness:.4,color:rgb(.85,.89,.91)});lines.forEach((l,i)=>text(l,44,y-i*14,10,strong));page.drawText(safe(value),{x:566-(strong?bold:font).widthOfTextAtSize(safe(value),10),y,size:10,font:strong?bold:font,color:ink});y-=h;}
 function finish(){pdf.getPages().forEach((p,i)=>{p.drawLine({start:{x:36,y:48},end:{x:576,y:48},thickness:.5,color:gold});p.drawText('Powered by Opervix Group - www.opervixgroup.com',{x:36,y:32,size:7,font,color:muted});p.drawText('Page '+(i+1)+' of '+pdf.getPageCount(),{x:520,y:32,size:7,font,color:muted});});return pdf.save();}
 function detail(title:string,body:string){ensure(60);if(title)note(title,10,true);note(body);y-=10;}
 function detailHeight(title:string,body:string){const lines=(value:string,size:number)=>{let count=1,row='';for(const word of safe(value).split(/\s+/)){if(font.widthOfTextAtSize(row+' '+word,size)>520){count++;row=word;}else row+=(row?' ':'')+word;}return count;};return (title?lines(title,10)*17:0)+lines(body,9)*16+10;}
 return {pdf,section,row,note,detail,detailHeight,finish};
}
export async function brandedStatementPDF(d:Data,s:Statement,docs:{statementId:string;expenseId:string;name:string}[]){
 const u=d.units.find(u=>u.id===s.unitId),o=d.owners.find(o=>o.id===s.ownerId),t=totals(s),p=await ownerDocument('POOL RENT OWNER STATEMENT',s.period+' | Unit '+u?.number+' | Version '+s.version+' | '+(packetApproved(d,s)?'APPROVED REVIEWED PACKET':s.status==='Pending'?'DRAFT - NOT APPROVED':s.status));
 p.note('Owner: '+((s as any).ownerSnapshot?.name??o?.name??'Not assigned'),11);p.note('Property: '+(d.properties.find(p=>p.id===u?.propertyId)?.name??'Devonshire'));p.note('Opening owner balance '+(s.openingConfirmed?'verified':'requires review')+'.');
 p.section('POOL INCOME & OWNER CHARGES');p.row(s.status==='Pending'?'Draft pool allocation':'Allocated pool income',money(s.allocated),true);
 for(const e of s.expenses)p.row(e.label,money(-e.cents));for(const c of s.credits??[])p.row(c.label+' (credit)',money(c.cents));p.row('Total deductions',money(t.deductions),true);
 p.section('DISTRIBUTION SUMMARY');p.row('Opening owner balance',money(s.opening));if(s.adjustments)p.row('Other adjustments',money(s.adjustments));p.row(t.available<0?'Owner contribution due':'Proposed distribution',money(Math.abs(t.available)),true);const imported=ownerLedgerLine(d,s);if((s.cashPaid??s.paidAmount)+imported.cash)p.row('Cash distribution recorded',money((s.cashPaid??s.paidAmount)+imported.cash));if(imported.netting)p.row(imported.netting>0?'Internal owner offset applied':'Internal owner offset received',money(Math.abs(imported.netting)));if(s.offsetPaid)p.row('HOA offset applied',money(s.offsetPaid));if(s.offsetReceived)p.row('HOA offset received',money(s.offsetReceived));if(contributionTotal(d,s))p.row('Owner contributions received',money(contributionTotal(d,s)));p.row('Closing owner balance',money(ownerOutstanding(d,s)),true);
 if(s.paymentRef)p.note('Payment reference: '+s.paymentRef+' | '+s.paidDate);if(s.ownerNotes){const details=statementNoteBlocks(s.ownerNotes);p.section('WORK PERFORMED & MATERIAL PRICES',details.reduce((n,b)=>n+p.detailHeight(b.title,b.body),0));for(const detail of details)p.detail(detail.title,detail.body);}
 const support=docs.filter(x=>s.expenses.some(e=>e.id===x.expenseId)&&d.statements.some(v=>v.id===x.statementId&&v.unitId===s.unitId&&v.ownerId===s.ownerId));if(support.length){p.section('SUPPORTING INVOICES & RECEIPTS');for(const doc of support)p.note(doc.name);}
 return new Blob([new Uint8Array(await p.finish())],{type:'application/pdf'});
}
export async function expenseLaborInvoicePDF(d:Data,s:Statement,e:Expense){
 const r=importedInvoiceRow(d,e.id),post=d.accounting?.laborPosts.find(p=>p.id===e.laborPostId),w=d.operations?.workOrders.find(w=>w.id===post?.workOrderId),p=await ownerDocument('CONTRACTOR LABOR INVOICE',s.period+' | Unit '+d.units.find(u=>u.id===s.unitId)?.number+' | '+(r?.reference||w?.number||e.id));
 p.note('Contractor / service provider: '+e.recipient,11);p.note('Prepared by Devonshire Leasing Agency Inc. from recorded labor charges.');p.note('Owner: '+((s as any).ownerSnapshot?.name??d.owners.find(o=>o.id===s.ownerId)?.name??'Not assigned'));if(r)p.note('Charge date: '+r.date+' | Original reference: '+r.reference);
 p.section('LABOR DESCRIPTION');p.note(r?.description??e.label,11);if(post)p.row((post.hours100/100)+' hours x '+money(post.rate),money(post.cents));else p.row('Recorded contractor labor charge',money(e.cents));p.row('TOTAL LABOR CHARGE',money(e.cents),true);p.note('GL '+(e.gl??'Unassigned'));p.section('SUPPORT & PAYMENT STATUS');p.note('Original contractor invoice and work-order support are attached when available.');p.note('This presentation is not a second charge and is not proof of payment.');if(r)p.note('Source payment status: '+r.paymentState+(r.paymentMonth?' | Payment month '+r.paymentMonth:''));return new Blob([new Uint8Array(await p.finish())],{type:'application/pdf'});
}
