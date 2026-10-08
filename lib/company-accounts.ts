import type {Data} from './pool';
import {emptyOperations} from './operations-model';
export const PLATFORM_OWNER_EMAIL='mmartinez@opervixgroup.com';
export type Company={workspace_id:string;name:string;login_slug:string;email_domain:string;status:'Active'|'Disabled'};
export function companyDetails(input:unknown){const p=input as Partial<Company>;const name=typeof p.name==='string'?p.name.trim():'',login_slug=typeof p.login_slug==='string'?p.login_slug.trim().toLowerCase():'',email_domain=typeof p.email_domain==='string'?p.email_domain.trim().toLowerCase():'';if(!name||name.length>100||! /^[a-z0-9][a-z0-9-]{2,59}$/.test(login_slug)||email_domain&&(!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(email_domain)||email_domain.includes('..')))throw Error('Enter a company name, a 3–60 character login name and a valid optional email domain');return {name,login_slug,email_domain};}
export function emailDomain(email:string){const parts=email.trim().toLowerCase().split('@');return parts.length===2&&/^[a-z0-9.-]+\.[a-z]{2,}$/.test(parts[1])?parts[1]:'';}
export function companyMatches(company:Company,login:string){return company.status==='Active'&&(!login||company.login_slug===login.trim().toLowerCase());}
export function newCompanyData(name:string,month:string,propertyId:string):Data{
 if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))throw Error('Choose a valid starting month');
 return {properties:[{id:propertyId,name,companyName:name,detailsVersion:1}],pools:[],units:[],owners:[],ownerships:[],periods:[{id:'period-'+month,month}],rules:[],settings:[],statements:[],sharedExpenses:[],audit:[{id:crypto.randomUUID(),at:new Date().toISOString(),action:'Company workspace created',detail:'Blank company account; no client records copied.'}],operations:emptyOperations()};
}
