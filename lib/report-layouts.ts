import type {Data} from './pool';
import {canonicalRecord} from './workflow-controls';
import {operationalReports,operationalReport,type OperationalReportId} from './report-center';
export type ReportLayout={id:string;name:string;reportId:OperationalReportId;propertyId:string;columns:string[];sort:string;descending:boolean;created:string;reviewer:string;archived:boolean};
export function validateReportLayouts(old:Data,next:Data){
 const rows=next.reportLayouts??[],prior=old.reportLayouts??[];
 if(!Array.isArray(rows)||rows.length>500||new Set(rows.map(r=>r.id)).size!==rows.length)throw Error('Invalid saved report layouts');
 for(const r of rows){
  if(!r.id||typeof r.name!=='string'||!r.name.trim()||r.name.length>100||!r.reviewer?.trim()||!Number.isFinite(Date.parse(r.created))||typeof r.archived!=='boolean'||typeof r.descending!=='boolean'||!operationalReports.some(v=>v[0]===r.reportId)||r.propertyId&&!next.properties.some(p=>p.id===r.propertyId))throw Error('Choose a valid saved report name and scope');
  const headers=operationalReport(next,r.reportId,next.periods[0]?.month??'2026-01').headers;
  if(!Array.isArray(r.columns)||!r.columns.length||new Set(r.columns).size!==r.columns.length||r.columns.some(c=>!headers.includes(c))||r.sort&&!headers.includes(r.sort))throw Error('Choose valid report columns and sorting');
 }
 for(const p of prior){const r=rows.find(r=>r.id===p.id);if(!r)throw Error('Archive saved reports without removing history');const {archived:a,...before}=p,{archived:b,...after}=r;if(canonicalRecord(before)!==canonicalRecord(after)||p.archived&&!r.archived)throw Error('Saved report history is immutable; save a new layout');}
}
export function saveReportLayout(d:Data,input:Omit<ReportLayout,'id'|'created'|'archived'>){const next=structuredClone(d);(next.reportLayouts??=[]).push({...input,name:input.name.trim(),id:crypto.randomUUID(),created:new Date().toISOString(),archived:false});validateReportLayouts(d,next);return next;}
export function arrangeReportRows(rows:{values:string[];unitId:string}[],headers:string[],query:string,sort:string,descending:boolean){
 const index=headers.indexOf(sort),collator=new Intl.Collator('en-US',{numeric:true,sensitivity:'base'});
 const number=(s:string)=>/^\(?-?\$?[\d,]+(?:\.\d+)?\)?$/.test(s.trim())?Number(s.replace(/[$,()]/g,''))*(s.includes('(')?-1:1):null;
 return rows.filter(r=>r.values.join(' ').toLowerCase().includes(query.toLowerCase())).map((r,i)=>({...r,index:i})).sort((a,b)=>{if(index<0)return a.index-b.index;const an=number(a.values[index]),bn=number(b.values[index]);return (an!==null&&bn!==null?an-bn:collator.compare(a.values[index],b.values[index]))*(descending?-1:1)||a.index-b.index;}).map(({index,...r})=>r);
}
