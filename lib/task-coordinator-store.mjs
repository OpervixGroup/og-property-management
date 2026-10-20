// Server-only adapter. client must use an existing authorized backend identity.
// Reducers must be synchronous and side-effect free: conflicts replay them.
export function durableStore(client,{attempts=5}={}){
 if(typeof client?.rpc!=='function'||!Number.isInteger(attempts)||attempts<1||attempts>10)throw Error('Bounded backend RPC adapter required');
 return {async transaction(reduce){
  for(let i=0;i<attempts;i++){
   const read=await client.rpc('og_coordinator_read');if(read.error)throw Error('Coordinator state unavailable');
   const row=read.data;if(!row||!Number.isSafeInteger(row.revision)||row.revision<0||!row.state)throw Error('Invalid durable coordinator state');
   const draft=structuredClone(row.state),result=reduce(draft);
   if(result&&typeof result.then==='function')throw Error('Transaction reducer must be synchronous and side-effect free');
   const write=await client.rpc('og_coordinator_cas',{expected_revision:row.revision,next_state:draft});
   if(write.error)throw Error('Coordinator commit failed; reconcile before retrying business effects');
   if(write.data===true)return structuredClone(result);
   if(write.data!==false)throw Error('Unknown commit outcome; reconcile before retry');
  }
  throw Error('Coordinator contention; bounded retry exhausted');
 }};
}
