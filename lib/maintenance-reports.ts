import type {Data} from './pool';
import type {MaintenanceSection} from './maintenance-model';
import {laborCost} from './operations-model';
import {partStock} from './procurement-model';
export function maintenanceReportRows(data:Data,section:MaintenanceSection,report:string):unknown[][]{
 const ops=data.operations,unit=(id:string)=>data.units.find(u=>u.id===id)?.number??'Property-wide',price=(n:number)=>(n/100).toFixed(2);
 const kind=section==='Inspections'?'Inspection':section==='Unit Turns'?'Unit turn':section==='Projects'?'Project':null;
 const work=(ops?.workOrders??[]).filter(w=>!kind||w.kind===kind);
 if(report==='Recurring Work Order')return [['schedule','unit','work_type','assigned_to','vendor','next_due','interval_months','status','instructions'],...(ops?.recurringWork??[]).map(r=>[r.title,unit(r.unitId),r.kind??'Repair',r.assignee,r.vendor,r.nextDate,r.intervalMonths,r.active?'Active':'Paused',r.description])];
 if(section==='Purchase Orders')return [['order','unit','work_order','supplier','description','date','expected_date','planned_amount','status','approval_recorded_by'],...(ops?.purchaseOrders??[]).map(r=>[r.number,unit(r.unitId),ops?.workOrders.find(w=>w.id===r.workOrderId)?.number??'',r.supplier,r.description,r.date,r.expectedDate,price(r.amount),r.status,r.approvedBy])];
 if(section==='Fixed Assets')return [['asset_tag','asset','unit_location','serial','acquired','recorded_cost','next_service','status'],...(ops?.fixedAssets??[]).map(r=>[r.tag,r.name,unit(r.unitId),r.serial,r.acquired,price(r.cost),r.nextService,r.status])];
 if(section==='Inventory'){const p=data.procurement;if(report==='Bulk Purchases')return [['date','part','supplier','reference','quantity','purchase_cost'],...(p?.purchases??[]).map(r=>[r.date,p?.parts.find(a=>a.id===r.partId)?.name,r.supplier,r.reference,r.quantity,price(r.totalCost)])];if(report==='Unit Usage')return [['date','unit','reference','part','quantity','list_price','owner_charge'],...(p?.issues??[]).map(r=>[r.date,unit(r.unitId),r.reference,r.partName,r.quantity,price(r.listPrice),price(r.totalCharge)])];return [['sku','part','measure','stock_quantity','list_price','reorder_at','status'],...(p?.parts??[]).map(r=>[r.sku,r.name,r.measure,partStock(p!,r.id),price(r.listPrice),r.reorderAt,r.active?'Active':'Inactive'])];}
 if(report==='Labor Summary')return [['work_order','unit','technician','vendor','status','hours','hourly_rate','tracked_labor'],...work.map(w=>[w.number,unit(w.unitId),w.assignee,w.vendor,w.status,price(w.hours100),price(w.rate),price(laborCost(w))])];
 if(report==='Billable Detail')return [['work_order','unit','title','status','owner_approval_recorded','tracked_labor','tracked_materials','tracked_total'],...work.map(w=>[w.number,unit(w.unitId),w.title,w.status,w.ownerApproved?'Yes':'No',price(laborCost(w)),price(w.materials),price(laborCost(w)+w.materials)])];
 if(report==='Unit Inspection')return [['unit','inspection','status','scheduled','assigned_to','findings_notes'],...work.map(w=>[unit(w.unitId),w.title,w.status,w.scheduled,w.assignee||w.vendor,w.notes])];
 return [['work_order','unit','work_type','title','description','priority','status','technician','vendor','scheduled','follow_up','estimate','notes'],...work.map(w=>[w.number,unit(w.unitId),w.kind,w.title,w.description,w.priority,w.status,w.assignee,w.vendor,w.scheduled,w.followUp,price(w.estimate),w.notes])];
}

