import assert from 'node:assert/strict';
import {fixture} from './model-loader.mjs';
const data=await fixture();
const {validateHoaAssociations,homeownerRows}=await import('./.mock-runtime/hoa-directory.mjs');
const {validate}=await import('./.mock-runtime/pool.mjs');
const next=structuredClone(data);
next.hoaAssociations=[{id:'association-test',name:'Example Association',propertyIds:[data.properties[0].id],contactName:'Test Contact',email:'contact@example.test',phone:'',notes:'Synthetic association'}];
validate(data,next);
const reloaded=JSON.parse(JSON.stringify(next));
validateHoaAssociations(data,reloaded);
assert.equal(reloaded.hoaAssociations[0].name,'Example Association');
assert.equal(homeownerRows(reloaded,'2026-10').find(r=>r.unit.id===data.units[0].id).associations[0].id,'association-test');
assert.equal(homeownerRows(reloaded,'2026-10').find(r=>r.unit.id==='u2').associations.length,0);
const transferred=structuredClone(reloaded);transferred.owners.push({id:'new-owner',name:'Example New Owner',email:''});transferred.ownerships.push({id:'transfer',unitId:data.units[0].id,ownerId:'new-owner',from:'2026-11-01',to:null});
assert.notEqual(homeownerRows(transferred,'2026-10')[0].owner.id,'new-owner');
assert.equal(homeownerRows(transferred,'2026-11')[0].owner.id,'new-owner');
for(const [change,error] of [
 [d=>d.hoaAssociations[0].propertyIds=['missing'],/saved property/],
 [d=>d.hoaAssociations[0].propertyIds=[],/saved property/],
 [d=>d.hoaAssociations[0].email='bad',/valid association email/],
 [d=>d.hoaAssociations.push({...d.hoaAssociations[0],id:'duplicate-name'}),/already exists/],
 [d=>d.hoaAssociations=[],/history must be preserved/]
]){const invalid=structuredClone(reloaded);change(invalid);assert.throws(()=>validateHoaAssociations(reloaded,invalid),error);}
assert.deepEqual(next.statements,data.statements);
assert.deepEqual(next.operations.tenantEntries,data.operations.tenantEntries);
console.log('HOA: saved association reload, property links, effective ownership, invalid links, duplicates and financial preservation passed');
