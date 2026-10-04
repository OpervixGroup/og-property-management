import {getChatGPTUser} from '@/app/chatgpt-auth';
import {access} from '@/lib/server/request';
import {load} from '@/lib/storage';
import {managers,reviewers,scopedUnits} from '@/lib/access-policy';
import {workOrderPDF} from '@/lib/work-order-report';
export async function GET(request:Request){try{const u=access(await getChatGPTUser(),['Global Admin','Management','Accountant','External CPA','Analyst / Agent','Maintenance']),{data}=await load(u.userId),id=new URL(request.url).searchParams.get('id'),w=data.operations?.workOrders.find(w=>w.id===id);if(!w||!managers(u.role)&&!reviewers(u.role)&&!scopedUnits(u.member,data).some(x=>x.id===w.unitId))throw Error('Work order unavailable');const pdf=await workOrderPDF(data,w.id);return new Response(await pdf.arrayBuffer(),{headers:{'Content-Type':'application/pdf','Content-Disposition':'inline; filename="'+w.number.replace(/[^a-zA-Z0-9_-]/g,'_')+'.pdf"','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});}catch{return Response.json({error:'Work order access denied or unavailable'},{status:403});}}
