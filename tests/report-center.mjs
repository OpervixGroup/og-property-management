import assert from 'node:assert/strict';
import {fixture} from './model-loader.mjs';
const d=await fixture();const {operationalReports,operationalReport}=await import('./.mock-runtime/report-center.mjs');
const {PDFDocument}=await import('pdf-lib');const {simpleReportPDF,csv}=await import('./.mock-runtime/exports.mjs');
const t=d.operations.tenants[0];d.operations.tenantEntries=[{id:'oct',tenantId:t.id,date:'2026-10-07',kind:'Receipt',category:'Rent',description:'Verified synthetic payment',cents:209500,reference:'QA-OCT'},{id:'future',tenantId:t.id,date:'2026-11-01',kind:'Receipt',category:'Rent',description:'Future',cents:30000,reference:'QA-FUTURE'},{id:'other',tenantId:'t2',date:'2026-10-07',kind:'Receipt',category:'Rent',description:'Other property',cents:50000,reference:'QA-OTHER'}];
d.operations.vendorContacts=[{id:'owner-contact',name:d.owners[0].name,email:d.owners[0].email,company:'',phone:'',source:'QA'},{id:'supplier',name:'Synthetic Supplier',email:'supplier@example.test',company:'QA',phone:'',source:'QA'}];
const before=JSON.stringify(d),property=d.units[0].propertyId;
const receipt=operationalReport(d,'receipts','2026-10',property);assert.equal(receipt.rows.length,1);assert(receipt.rows[0].includes('$2,095.00'));assert(!receipt.rows.flat().includes('QA-FUTURE'));assert(!receipt.rows.flat().includes('QA-OTHER'));
assert.equal(operationalReport(d,'receipts','2026-09',property).rows.length,0);
assert.equal(operationalReport(d,'occupancy','2026-10',property).rows[0][2],'Unverified');
assert.equal(operationalReport(d,'vendors','2026-10').rows.length,1);
assert.equal(operationalReport(d,'audit','2026-10',property).rows.length,0);
for(const [id] of operationalReports){const r=operationalReport(d,id,'2026-10',property);assert(r.headers.length);assert.equal(r.rows.length,r.unitIds.length);assert(r.rows.every(x=>x.length===r.headers.length));}
assert.equal(JSON.stringify(d),before);assert.throws(()=>operationalReport(d,'units','2026-99'));
const pdf=await simpleReportPDF('Synthetic receipt report',[receipt.headers.join(' | '),...receipt.rows.map(r=>r.join(' | '))]);assert((await PDFDocument.load(await pdf.arrayBuffer())).getPageCount()>0);assert(csv(receipt.rows).includes('QA-OCT'));
console.log('Report center: all 24 report schemas, month cutoff, property isolation, owner/vendor separation, unknown occupancy, nonmutation and PDF/CSV exports passed.');
