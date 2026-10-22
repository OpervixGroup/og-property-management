import {clientLearningStatus} from './client-learning.mjs';
const headers={'Cache-Control':'private, no-store'};
export function learningStatusHTTP({authenticate,isCEO,origin,read,store,clock=()=>new Date().toISOString()}){
 const actor=async request=>{const a=await authenticate(request);return a&&await isCEO(a)?a:null;};
 return {
  async GET(request){try{if(!await actor(request))return Response.json({connected:false,error:'CEO access required'},{status:403,headers});return Response.json(clientLearningStatus(await read(),clock()),{headers});}catch{return Response.json({connected:false,error:'Learning state unavailable; hold execution'},{status:503,headers});}},
  async POST(request){try{
   if(!await actor(request))return Response.json({error:'CEO access required'},{status:403,headers});
   const approved=(Array.isArray(origin)?origin:[origin]).filter(v=>typeof v==='string'&&v).map(v=>new URL(v).origin);
   if(!approved.includes(request.headers.get('origin')))return Response.json({error:'Invalid origin'},{status:403,headers});
   const body=await request.text();if(body.length>3000)throw Error('Bounded control required');const p=JSON.parse(body);
   if(!p||Object.keys(p).length!==3||Object.keys(p).some(k=>!['clientId','paused','evidence'].includes(k))||!['devonshire-leasing','devonshire-hoa'].includes(p.clientId)||typeof p.paused!=='boolean'||typeof p.evidence!=='string'||!p.evidence.trim()||p.evidence.length>1000)throw Error('Exact client pause required');
   await store.transaction(s=>{const c=s.clientLearning?.clients?.[p.clientId];if(!c||!Number.isSafeInteger(s.control?.epoch))throw Error('Registry unavailable');c.paused=p.paused;s.control.epoch++;s.clientLearning.controlHistory??=[];s.clientLearning.controlHistory.push({at:clock(),clientId:p.clientId,paused:p.paused,evidence:p.evidence,source:'authenticated-ceo'});return true;});
   return Response.json(clientLearningStatus(await read(),clock()),{headers});
  }catch{return Response.json({connected:false,error:'Client pause change not confirmed; refresh before retry'},{status:503,headers});}}
 };
}
