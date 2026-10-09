import type {Data} from './pool';

export type HoaAssociation={id:string;name:string;propertyIds:string[];contactName:string;email:string;phone:string;notes:string};

export function validateHoaAssociations(old:Data,next:Data){
 const rows=next.hoaAssociations??[];
 if(!Array.isArray(rows)||rows.length>1000||new Set(rows.map(r=>r.id)).size!==rows.length)throw Error('Invalid association directory');
 const properties=new Set(next.properties.map(p=>p.id));
 const names=new Set<string>();
 for(const r of rows){
  if(typeof r.id!=='string'||!r.id||typeof r.name!=='string'||!r.name.trim())throw Error('Enter an association name');
  const name=r.name.trim().toLowerCase();if(names.has(name))throw Error('Association name already exists');names.add(name);
  for(const k of ['name','contactName','email','phone','notes'] as const)if(typeof r[k]!=='string'||r[k].length>2000)throw Error('Invalid association contact details');
  if(r.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.email))throw Error('Enter a valid association email');
  if(!Array.isArray(r.propertyIds)||!r.propertyIds.length||new Set(r.propertyIds).size!==r.propertyIds.length||r.propertyIds.some(id=>!properties.has(id)))throw Error('Link at least one saved property to the association');
 }
 for(const r of old.hoaAssociations??[])if(!rows.some(n=>n.id===r.id))throw Error('Association history must be preserved');
}

export function homeownerRows(data:Data,period:string){
 const date=period+'-01';
 return data.units.map(unit=>{
  const ownership=data.ownerships.filter(o=>o.unitId===unit.id&&o.from<=date&&(!o.to||o.to>=date)).sort((a,b)=>b.from.localeCompare(a.from))[0];
  return {unit,owner:data.owners.find(o=>o.id===(ownership?.ownerId??unit.ownerId)),property:data.properties.find(p=>p.id===unit.propertyId),associations:(data.hoaAssociations??[]).filter(a=>a.propertyIds.includes(unit.propertyId))};
 });
}
