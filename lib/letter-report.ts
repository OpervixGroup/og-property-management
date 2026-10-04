import {PDFDocument,StandardFonts,rgb} from 'pdf-lib';
export async function letterReportPDF(title:string,lines:string[]){
 const pdf=await PDFDocument.create(),font=await pdf.embedFont(StandardFonts.Helvetica),bold=await pdf.embedFont(StandardFonts.HelveticaBold);const clean=(s:string)=>s.normalize('NFKD').replace(/[^\x20-\x7e\n]/g,' ');
 function wrap(s:string,size:number,f=font){const out:string[]=[];for(const paragraph of clean(s).split('\n')){let line='';for(const character of paragraph){if(f.widthOfTextAtSize(line+character,size)>516&&line){out.push(line);line='';}line+=character;}out.push(line);}return out;}
 let page=pdf.addPage([612,792]),y=738;const heading=wrap(title,14,bold);function header(){for(const line of heading){page.drawText(line,{x:48,y,size:14,font:bold,color:rgb(.05,.2,.3)});y-=18;}y-=12;}header();for(const text of lines)for(const line of wrap(String(text),10)){if(y<65){page=pdf.addPage([612,792]);y=738;header();}if(line)page.drawText(line,{x:48,y,size:10,font});y-=15;}
 for(const [i,p] of pdf.getPages().entries())p.drawText('OG | Letter 8.5 x 11 in | Page '+(i+1)+' of '+pdf.getPageCount(),{x:48,y:32,size:8,font,color:rgb(.4,.4,.4)});
 return new Blob([new Uint8Array(await pdf.save())],{type:'application/pdf'});
}
