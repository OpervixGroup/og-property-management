import type {Operations} from './operations-model';
import {canonicalRecord} from './workflow-controls';
export const manualLeasingStages={screening:['Consent recorded','Requested externally','Report received','Reviewed','Cancelled'],signature:['Prepared','Sent externally','Signed externally','Cancelled'],listing:['Prepared','Published externally','Removed externally','Cancelled']} as const;
export type ManualLeasingKind=keyof typeof manualLeasingStages;
export type LeasingProvider={id:string;kind:ManualLeasingKind;name:string;signInURL:string};
export function providerSignInURL(value:string){try{const u=new URL(value);if(u.protocol!=='https:'||u.username||u.password||u.search||u.hash||!u.hostname.includes('.')||u.hostname==='localhost'||u.hostname.endsWith('.local')||/^\d+(\.\d+){3}$/.test(u.hostname))throw Error();return u.href;}catch{throw Error('Use a public HTTPS sign-in address without passwords, query parameters or fragments');}}
export type ManualLeasingEvent={id:string;kind:ManualLeasingKind;recordId:string;status:string;date:string;reference:string;notes:string;confirmed:boolean};
const transitions:Record<ManualLeasingKind,Record<string,string[]>>={screening:{'':['Consent recorded'],'Consent recorded':['Requested externally','Cancelled'],'Requested externally':['Report received','Cancelled'],'Report received':['Reviewed','Cancelled']},signature:{'':['Prepared'],Prepared:['Sent externally','Cancelled'],'Sent externally':['Signed externally','Cancelled']},listing:{'':['Prepared'],Prepared:['Published externally','Cancelled'],'Published externally':['Removed externally'],'Removed externally':['Prepared'],Cancelled:['Prepared']}};
export function manualLeasingNext(ops:Operations,kind:ManualLeasingKind,recordId:string){const last=(ops.manualLeasingEvents??[]).filter(e=>e.kind===kind&&e.recordId===recordId).at(-1);return transitions[kind][last?.status??'']??[];}
export function validateManualLeasing(ops:Operations,units:Set<string>,old?:Operations){
 const providers=ops.leasingProviders??[];
 if(!Array.isArray(providers)||providers.length>100||new Set(providers.map(p=>p.id)).size!==providers.length)throw Error('Invalid provider setup');
 const addresses=new Set<string>();for(const p of providers){if(typeof p.id!=='string'||!p.id||!Object.hasOwn(transitions,p.kind)||typeof p.name!=='string'||!p.name.trim()||p.name.length>100||typeof p.signInURL!=='string'||p.signInURL.length>1000)throw Error('Enter a provider name and sign-in address');const address=p.kind+':'+providerSignInURL(p.signInURL);if(addresses.has(address))throw Error('This provider sign-in address is already saved');addresses.add(address);}
 const rows=ops.manualLeasingEvents??[];
 if(!Array.isArray(rows)||rows.length>10000||new Set(rows.map(e=>e.id)).size!==rows.length)throw Error('Invalid manual leasing history');
 const previous=old?.manualLeasingEvents??[];
 if(previous.some((e,i)=>canonicalRecord(e)!==canonicalRecord(rows[i])))throw Error('Preserve manual leasing history in its original order');
 const seen:Operations={...ops,manualLeasingEvents:[]};
 for(const e of rows){
  if(!e.id||!Object.hasOwn(transitions,e.kind)||!manualLeasingNext(seen,e.kind,e.recordId).includes(e.status))throw Error('Complete the preceding manual workflow step first');
  const record=e.kind==='screening'?ops.rentalApplications?.find(a=>a.id===e.recordId):e.kind==='signature'?ops.leases.find(l=>l.id===e.recordId):units.has(e.recordId);
  if(!record)throw Error('Choose an existing leasing record');
  if(old&&e.kind==='screening'&&['Approved','Denied','Withdrawn'].includes((record as {status:string}).status)&&!previous.some(p=>p.id===e.id))throw Error('Reviewed applications cannot receive new screening events');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(e.date)||!Number.isFinite(Date.parse(e.date+'T12:00:00Z'))||new Date(e.date+'T12:00:00Z').toISOString().slice(0,10)!==e.date||!e.confirmed||typeof e.reference!=='string'||!e.reference.trim()||e.reference.length>500||typeof e.notes!=='string'||e.notes.length>4000)throw Error('Confirm the completed action, date and supporting reference');
  const last=seen.manualLeasingEvents!.filter(p=>p.kind===e.kind&&p.recordId===e.recordId).at(-1);
  if(last&&e.date<last.date)throw Error('Workflow dates must follow the previous step');
  seen.manualLeasingEvents!.push(e);
 }
}
