import type {Data} from './pool';
import {providerSignInURL} from './leasing-services';
import {canonicalRecord} from './workflow-controls';
export const serviceKinds=['Banking','Microsoft 365','Payments','Tax filing','Other'] as const;
export type ServiceConnection={id:string;kind:typeof serviceKinds[number];name:string;url:string;created:string;reviewer:string;disabled:boolean};
export function validateServiceConnections(old:Data,next:Data){
 const rows=next.serviceConnections??[],prior=old.serviceConnections??[];
 if(!Array.isArray(rows)||rows.length>200||new Set(rows.map(r=>r.id)).size!==rows.length)throw Error('Invalid company service access');
 for(const r of rows){if(typeof r.id!=='string'||!r.id||r.id.length>100||!serviceKinds.includes(r.kind)||typeof r.name!=='string'||!r.name.trim()||r.name.length>100||typeof r.url!=='string'||r.url.length>1000||typeof r.reviewer!=='string'||!r.reviewer.trim()||!Number.isFinite(Date.parse(r.created))||typeof r.disabled!=='boolean')throw Error('Enter a valid provider name and service category');providerSignInURL(r.url);}
 for(const p of prior){const r=rows.find(r=>r.id===p.id);if(!r)throw Error('Disable saved access without deleting history');const {disabled:a,...before}=p,{disabled:b,...after}=r;if(canonicalRecord(before)!==canonicalRecord(after)||p.disabled&&!r.disabled)throw Error('Service access history is immutable; save new access');}
 const active=rows.filter(r=>!r.disabled);if(new Set(active.map(r=>r.kind+'|'+providerSignInURL(r.url))).size!==active.length)throw Error('This service sign-in address is already saved');
}
export function saveServiceConnection(d:Data,input:Pick<ServiceConnection,'kind'|'name'|'url'|'reviewer'>){const next=structuredClone(d);(next.serviceConnections??=[]).push({...input,name:input.name.trim(),url:providerSignInURL(input.url.trim()),id:crypto.randomUUID(),created:new Date().toISOString(),disabled:false});validateServiceConnections(d,next);return next;}
