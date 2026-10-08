import {platformOwner} from '@/lib/server/platform';
import {rpc} from '@/lib/server/supabase';
import {billingMonth} from '@/lib/subscription';
import {reconcileSubscriptions,type BillingAccount} from '@/lib/subscription-reconciliation';
export async function GET(request:Request){try{const owner=await platformOwner();if(!owner)return Response.json({error:'Super Admin access required'},{status:403});const month=new URL(request.url).searchParams.get('month')??billingMonth();if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))return Response.json({error:'Choose a valid month'},{status:400});const accounts=await rpc('og_billing_overview',{p_actor:owner.authId,p_workspace:null}) as BillingAccount[];return Response.json({...reconcileSubscriptions(accounts,month),generatedAt:new Date().toISOString(),providerConnected:false},{headers:{'Cache-Control':'private, no-store'}});}catch{return Response.json({error:'Reconciliation report unavailable'},{status:500,headers:{'Cache-Control':'no-store'}});}}
