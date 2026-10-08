import {notFound,redirect} from 'next/navigation';
import {platformOwner} from '@/lib/server/platform';
import {getChatGPTUser} from '@/app/chatgpt-auth';
import {access} from '@/lib/server/request';
import {rpc} from '@/lib/server/supabase';
import SubscriptionInvoice from '../invoice';
export const dynamic='force-dynamic';
export default async function Page({params}:{params:Promise<{id:string}>}){const {id}=await params;if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))notFound();const owner=await platformOwner();let actor:string,workspace:string|null;if(owner){actor=owner.authId;workspace=null;}else{let user;try{user=access(await getChatGPTUser(),['Global Admin']);}catch{redirect('/login');}actor=user.authId;workspace=user.userId;}const accounts=await rpc('og_billing_overview',{p_actor:actor,p_workspace:workspace}) as {name:string;receipt_email?:string;invoices:{id:string;month:string;unit_ids:string[];total_cents:number;status:string}[]}[];const account=accounts.find(a=>a.invoices.some(i=>i.id===id)),invoice=account?.invoices.find(i=>i.id===id);if(!account||!invoice)notFound();if(invoice.total_cents!==999+110*invoice.unit_ids.length)throw Error('Subscription invoice totals require review');return <SubscriptionInvoice company={account.name} receiptEmail={account.receipt_email??''} invoice={invoice} back={owner?'/platform':'/workspace'}/>;}
