import {PDFDocument,StandardFonts,rgb,type PDFFont,type PDFPage} from 'pdf-lib';
const safe=(v:string)=>v.normalize('NFKD').replace(/[^\x20-\x7E]/g,' ');
function wrap(text:string,font:PDFFont,size:number,width:number){const lines:string[]=[];let line='';for(const ch of safe(text)){if(line&&font.widthOfTextAtSize(line+ch,size)>width){lines.push(line);line='';}line+=ch;}lines.push(line);return lines;}
/** Landscape Letter, repeating headers; wide reports repeat the identity column in bands. */
export async function reportTablePDF(title:string,subtitle:string,note:string,headers:string[],rows:string[][]){
 if(!headers.length||headers.length>40||rows.some(r=>r.length!==headers.length))throw Error('Invalid report table');
 if(title.length>140||subtitle.length>400||note.length>1200||headers.some(h=>h.length>100))throw Error('Report heading is too long; shorten the heading before printing.');
 const pdf=await PDFDocument.create(),font=await pdf.embedFont(StandardFonts.Helvetica),bold=await pdf.embedFont(StandardFonts.HelveticaBold),serif=await pdf.embedFont(StandardFonts.TimesRoman);
 const navy=rgb(.065,.16,.23),gold=rgb(.66,.48,.25),ivory=rgb(.97,.96,.93),ink=rgb(.1,.2,.27);
 const bands:number[][]=[];if(headers.length<=6)bands.push(headers.map((_,i)=>i));else for(let i=1;i<headers.length;i+=5)bands.push([0,...headers.slice(i,i+5).map((_,j)=>i+j)]);
 let page!:PDFPage,y=0;
 for(const [bandIndex,band] of bands.entries()){
  const width=720/band.length,lineHeight=11,size=8;
  const headerLines=band.map(i=>wrap(headers[i],bold,size,width-12)),headHeight=Math.max(...headerLines.map(l=>l.length))*lineHeight+14;
  function addPage(continuation=''){page=pdf.addPage([792,612]);page.drawRectangle({x:0,y:529,width:792,height:83,color:navy});page.drawText('OPERVIX GROUP',{x:36,y:585,size:10,font:bold,color:gold});
   for(const [i,line] of wrap(title,serif,19,720).entries())page.drawText(line,{x:36,y:562-i*21,size:19,font:serif,color:rgb(1,1,1)});
   y=511;for(const line of wrap(subtitle+(continuation?' | '+continuation:'')+(bands.length>1?' | Column group '+(bandIndex+1)+' of '+bands.length:''),font,9,720)){page.drawText(line,{x:36,y,size:9,font,color:ink});y-=12;}
   for(const line of wrap(note,font,8,720)){page.drawText(line,{x:36,y,size:8,font,color:ink});y-=11;}
   y-=10;page.drawRectangle({x:36,y:y-headHeight,width:720,height:headHeight,color:navy});headerLines.forEach((lines,j)=>lines.forEach((text,k)=>page.drawText(text,{x:42+j*width,y:y-13-k*lineHeight,size,font:bold,color:rgb(1,1,1)})));y-=headHeight;
  }
  addPage();
  if(y<100)throw Error('Report headings leave insufficient room for rows; shorten the report heading or note.');
  if(!rows.length){page.drawText('No matching records for the selected scope.',{x:42,y:y-24,size:10,font,color:ink});}
  for(const [index,row] of rows.entries()){
   const lines=band.map(i=>wrap(row[i],font,size,width-12)),height=Math.max(...lines.map(l=>l.length));let offset=0;
   while(offset<height){let capacity=Math.floor((y-48-12)/lineHeight);if(capacity<1){addPage(offset?'Row '+(index+1)+' continued - '+safe(row[0]).slice(0,50):'');capacity=Math.floor((y-48-12)/lineHeight);}const count=Math.min(capacity,height-offset),rowHeight=count*lineHeight+12;
    page.drawRectangle({x:36,y:y-rowHeight,width:720,height:rowHeight,color:index%2===0?ivory:rgb(1,1,1)});
    lines.forEach((cell,j)=>cell.slice(offset,offset+count).forEach((text,k)=>page.drawText(text,{x:42+j*width,y:y-12-k*lineHeight,size,font,color:ink})));y-=rowHeight;offset+=count;
   }
  }
 }
 const pages=pdf.getPages();pages.forEach((p,i)=>{p.drawLine({start:{x:36,y:35},end:{x:756,y:35},thickness:.5,color:gold});p.drawText('OPERVIX GROUP | '+rows.length+' matching records',{x:36,y:21,size:8,font,color:ink});p.drawText('Page '+(i+1)+' of '+pages.length,{x:685,y:21,size:8,font,color:ink});});
 return new Blob([new Uint8Array(await pdf.save())],{type:'application/pdf'});
}
