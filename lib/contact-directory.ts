import type {Data} from './pool';

// Keep original QBO contacts for history; owner payees are not service vendors.
export function isOwnerContact(data:Data,contact:{name:string;email?:string;company?:string}){
 const normalize=(value:string)=>value.trim().replace(/\s+/g,' ').toLocaleLowerCase('en-US');
 const names=[contact.name,contact.company??''].map(normalize).filter(Boolean);
 const email=normalize(contact.email??'');
 return data.owners.some(owner=>names.includes(normalize(owner.name))||Boolean(email&&owner.email&&email===normalize(owner.email)));
}