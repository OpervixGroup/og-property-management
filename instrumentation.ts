import type {Instrumentation} from 'next';
export const onRequestError:Instrumentation.onRequestError=async(error,_request,context)=>{if(process.env.NEXT_RUNTIME==='nodejs'){const {recordIncident}=await import('./lib/server/support');await recordIncident('Server '+context.routeType,context.routePath,(error as {digest?:string})?.digest);}};
