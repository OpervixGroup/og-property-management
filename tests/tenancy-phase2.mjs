import assert from 'node:assert/strict';
import {fixture} from './model-loader.mjs';
const base=await fixture();
const {expectedUnitRent,monthBounds,validateTenancyChanges}=await import('./.mock-runtime/tenancy.mjs');
const {parseTenantImport,importTenants,validateTenantImports}=await import('./.mock-runtime/tenant-import.mjs');
let count=0;function check(name,fn){fn();count++;console.log('PASS '+name);}
const unit=base.units[0],month='2026-10';
check('February uses actual month end',()=>assert.equal(monthBounds('2028-02').last,'2028-02-29'));
check('Tenant rent is expected income, without posting cash',()=>{assert.equal(expectedUnitRent(base,unit,month).cents,100000);assert.equal(base.operations.tenantEntries.length,0);});
check('Unverified rent stays unknown',()=>{const d=structuredClone(base);d.operations.tenants[0].rentConfirmed=false;assert.equal(expectedUnitRent(d,unit,month).cents,null);});
check('Vacancy conflicts require review',()=>{const d=structuredClone(base);d.operations.occupancy=[{unitId:unit.id,month,status:'Vacant'}];assert.equal(expectedUnitRent(d,unit,month).cents,null);});
check('Verified vacancy receives zero expected tenant rent',()=>{const d=structuredClone(base);d.operations.tenants=[];d.operations.occupancy=[{unitId:unit.id,month,status:'Vacant'}];assert.equal(expectedUnitRent(d,unit,month).cents,0);assert.equal(d.units[0].participating,base.units[0].participating);});
check('Unknown occupancy is not invented vacancy',()=>{const d=structuredClone(base);d.operations.tenants=[];assert.equal(expectedUnitRent(d,unit,month).cents,null);});
check('Partial tenancy requires agreed charge review',()=>{const d=structuredClone(base);d.operations.tenants[0].start='2026-10-15';assert.equal(expectedUnitRent(d,unit,month).cents,null);});
check('New overlapping tenants are rejected',()=>{const d=structuredClone(base);d.operations.tenants.push({...d.operations.tenants[0],id:'overlap'});assert.throws(()=>validateTenancyChanges(base,d),/overlap/);});
check('Existing tenancy cannot move to another unit',()=>{const d=structuredClone(base);d.operations.tenants[0].unitId='u2';assert.throws(()=>validateTenancyChanges(base,d),/identity/);});
check('Lease activation requires tenant and signature',()=>{const d=structuredClone(base);d.operations.leases=[{id:'lease',unitId:unit.id,tenant:'Test Tenant',tenantId:'t1',start:'2026-10-01',end:'2027-09-30',rent:110000,status:'Active',signedDate:''}];assert.throws(()=>validateTenancyChanges(base,d),/signature/);d.operations.leases[0].signedDate='2026-09-30';validateTenancyChanges(base,d);assert.equal(expectedUnitRent(d,unit,month).cents,110000);const edit=structuredClone(d);edit.operations.leases[0].rent=120000;assert.throws(()=>validateTenancyChanges(d,edit),/original effective lease/);});
const header='property_id,unit,tenant_id,first_name,last_name,email,cell,start,end,monthly_rent,signed_date\n';
const row=(rent='1100.00')=>[unit.propertyId,unit.number,'t1','Test','Tenant','test@example.test','','2026-01-01','',rent,''].join(',');
check('Contact import preserves ledger, source and identity',()=>{const original=structuredClone(base);original.operations.tenants[0].rentConfirmed=false;const p=parseTenantImport(original,header+row());assert.equal(p.rows[0].error,'');const n=importTenants(original,p,'qa.csv','a'.repeat(64),[2]);assert.equal(n.operations.tenants[0].rent,110000);assert.equal(n.operations.tenants[0].id,'t1');assert.deepEqual(n.operations.tenantEntries,base.operations.tenantEntries);assert.deepEqual(n.statements,base.statements);validateTenantImports(original,n);const changed=structuredClone(n);changed.tenantImports[0].rows[0].raw[3]='Changed';assert.throws(()=>validateTenantImports(n,changed),/source import history/);});
check('Blank imported rent preserves existing agreement',()=>assert.equal(parseTenantImport(base,header+row('')).rows[0].tenant.rent,100000));
check('Explicit zero rent is verified zero',()=>{const d=structuredClone(base);d.operations.tenants[0].rentConfirmed=false;const t=parseTenantImport(d,header+row('0.00')).rows[0].tenant;assert.equal(t.rent,0);assert.equal(t.rentConfirmed,true);});
check('Invalid rent and duplicate rows cannot be selected',()=>{assert.match(parseTenantImport(base,header+row('-5')).rows[0].error,/unsigned/);assert.match(parseTenantImport(base,header+row()+'\n'+row()).rows[1].error,/Duplicate/);});
check('Impossible dates are rejected',()=>assert.match(parseTenantImport(base,header+row().replace('2026-01-01','2026-02-30')).rows[0].error,/dates/));
check('Tenancy unit identity is checked during import preview',()=>assert.match(parseTenantImport(base,header+row().replace(',t1,',',t2,')).rows[0].error,/another unit/));


check('Verified rent amendments preserve original tenant agreement',()=>{const d=structuredClone(base);d.operations.tenants[0].rent=120000;assert.throws(()=>validateTenancyChanges(base,d),/dated lease/);});



check('Shared unit number requires property disambiguation',()=>{const d=structuredClone(base);d.units.find(u=>u.id==='u2').number=unit.number;const ambiguous=header+row('').replace(unit.propertyId+',',',');assert.match(parseTenantImport(d,ambiguous).rows[0].error,/ambiguous/);assert.equal(parseTenantImport(d,header+row('')).rows[0].error,'');});
check('Original source keys survive PostgreSQL object ordering',()=>{const d=structuredClone(base);d.operations.tenants[0].rentConfirmed=false;const file=parseTenantImport(d,header+row()),n=importTenants(d,file,'source.csv','b'.repeat(64),[2]);const reorder=value=>Array.isArray(value)?value.map(reorder):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).reverse().map(([k,v])=>[k,reorder(v)])):value;validateTenantImports(n,reorder(n));assert.throws(()=>importTenants(n,file,'repeat.csv','b'.repeat(64),[2]),/already imported/);});
check('Forged source amount cannot support a contact import',()=>{const d=structuredClone(base);d.operations.tenants[0].rentConfirmed=false;const file=parseTenantImport(d,header+row()),n=importTenants(d,file,'source.csv','c'.repeat(64),[2]);n.tenantImports[0].rows[0].raw[9]='1.00';assert.throws(()=>validateTenantImports(d,n),/source does not match/);});
check('Batch joint overlaps reject atomically',()=>{const d=structuredClone(base);d.operations.tenants=[];const newRow=[unit.propertyId,unit.number,'','A','B','','','2026-10-01','','900.00',''].join(',');const f=parseTenantImport(d,header+newRow+'\n'+newRow.replace(',A,B,',',C,D,')),before=JSON.stringify(d);assert(f.rows.every(r=>!r.error));assert.throws(()=>importTenants(d,f,'conflict.csv','d'.repeat(64),[2,3]),/overlap/);assert.equal(JSON.stringify(d),before);});


check('Monthly occupancy cannot disappear or move between periods',()=>{const d=structuredClone(base);d.operations.occupancy=[{id:'occ',unitId:unit.id,month,status:'Vacant'}];const n=structuredClone(d);n.operations.occupancy[0].month='2026-11';assert.throws(()=>validateTenancyChanges(d,n),/occupancy history/);});
check('Blank contacts preserve known email and supplemental fields import',()=>{const d=structuredClone(base);d.operations.tenants[0].address='Original';const f=parseTenantImport(d,header.replace('signed_date','signed_date,address,pets')+row('').replace('test@example.test','')+',Updated address,Cat');assert.equal(f.rows[0].tenant.email,'test@example.test');assert.equal(f.rows[0].tenant.address,'Updated address');assert.equal(f.rows[0].tenant.pets,'Cat');});


check('Incomplete co-tenant contacts fail during preview',()=>{const f=parseTenantImport(base,header.replace('signed_date','signed_date,second_first_name')+row('')+',Incomplete');assert.match(f.rows[0].error,/second tenant first and last name/);});
console.log(count+' Phase 2 scenarios passed');
