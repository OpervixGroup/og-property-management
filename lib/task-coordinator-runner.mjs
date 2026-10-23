// One authorized task per invocation. Scheduling and authenticated transport are
// the host's responsibility. No arbitrary command, email or URL execution.
export async function runOne({coordinator,id,worker,handlers}){
 const handler=handlers?.[id];if(typeof handler!=='function')throw Error('Reviewed exact-task handler required');
 const lease=await coordinator.claim(id,worker);
 await coordinator.checkpoint(id,lease.token);
 try{
  const outcome=await handler({checkpoint:()=>coordinator.checkpoint(id,lease.token)});
  await coordinator.checkpoint(id,lease.token);
  return await coordinator.finish(id,lease.token,{...outcome,status:'Succeeded'});
 }catch(error){
  // Do not convert pause, expired lease or uncertain effects into success.
  // The durable attempt stays Working until explicit expiry/reconciliation.
  throw new Error('Task stopped; reconcile persisted attempt before retry', {cause:error});
 }
}
