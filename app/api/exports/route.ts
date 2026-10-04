import {sameOrigin} from '@/lib/server/request';
import {getChatGPTUser} from '@/app/chatgpt-auth';
import {fullAccess} from '@/lib/server/request';
import {load} from '@/lib/storage';
import {csv} from '@/lib/exports';
import {TENANT_COLUMNS} from '@/lib/tenant-import';
import {expectedUnitRent,monthTenants} from '@/lib/tenancy';
import {officeRent} from '@/lib/accounting-model';
import {ownerAt} from '@/lib/pool';
export async function GET(request:Request){try{
 const u=fullAccess(await getChatGPTUser()),url=new URL(request.url),kind=url.searchParams.get('kind'),period=url.searchParams.get('month')??'';
 let rows:unknown[][],name:string;
 if(kind==='tenant-template'){rows=[[...TENANT_COLUMNS]];name='OG_Tenant_Import_Template.csv';}
 else {const {data}=await load(u.userId);
  if(kind==='tenant-directory'){rows=[[...TENANT_COLUMNS],...(data.operations?.tenants??[]).map(t=>[data.units.find(u=>u.id===t.unitId)?.propertyId,data.units.find(u=>u.id===t.unitId)?.number,t.id,t.firstName,t.lastName,t.email,t.cell,t.start,t.end,t.rentConfirmed===false?'':(t.rent/100).toFixed(2),t.signedDate,t.address,t.secondFirstName,t.secondLastName,t.secondEmail,t.secondCell,t.pets,t.notes])];name='OG_Tenant_Directory.csv';}
  else if(kind==='rent-roll'){if(!data.periods.some(p=>p.month===period))throw Error('Choose an existing accounting month');rows=[['period','property_id','unit_id','unit','owner','tenant','expected_rent','rent_source','review','recorded_rent','receipt_source'],...data.units.map(unit=>{const rent=expectedUnitRent(data,unit,period),cash=officeRent(data,unit.id,period);return [period,unit.propertyId,unit.id,unit.number,data.owners.find(o=>o.id===ownerAt(data,unit.id,period+'-01'))?.name??'Unverified',monthTenants(data,unit.id,period).map(t=>t.firstName+' '+t.lastName).join(' / '),rent.cents===null?'':(rent.cents/100).toFixed(2),rent.source,rent.review,cash.cents===null?'':(cash.cents/100).toFixed(2),cash.source];})];name='OG_Shared_Rent_Roll_'+period+'.csv';}
  else throw Error('Choose a supported export');
 }
 return new Response('\uFEFF'+csv(rows),{headers:{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':'attachment; filename="'+name+'"','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
 }catch(e){return Response.json({error:e instanceof Error?e.message:'Export unavailable'},{status:400});}}

export async function POST(request:Request){try{sameOrigin(request);fullAccess(await getChatGPTUser());const limit=100000000;if(Number(request.headers.get('content-length')??0)>limit)throw Error('Download exceeds 100 MB; export a smaller package');const reader=request.body?.getReader();if(!reader)throw Error('Missing download');const chunks:Uint8Array[]=[];let size=0;while(true){const result=await reader.read();if(result.done)break;size+=result.value.byteLength;if(size>limit){await reader.cancel();throw Error('Download exceeds 100 MB; export a smaller package');}chunks.push(result.value);}const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}const parsed=await new Response(bytes,{headers:{'Content-Type':request.headers.get('content-type')??''}}).formData(),file=parsed.get('file');if(!(file instanceof File)||!file.size||!file.name.match(/\.(csv|pdf|zip|json)$/i))throw Error('Choose a CSV, PDF, ZIP or JSON report');const name=file.name.replace(/[^a-zA-Z0-9_.-]/g,'_').slice(-180);return new Response(await file.arrayBuffer(),{headers:{'Content-Type':file.type||'application/octet-stream','Content-Disposition':'attachment; filename="'+name+'"','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});}catch(e){return Response.json({error:e instanceof Error?e.message:'Download unavailable'},{status:400});}}
