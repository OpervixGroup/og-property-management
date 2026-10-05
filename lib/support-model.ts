export const SUPPORT_EMAIL='support@opervixgroup.com';
export function clientName(value:string|undefined){return (value?.trim()||'Devonshire Leasing Agency Inc').replace(/[\r\n]/g,' ').slice(0,160);}
export function supportSubject(client:string,kind:string,id:string){return `[${clientName(client)}] ${kind==='Incident'?'Internal error':'Live support request'} [OG-SUPPORT:${id}]`;}
export function safeRoute(value:string){const path=value.split(/[?#]/)[0];return /^\/(?:api\/[a-z\-/]+|login|auth\/microsoft\/callback)?$/.test(path)?path:'Application';}
export function safeDigest(value:unknown){return typeof value==='string'&&/^[a-zA-Z0-9_-]{1,100}$/.test(value)?value:'Unavailable';}
