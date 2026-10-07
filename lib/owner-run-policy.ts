import {audit,latest,isParticipating,type Data} from './pool';
import {canonicalRecord} from './workflow-controls';
import type {PaymentEvidence} from './owner-run';

export type OwnerRunPolicy={id:string;propertyId:string;version:number;reviewDay:number;evidenceHours:number;qboCompanyId:string;bankAccountId:string;bankName:string;source:string;reviewer:string;created:string};
export const ownerRunProtectionLabels=['One complete owner packet before payment','Exact statement and check amount match','Verified opening balances and monthly electricity','Supporting repair invoices before payment','Unique QBO transaction and bank check number','Verified original void before replacement','Explicit netting of negative unit balances','Separate paper printing and cash records','Fresh monthly amounts and owner carryforward','No automatic payment issuance'] as const;
export function ownerRunPolicy(d:Data,propertyId:string){return [...(d.ownerRunPolicies??[])].reverse().find(p=>p.propertyId===propertyId)??{id:'default',propertyId,version:0,reviewDay:5,evidenceHours:24,qboCompanyId:'',bankAccountId:'',bankName:'',source:'Devonshire safe defaults',reviewer:'',created:''};}
export function ownerReviewDeadline(d:Data,propertyId:string,period:string){return period==='2026-10'?period+'-07':period+'-'+String(ownerRunPolicy(d,propertyId).reviewDay).padStart(2,'0');}
export function saveOwnerRunPolicy(d:Data,input:Omit<OwnerRunPolicy,'id'|'version'|'created'>){
 const row={...input,id:crypto.randomUUID(),version:ownerRunPolicy(d,input.propertyId).version+1,created:new Date().toISOString()};validatePolicyRow(d,row);
 (d.ownerRunPolicies??=[]).push(row);audit(d,'Owner run configuration reviewed',input.propertyId+' / version '+row.version+' / review day '+row.reviewDay+' / evidence '+row.evidenceHours+' hours / '+row.source);return row;
}
function validatePolicyRow(d:Data,p:OwnerRunPolicy){if(!d.properties.some(x=>x.id===p.propertyId)||!Number.isInteger(p.version)||p.version<1||!Number.isInteger(p.reviewDay)||p.reviewDay<1||p.reviewDay>28||!Number.isInteger(p.evidenceHours)||p.evidenceHours<1||p.evidenceHours>24||[p.qboCompanyId,p.bankAccountId].some(s=>typeof s!=='string'||s.length>100||s!==s.trim())||!!p.qboCompanyId!==!!p.bankAccountId||[p.source,p.reviewer].some(s=>typeof s!=='string'||!s.trim()||s.length>1000)||typeof p.bankName!=='string'||p.bankName.length>200||!Number.isFinite(Date.parse(p.created)))throw Error('Review the property, deadline (1–28), QBO evidence window (1–24 hours), company/bank IDs and source reference');}
export function validateOwnerRunPolicies(old:Data,next:Data){const before=old.ownerRunPolicies??[],after=next.ownerRunPolicies??[];if(!Array.isArray(after)||after.length>5000||canonicalRecord(after.slice(0,before.length))!==canonicalRecord(before)||new Set(after.map(p=>p.id)).size!==after.length)throw Error('Preserve owner run configuration history');for(const p of after.slice(before.length)){validatePolicyRow(next,p);const previous=after.filter(x=>x.propertyId===p.propertyId).indexOf(p);if(p.version!==previous+1)throw Error('Owner run configuration versions must remain sequential');}}
export function ownerPaymentPolicyBlockers(d:Data,period:string,ownerId:string,e?:PaymentEvidence,recordedAt=new Date().toISOString()){
 const ss=latest(d,period).filter(s=>s.ownerId===ownerId),propertyIds=[...new Set(ss.map(s=>d.units.find(u=>u.id===s.unitId)?.propertyId))],issues:string[]=[];
 if(propertyIds.length!==1||!propertyIds[0])return ['Review this owner’s complete property mapping before payment'];const p=ownerRunPolicy(d,propertyIds[0]);
 if(!p.qboCompanyId||!p.bankAccountId)issues.push('Configure the verified QBO company and owner bank IDs');
 if(ss.some(s=>!s.openingConfirmed))issues.push('Confirm every owner unit opening balance');
 const pools=[...new Set(ss.filter(s=>{const u=d.units.find(u=>u.id===s.unitId);return u&&isParticipating(d,u,period);}).map(s=>d.units.find(u=>u.id===s.unitId)!.poolId))];
 if(pools.some(poolId=>!d.settings.filter(x=>x.poolId===poolId&&x.period===period).sort((a,b)=>b.version-a.version)[0]?.electricConfirmed))issues.push('Verify this month’s electricity total, including documented zero');
 if(e){if(e.companyId!==p.qboCompanyId||e.accountId!==p.bankAccountId)issues.push('QBO company/bank identity does not match the reviewed property configuration');const age=Date.parse(recordedAt)-Date.parse(e.verifiedAt);if(!Number.isFinite(age)||age < -300000||age>p.evidenceHours*3600000)issues.push('Reverify current QBO check status within '+p.evidenceHours+' hours');}
 return issues;
}
