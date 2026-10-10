import {type Data,money,latest,totals,isParticipating,ownerAt} from './pool';
import {monthBounds,monthTenants,expectedUnitRent} from './tenancy';
import {tenantArrears,ownerOutstanding} from './month-close';
import {recordState} from './workflow-controls';
import {isOwnerContact} from './contact-directory';
import {laborCost} from './operations-model';
export const operationalReports=[
 ['owners','Owner directory','Owners'],['distributions','Owner distribution register','Owners'],
 ['units','Unit directory & membership','Properties'],['rent-roll','Rent roll','Leasing'],
 ['occupancy','Occupancy & vacancy','Leasing'],['leases','Lease history','Leasing'],['expirations','Lease expirations','Leasing'],
 ['prospects','Guest cards & leasing pipeline','Leasing'],['sources','Prospect source tracking','Leasing'],
 ['applications','Rental applications','Leasing'],['showings','Showings','Leasing'],['renewals','Renewal history','Leasing'],
 ['vehicles','Resident vehicles','Residents'],['keys','Unit & mailbox keys','Properties'],['properties','Property directory','Properties'],
 ['tenants','Tenant directory','Residents'],['unpaid','Tenant unpaid charges','Residents'],['receipts','Tenant receipt register','Residents'],['charges','Tenant charge & credit register','Residents'],
 ['vendors','Vendor directory','Maintenance'],['work','Work order register','Maintenance'],['labor','Work order labor','Maintenance'],['inspections','Inspections & unit turns','Maintenance'],
 ['audit','Account activity','Diagnostics']
] as const;
export type OperationalReportId=typeof operationalReports[number][0];
export type ReportTable={headers:string[];rows:string[][];unitIds:string[];note:string};
export function operationalReport(d:Data,id:OperationalReportId,period:string,propertyId=''):ReportTable{
 if(!operationalReports.some(r=>r[0]===id))throw Error('Choose a supported report');
 const {last:end}=monthBounds(period),start=period+'-01',units=d.units.filter(u=>(!propertyId||u.propertyId===propertyId)&&(!u.addedMonth||u.addedMonth<=period)),ids=new Set(units.map(u=>u.id)),ops=d.operations;
 const number=(id:string)=>units.find(u=>u.id===id)?.number??'Company',owner=(id:string)=>d.owners.find(o=>o.id===ownerAt(d,id,end))?.name??'Not recorded';
 let headers:string[]=[],rows:string[][]=[],unitIds:string[]=[];
 const add=(id:string,values:unknown[])=>{unitIds.push(id);rows.push(values.map(v=>String(v??'')));};
 const leases=(ops?.leases??[]).filter(l=>ids.has(l.unitId)&&l.start<=end);
 const tenants=(ops?.tenants??[]).filter(t=>ids.has(t.unitId)&&t.start<=end&&(!t.end||t.end>=start));
 if(id==='owners'){headers=['Owner','Unit','Email','Phone','Payment preference'];for(const u of units){const o=d.owners.find(o=>o.id===ownerAt(d,u.id,end));add(u.id,[o?.name,number(u.id),o?.email,o?.phone,o?.paymentMethod]);}}
 if(id==='units'){headers=['Unit','Property','Owner','Type','Pool participation'];for(const u of units)add(u.id,[u.number,d.properties.find(p=>p.id===u.propertyId)?.name,owner(u.id),u.type===1?'1/1':'2/2',isParticipating(d,u,period)?'Active':'Excluded']);}
 if(id==='distributions'){headers=['Owner','Unit','Status','Pool allocation','Deductions','Proposed distribution','Recorded payments','Closing balance'];for(const s of latest(d,period).filter(s=>ids.has(s.unitId))){const t=totals(s);add(s.unitId,[d.owners.find(o=>o.id===s.ownerId)?.name,number(s.unitId),s.status,money(s.allocated),money(t.deductions),money(t.available),money(s.paidAmount),money(ownerOutstanding(d,s))]);}}
 if(id==='rent-roll'){headers=['Unit','Tenant','Expected monthly rent','Verification','Tenancy start','Tenancy end'];for(const u of units){const rent=expectedUnitRent(d,u,period),ts=monthTenants(d,u.id,period);add(u.id,[u.number,ts.map(t=>t.firstName+' '+t.lastName).join('; ')||'Not recorded',rent.cents===null?'Unverified':money(rent.cents),rent.source,ts.map(t=>t.start).join('; '),ts.map(t=>t.end||'Active').join('; ')]);}}
 if(id==='occupancy'){headers=['Unit','Owner','Verified occupancy','Marketing status'];for(const u of units){const o=ops?.occupancy?.find(o=>o.unitId===u.id&&o.month===period);add(u.id,[u.number,owner(u.id),o?.status??'Unverified',o?.marketingStatus??'Not recorded']);}}
 if(id==='leases'||id==='expirations'){headers=['Unit','Tenant','Start','End','Contract rent','Status'];for(const l of leases.filter(l=>id==='leases'||l.end>=start&&l.end<=end))add(l.unitId,[number(l.unitId),l.tenant,l.start,l.end,money(l.rent),l.status]);}
 if(id==='prospects'||id==='sources'){headers=['Unit','Prospect','Stage','Source','Tour','Follow-up'];for(const p of ops?.prospects??[])if((ids.has(p.unitId)||!propertyId&&!p.unitId)&&recordState(d,'prospects',p.id)==='Active'&&(!p.tour||p.tour<=end))add(p.unitId,[number(p.unitId),p.name,p.stage,p.source??'Not recorded',p.tour,p.followUp]);}
 if(id==='tenants'){headers=['Unit','Tenant','Email','Phone','Start','End'];for(const t of tenants)add(t.unitId,[number(t.unitId),t.firstName+' '+t.lastName,t.email,t.cell,t.start,t.end||'Active']);}
 if(id==='applications'){headers=['Unit','Applicant','Submitted','Status','Decision date'];for(const a of ops?.rentalApplications??[])if(ids.has(a.unitId)&&a.submitted>=start&&a.submitted<=end)add(a.unitId,[number(a.unitId),ops?.prospects.find(p=>p.id===a.prospectId)?.name,a.submitted,a.status,a.decided]);}
 if(id==='showings'){headers=['Unit','Prospect','Date','Time','Host','Status'];for(const s of ops?.leasingShowings??[])if(ids.has(s.unitId)&&s.date>=start&&s.date<=end)add(s.unitId,[number(s.unitId),ops?.prospects.find(p=>p.id===s.prospectId)?.name,s.date,s.time,s.assignee,s.status]);}
 if(id==='renewals'){headers=['Unit','Tenant','Original lease','Renewal start','End','Rent','Status'];for(const l of leases.filter(l=>l.renewalOf))add(l.unitId,[number(l.unitId),l.tenant,l.renewalOf,l.start,l.end,money(l.rent),l.status]);}
 if(id==='vehicles'){headers=['Unit','Resident','Plate','Make','Year','Second plate','Second make','Second year'];for(const t of tenants)add(t.unitId,[number(t.unitId),t.firstName+' '+t.lastName,t.vehiclePlate,t.vehicleMake,t.vehicleYear,t.secondVehiclePlate,t.secondVehicleMake,t.secondVehicleYear]);}
 if(id==='keys'){headers=['Unit','Resident','Unit key','Mailbox key'];for(const t of tenants)add(t.unitId,[number(t.unitId),t.firstName+' '+t.lastName,t.unitKeyNumber,t.mailKeyNumber]);}
 if(id==='properties'){headers=['Property','Company','Address','City','State','ZIP','Phone','Email'];for(const p of d.properties.filter(p=>!propertyId||p.id===propertyId))add('',[p.name,p.companyName,p.address,p.city,p.state,p.zip,p.phone,p.email]);}
 if(id==='unpaid'){headers=['Unit','Tenant','Charge date','Reference','Charge','Outstanding'];for(const r of tenantArrears(d,period)){const t=ops?.tenants?.find(t=>t.id===r.entry.tenantId);if(t&&ids.has(t.unitId))add(t.unitId,[number(t.unitId),t.firstName+' '+t.lastName,r.entry.date,r.entry.reference,r.entry.description,money(r.remaining)]);}}
 if(id==='receipts'||id==='charges'){headers=['Unit','Tenant','Date','Kind','Reference','Description','Amount'];for(const e of ops?.tenantEntries??[]){const t=ops?.tenants?.find(t=>t.id===e.tenantId);if(t&&ids.has(t.unitId)&&e.date>=start&&e.date<=end&&(id==='receipts'?e.kind==='Receipt':e.kind!=='Receipt'))add(t.unitId,[number(t.unitId),t.firstName+' '+t.lastName,e.date,e.kind,e.reference,e.description,money(e.cents)]);}}
 if(id==='vendors'){headers=['Vendor','Company','Email','Phone','Scope'];for(const v of ops?.vendorContacts??[])if(!propertyId&&!isOwnerContact(d,v))add('',[v.name,v.company,v.email,v.phone,'Shared company contact']);for(const v of ops?.unitVendors??[])if(ids.has(v.unitId)&&v.start<=end&&(!v.end||v.end>=start)&&!isOwnerContact(d,v))add(v.unitId,[v.name,'',v.email,v.cell,'Unit '+number(v.unitId)]);}
 if(['work','labor','inspections'].includes(id)){headers=['Unit','Work order','Title','Status','Assigned','Scheduled','Labor hours','Hourly rate','Labor amount'];for(const w of ops?.workOrders??[])if(ids.has(w.unitId)&&w.created.slice(0,10)<=end&&recordState(d,'workOrders',w.id)==='Active'&&(id!=='inspections'||['Inspection','Unit turn'].includes(w.kind)))add(w.unitId,[number(w.unitId),w.number,w.title,w.status,w.assignee,w.scheduled,(w.hours100/100).toFixed(2),money(w.rate),money(laborCost(w))]);}
 if(id==='audit'){headers=['Date','Action','Detail'];if(!propertyId)for(const a of d.audit.filter(a=>a.at.slice(0,10)>=start&&a.at.slice(0,10)<=end))add('',[a.at,a.action,a.detail]);}
 return {headers,rows,unitIds,note:id==='distributions'?'Office review only. Includes current saved drafts; approved owner-facing packets are prepared separately.':id==='prospects'||id==='sources'?'Current saved pipeline, filtered by tour cutoff. OG does not reconstruct historical stages.':id==='work'||id==='labor'||id==='inspections'?'Saved work created through month end; current status and rates, not historical snapshots.':id==='audit'&&propertyId?'Company-wide audit details are excluded when filtering one property. Clear the property filter to review authorized company activity.':'Saved OG records for the selected month. Missing records or opening balances do not prove zero balances.'};
}
