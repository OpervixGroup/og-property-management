import assert from 'node:assert/strict';
import {fixture} from './model-loader.mjs';
await fixture();
const {postInvoiceBatch,moveImportedMaterialsToStock,applyReviewedTaskNotes}=await import('./.mock-runtime/invoice-import.mjs');
const {validate,totals}=await import('./.mock-runtime/pool.mjs');
const old=await fixture(),unit=old.units[0].number,d=structuredClone(old);
const row={sourceId:'tools-test',unit,qboClass:unit,kind:'Materials',vendor:'Home Depot',reference:'0582-52-31055',date:'2026-10-01',description:'Painting supplies and small tools',cents:7436,gl:'81200',accountName:'Repairs and Maintenance',paymentState:'Paid',paymentMonth:'2026-09',notes:'',source:'Verified receipt'};
const batch=postInvoiceBatch(d,{period:'2026-10',fileName:'test',hash:'tools-hash',reviewer:'QA',rows:[row]});validate(old,d);
const before=structuredClone(d),s=d.statements.find(s=>s.id===batch.rows[0].statementId),net=totals(s).closing;
moveImportedMaterialsToStock(d,row.sourceId,'Miguel Martinez','Full receipt goes to inventory, no unit charge');validate(before,d);
assert.equal(totals(s).closing,net+7436);assert.equal(d.procurement.purchases.at(-1).totalCost,7436);assert.equal(d.procurement.purchases.at(-1).quantity,1);assert.equal(d.procurement.parts.at(-1).measure,'receipt lot');assert.deepEqual(d.invoiceImports,before.invoiceImports);assert.deepEqual(d.accounting,before.accounting);
assert.throws(()=>moveImportedMaterialsToStock(d,row.sourceId,'QA','duplicate'),/already/);
const bad=structuredClone(d);bad.procurement.purchases.at(-1).totalCost++;assert.throws(()=>validate(d,bad));
assert.ok(applyReviewedTaskNotes(d,'2026-10','QA')>0);assert.doesNotMatch(s.ownerNotes,/Painting supplies/);
console.log('PASS full receipt reclassified once, source history preserved, owner balance increased exactly, inventory receipt lot valued, no banking change');

const noted=structuredClone(before);const ns=noted.statements.find(x=>x.id===s.id);ns.ownerNotes='Existing owner note';assert.ok(applyReviewedTaskNotes(noted,'2026-10','QA')>0);assert.match(ns.ownerNotes,/Existing owner note/);assert.match(ns.ownerNotes,/Painting supplies and small tools/);const saved=ns.ownerNotes;applyReviewedTaskNotes(noted,'2026-10','QA');assert.equal(ns.ownerNotes,saved);validate(before,noted);console.log('PASS owner task notes preserve existing text and repeat without duplicate sections');

