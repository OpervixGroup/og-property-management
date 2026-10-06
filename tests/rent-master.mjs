import assert from 'node:assert/strict';
import {fixture} from './model-loader.mjs';
const d=await fixture();
const {importRentMaster,validateRentMasters}=await import('./.mock-runtime/rent-master.mjs');
const {expectedUnitRent}=await import('./.mock-runtime/tenancy.mjs');
const p={period:'2026-10',fileName:'QA.xlsx',fileHash:'a'.repeat(64),source:[['Unit','Name','Status','Total Amount','Operations Account','Escrow Account'],[d.units[0].number,'Test Tenant','Occupied',815,515,300],['999','Other Tenant','Occupied',1095,795,300],['999','Other Tenant','Occupied',1095,795,300]],specials:[{unit:d.units[0].number,regular:81500},{unit:'999',regular:109500}]};
const n=importRentMaster(d,p,'QA');validateRentMasters(d,n);
assert.equal(expectedUnitRent(n,d.units[0],'2026-10').cents,51500);
assert.equal(expectedUnitRent(n,d.units[0],'2026-11').cents,81500);
assert.equal(expectedUnitRent(n,n.units.find(u=>u.id==='u2'),'2026-10').cents,79500);
assert.equal(expectedUnitRent(n,n.units.find(u=>u.id==='u2'),'2026-11').cents,109500);
assert.equal(n.rentMasters[0].rows.length,2);
assert.deepEqual(n.operations.tenantEntries,d.operations.tenantEntries);
assert.throws(()=>importRentMaster(n,p,'QA'),/already imported/);
const tampered=structuredClone(n);tampered.rentMasters[0].rows[0].rent++;
assert.throws(()=>validateRentMasters(d,tampered),/match source/);
console.log('PASS dated first-month specials, regular rent, escrow exclusion, source validation and duplicate control');

