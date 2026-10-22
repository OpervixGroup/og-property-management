import {appOriginAllowed} from './app-origin.mjs';
export function recoveryHTTP({authenticate,isCEO,origin,service}){
 const headers={'Cache-Control':'private, no-store'};
 const actor=async request=>{const a=await authenticate(request);return a&&await isCEO(a)?a:null;};
 return {
  async GET(request){const a=await actor(request);if(!a)return Response.json({error:'CEO access required'},{status:403,headers});try{return Response.json(await service.preview(a),{headers});}catch{return Response.json({error:'Recovery state unavailable; preserve hold'},{status:503,headers});}},
  async POST(request){
   const a=await actor(request);if(!a)return Response.json({error:'CEO access required'},{status:403,headers});
   if(!appOriginAllowed(request.headers.get('origin'),origin)||request.headers.get('content-type')!=='application/json')return Response.json({error:'Invalid origin or content type'},{status:403,headers});
   try{const body=await request.text();if(body.length>2000)throw Error();return Response.json(await service.reconcile(JSON.parse(body),a),{headers});}
   catch{return Response.json({error:'Recovery not confirmed. Read current state before any retry. Preserve the original lock and attempt.'},{status:409,headers});}
  }
 };
}
