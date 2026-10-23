// The CEO can request one bounded reviewed task; this never provisions a loop.
export function startHTTP({authenticate,isCEO,origin,execute}){return async request=>{
 const headers={'Cache-Control':'private, no-store'};
 try{
  const actor=await authenticate();if(!actor||!await isCEO(actor))return Response.json({error:'CEO access required'},{status:403,headers});
  if(!origin||request.headers.get('origin')!==new URL(origin).origin)return Response.json({error:'Invalid origin'},{status:403,headers});
  if((await request.text()).trim()!=='{}')return Response.json({error:'No arbitrary task input accepted'},{status:400,headers});
  const response=await execute();
  return new Response(await response.text(),{status:response.status,headers:{...headers,'Content-Type':'application/json'}});
 }catch{return Response.json({error:'Start not confirmed; inspect stored task outcome before retry'},{status:503,headers});}
};}
