import {answerGuide,type GuideAnswer} from './assistant-guide';
import {managers,reviewers,scopedUnits,type Member} from './access-policy';
import {type Data,isParticipating,money,latest,totals} from './pool';
import {recordState} from './workflow-controls';
import {monthBounds,expectedUnitRent} from './tenancy';
import {tenantArrears,closeReview,closeState} from './month-close';
export type AssistantAnswer=GuideAnswer&{unitNumber?:string;sources:string[];mode:'Saved records'|'Workflow guide'|'Clarification'};
export function answerRecords(d:Data,member:Member,question:string,period:string,context='home',priorUnit=''):AssistantAnswer{
 const q=question.trim().toLowerCase(),full=managers(member.role)||reviewers(member.role),finance=member.role!=='Maintenance',units=full?d.units:scopedUnits(member,d),ids=new Set(units.map(u=>u.id));monthBounds(period);
 const result=(text:string,guideIds:string[],questions:string[],sources:string[],unitNumber?:string):AssistantAnswer=>({text,guideIds,questions,sources,unitNumber,mode:'Saved records'});
 const explicit=[...q.matchAll(/\bunit\s*#?\s*(\d{1,6})\b/g)].map(m=>m[1]);if(/^\d{1,6}$/.test(q))explicit.push(q);
 if(new Set(explicit).size>1)return {...result('Please review one unit at a time. Which unit should I open first?',[],explicit.slice(0,3).map(n=>'Show unit '+n),[]),mode:'Clarification'};
 const number=explicit[0]||(/rent|balance|work order|occupancy|owner/.test(q)&&!/\b(my|all|vacant|units|this month|dla|review)\b/.test(q)?priorUnit:''),unit=number?units.find(u=>u.number===number):undefined;
 if(number&&!unit)return {...result('That unit is unavailable in your assigned workspace. Check the unit number or contact Management.',[],['Show my open work orders'],[]),mode:'Clarification'};
 const arrearsRows=tenantArrears(d,period).map(r=>({...r,unit:d.units.find(u=>u.id===d.operations?.tenants?.find(t=>t.id===r.entry.tenantId)?.unitId)})).filter((r):r is typeof r & {unit:Data['units'][number]}=>!!r.unit);
 if(unit&&!finance&&/rent|balance|owed|paid|income|fees?|distribution|owner|hoa|escrow|payment/.test(q))return result('Your Maintenance role does not include tenant or owner financial balances. I can show unit occupancy and assigned work orders.', ['maintenance'],['Show work orders for unit '+unit.number],['OG access policy'],unit.number);
 const activeWork=(d.operations?.workOrders??[]).filter(w=>ids.has(w.unitId)&&recordState(d,'workOrders',w.id)==='Active'&&!['Completed','Canceled','Cancelled'].includes(w.status));
 const how=/\b(how|steps|procedure|where|help me|guide)\b/.test(q);
 // Accounting workflow requests must precede generic arrears and unit-balance matching.
 const accountingGuide=answerGuide(question,context);
 if(accountingGuide.guideIds.some(id=>id.startsWith('accounting-')))return {...accountingGuide,sources:['OG accounting workflow knowledge base'],mode:'Workflow guide'};
 if(!how&&/\b(dla|10k|10,?000|agency income|shortfall)\b/.test(q)){
  if(!full)return result('DLA income is restricted to Management, Global Admin and accounting reviewers. I can help with records in your assigned scope.',[],['Show my open work orders'],['OG access policy']);
  const r=closeReview(d,period);return result('Private DLA review for '+period+': confirmed fee income '+money(r.summary.dlaIncome)+'. Review-only shortfall against the $10,000 minimum: '+money(r.summary.dlaShortfall)+'. This is income before operating expenses. Unconfirmed charges are not certified income; no additional fee is created.', ['accounting'],['What needs review this month?','How do I review GL mapping?'],['Saved income classifications and monthly close review']);
 }
 if(unit&&!how){
  const occupancy=d.operations?.occupancy?.find(o=>o.unitId===unit.id&&o.month===period)?.status??'Unverified',work=activeWork.filter(w=>w.unitId===unit.id);
  if(/\b(rent|balance|owed|owes|unpaid|paid|income|distribution|owner)\b/.test(q)){
   if(!finance)return result('Your Maintenance role does not include tenant or owner financial balances. I can show unit occupancy and assigned work orders.', ['maintenance'],['Show work orders for unit '+unit.number],['OG access policy'],unit.number);
   const rent=expectedUnitRent(d,unit,period),arrears=arrearsRows.filter(r=>r.unit.id===unit.id),s=latest(d,period).find(s=>s.unitId===unit.id),lines=['Unit '+unit.number+' · '+period,'Expected rent: '+(rent.cents===null?'Needs review — '+rent.review:money(rent.cents)+' ('+rent.source+')'),'Unpaid recorded tenant charges through month end: '+money(arrears.reduce((n,r)=>n+r.remaining,0))];
   if(s)lines.push('Latest owner statement: '+s.status+'; allocated pool share '+money(s.allocated)+'; calculated statement amount '+money(totals(s).available)+'. This amount is not a bank balance.');
   if(!arrears.length)lines.push('No outstanding recorded charges were found. This does not prove rent was invoiced or that opening balances were verified.');
   return result(lines.join('\n'),['people','statements'],['Show work orders for unit '+unit.number,'How do I match a tenant receipt?'],['Effective tenant/lease record','Saved tenant charge applications','Latest saved owner statement'],unit.number);
  }
  return result('Unit '+unit.number+' · '+period+'\nVerified occupancy: '+occupancy+'\nRent-pool participation: '+(isParticipating(d,unit,period)?'Participating':'Not participating')+'\nOpen work orders: '+work.length+(work.length?'\n'+work.slice(0,15).map(w=>w.number+' · '+w.status+' · '+w.title).join('\n'):''),['maintenance','properties'],finance?['What is the rent for unit '+unit.number,'Show my open work orders']:['Show my open work orders'],['Saved monthly occupancy','Effective pool membership','Active saved work orders'],unit.number);
 }
 if(!how&&/\b(vacant|vacancy|occupied|occupancy)\b/.test(q)){
  const vacant=units.filter(u=>d.operations?.occupancy?.some(o=>o.unitId===u.id&&o.month===period&&o.status==='Vacant')),occupied=units.filter(u=>d.operations?.occupancy?.some(o=>o.unitId===u.id&&o.month===period&&o.status==='Occupied'));
  return result(period+' · '+units.length+' units in your scope\nVerified vacant: '+vacant.length+(vacant.length?' — '+vacant.slice(0,25).map(u=>u.number).join(', '):'')+'\nVerified occupied: '+occupied.length+'\nOther or unverified occupancy: '+(units.length-vacant.length-occupied.length)+'\nVacancy does not automatically remove a unit from the rent pool.', ['leasing','properties'],vacant.length?['Show unit '+vacant[0].number,'How do I update occupancy?']:['How do I update occupancy?'],['Saved occupancy for selected month']);
 }
 if(!how&&/\b(work orders?|tickets?|maintenance queue)\b/.test(q))return result('Open work orders in your assigned scope: '+activeWork.length+(activeWork.length?'\n'+activeWork.slice(0,20).map(w=>w.number+' · Unit '+units.find(u=>u.id===w.unitId)?.number+' · '+w.status+' · '+w.title).join('\n'):'\nNo open saved work orders found.')+(activeWork.length>20?'\nShowing the first 20; open Maintenance for the full queue.':''),['maintenance'],activeWork.length?['Show unit '+units.find(u=>u.id===activeWork[0].unitId)?.number,'How do I print a work order?']:['How do I create a work order?'],['Active saved work orders']);
 if(!how&&/unpaid|who owes|arrears|overdue rent/.test(q)){
  if(!finance)return result('Tenant financial balances are outside your Maintenance access.',[],['Show my open work orders'],['OG access policy']);
  const rows=arrearsRows.filter(r=>ids.has(r.unit.id));return result('Outstanding recorded tenant charges through '+period+': '+money(rows.reduce((n,r)=>n+r.remaining,0))+' across '+new Set(rows.map(r=>r.unit.id)).size+' units.\n'+rows.slice(0,20).map(r=>'Unit '+r.unit.number+' · '+r.entry.date+' · '+r.entry.description+' · '+money(r.remaining)).join('\n')+'\nBalances come from saved charges and receipt applications, not the live QBO bank feed. Missing invoices/opening balances need review.', ['people'],['How do I match a tenant receipt?','What needs review this month?'],['Saved tenant charges and receipt applications']);
 }
 if(/what.*(next|review|attention)|month.*(ready|review)|ready.*close/.test(q)&&!how){
  if(full){const review=closeReview(d,period);return result(period+' · month status: '+(closeState(d,period)?.kind??'Not closed')+'\nOpen work orders: '+activeWork.length+'\nMonthly review: '+(review.blockers.length?review.blockers.map((b,i)=>(i+1)+'. '+b).join('\n'):'Financial checklist has no calculated blockers. Confirm bank and escrow references before closing.')+'\nI have not changed or closed anything.', ['accounting','maintenance'],['Show unpaid tenant charges','Show vacant units'],['Saved monthly close checklist','Active saved work orders']);}
  return result('Open work orders in your scope: '+activeWork.length+'. Review assigned work and request approval for cancel/delete actions. Monthly financial close is handled by Management.', ['maintenance'],['Show my open work orders'],['Assigned saved work orders','OG access policy']);
 }
 if(!how&&/\b(unit|rent|balance)\b/.test(q)&&!unit)return {...result('Which unit number should I review?',[],['Show unit 106','Show vacant units'],[]),mode:'Clarification'};
 const guide=answerGuide(question,context);return {...guide,unitNumber:unit?.number,sources:['OG workflow knowledge base'],mode:'Workflow guide'};
}
