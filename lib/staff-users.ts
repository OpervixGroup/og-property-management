export const STAFF_ROLES=['Global Admin','Management','Analyst / Agent','Maintenance','Accounting Clerk','Accountant','External CPA'] as const;
export type StaffRole=typeof STAFF_ROLES[number];
export type StaffUser={id:string;name:string;email:string;role:StaffRole;propertyIds:string[];status:'Pending access'|'Disabled';created:string;updated:string;phone?:string;mfaPreference?:'SMS';mfaStatus?:'Pending configuration'};
export const roleScope:Record<StaffRole,string>={
 'Global Admin':'All properties, users and roles. Only this role grants Global Admin access.',
 Management:'All properties and property-management functions, including accounting approvals and financial corrections. Manages staff except granting Global Admin access.',
 'Analyst / Agent':'Assigned properties: edit operational records and enter tenant charges, receipts and draft expenses. Deletion requires Management or Global Admin approval. No final distributions, allocation-policy changes or user administration.',
 Maintenance:'Assigned-property work orders and inventory. No owner distributions or accounting approvals.',
 'External CPA':'All properties: view records and print or download reports only. No editing, approvals, payments or user administration.',
 Accountant:'All properties: view records and print or download reports only, same as External CPA. No editing, approvals, payments or user administration.',
 'Accounting Clerk':'Assigned properties: A/R charges and receipts, A/P bills, expenses, data entry and supporting documents. No statement/distribution approvals, financial corrections, allocation-rule changes, owner Paid status or user administration.',
};
export function allPropertyScope(role:StaffRole){return ['Global Admin','Management','Accountant','External CPA'].includes(role);}
export function normalizeStaffScopes<T extends {staffUsers?:StaffUser[];properties:{id:string}[]}>(data:T):T{for(const user of data.staffUsers??[])if(allPropertyScope(user.role))user.propertyIds=data.properties.map(p=>p.id);return data;}
export function validateStaffUsers(old:StaffUser[]|undefined,next:StaffUser[]|undefined,properties:string[]){
 const rows=next??[],ids=new Set<string>(),emails=new Set<string>();
 if(!Array.isArray(rows)||rows.length>1000)throw Error('Invalid staff directory');
 for(const u of rows){const email=typeof u.email==='string'?u.email.trim().toLowerCase():'';
  if(!u.id||ids.has(u.id)||typeof u.name!=='string'||!u.name.trim()||u.name.length>200||!email||email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||emails.has(email))throw Error('Enter a name and unique valid staff email');
  if(u.phone!==undefined&&u.phone!==''&&!/^\+[1-9]\d{7,14}$/.test(u.phone))throw Error('Enter a phone number with country code, such as +12105761708');
  if(u.mfaPreference!==undefined&&(u.mfaPreference!=='SMS'||!u.phone||u.mfaStatus!=='Pending configuration'))throw Error('SMS verification remains pending configuration');
  if(u.mfaStatus!==undefined&&u.mfaStatus!=='Pending configuration')throw Error('SMS verification remains pending configuration');
  if(!STAFF_ROLES.includes(u.role)||!['Pending access','Disabled'].includes(u.status))throw Error('Invalid staff role or access status');
  if(!Array.isArray(u.propertyIds)||!u.propertyIds.length||new Set(u.propertyIds).size!==u.propertyIds.length||u.propertyIds.some(p=>!properties.includes(p)))throw Error('Select valid property access');
  if(allPropertyScope(u.role)&&u.propertyIds.length!==properties.length)throw Error('This role requires all-property scope');
  if(!Number.isFinite(Date.parse(u.created))||!Number.isFinite(Date.parse(u.updated)))throw Error('Invalid staff record dates');
  const prior=old?.find(p=>p.id===u.id);if(prior&&prior.created!==u.created)throw Error('Preserve staff creation history');ids.add(u.id);emails.add(email);
 }
 for(const prior of old??[])if(!ids.has(prior.id))throw Error('Disable staff users rather than deleting their history');
}
