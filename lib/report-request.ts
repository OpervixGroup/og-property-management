export async function reportRequest(url:string){
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),120000);
 try{const response=await fetch(url,{cache:'no-store',signal:controller.signal});
  if(!response.ok){const message=await response.json().catch(()=>({error:'Report unavailable. Please retry.'}));throw Error(message.error??'Report generation failed.');}
  const blob=await response.blob();if(!blob.size)throw Error('The report is empty. Please retry.');return blob;
 }catch(e){if(controller.signal.aborted)throw Error('Report preparation timed out. Retry with fewer units or without receipts.');throw e;}finally{clearTimeout(timeout);}
}
