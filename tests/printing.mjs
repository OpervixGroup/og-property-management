import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {stripTypeScriptTypes} from 'node:module';
import {PDFDocument} from 'pdf-lib';
const runtime=new URL('./.runtime/printing/',import.meta.url);await mkdir(runtime,{recursive:true});
const prepared=new Set();
async function prepare(name){
 if(prepared.has(name))return;prepared.add(name);
 let source=await readFile(new URL('../lib/'+name+'.ts',import.meta.url),'utf8');
 if(name==='seed')source=source.replace("import roster from './roster.json';",'const roster='+await readFile(new URL('../lib/roster.json',import.meta.url),'utf8')+';');
 const code=stripTypeScriptTypes(source,{mode:'transform'});
 const dependencies=[...code.matchAll(/from ['"]\.\/([^'"]+)['"]/g)].map(m=>m[1]);
 for(const dependency of dependencies)await prepare(dependency);
 await writeFile(new URL(name+'.mjs',runtime),code.replace(/from (['"])\.\/([^'"]+)\1/g,(_,quote,path)=>'from '+quote+'./'+path+'.mjs'+quote));
}
for(const name of ['seed','exports','owner-report','print-report'])await prepare(name);
const {seed}=await import(new URL('seed.mjs',runtime));
const {selectedOwnerStatements,ownerReportTotals}=await import(new URL('owner-report.mjs',runtime));
const {combinedOwnerPDF,ownerPacketPDF,receiptResponse,download}=await import(new URL('exports.mjs',runtime));
const {statementNotes,statementNoteBlocks}=await import(new URL('statement-notes.mjs',runtime));
assert.deepEqual(statementNotes('Custom owner note.\n\nReviewed work dates and price details:\nLabor | Contractor | Work date missing.'),['Custom owner note.','Labor | Contractor | Work date missing.']);
assert.equal(statementNoteBlocks('Reviewed work dates and price details:\nLabor | Contractor | 4 hours x $22 = $88.')[0].body,'4 hours x $22 = $88.');
assert.equal(statementNotes('No reviewed block. Keep this exact note.')[0],'No reviewed block. Keep this exact note.');
const data=seed(),period='2026-10';
const owner=data.owners.find(o=>data.statements.filter(s=>s.ownerId===o.id).length>2),all=data.statements.filter(s=>s.ownerId===owner.id),ids=all.slice(0,2).map(s=>s.unitId);
const selected=selectedOwnerStatements(data,owner.id,period,[...ids,ids[0]]);
assert.equal(selected.length,2);assert.throws(()=>selectedOwnerStatements(data,owner.id,period,[]),/Select/);
assert.throws(()=>selectedOwnerStatements(data,owner.id,period,[data.statements.find(s=>s.ownerId!==owner.id).unitId]),/no current statement/);
const newer={...structuredClone(selected[0]),id:'newer',version:2,allocated:12345};data.statements.push(newer);
assert.ok(selectedOwnerStatements(data,owner.id,period,ids).some(s=>s.id==='newer'));
newer.opening=-100000;const exact=selectedOwnerStatements(data,owner.id,period,ids),t=ownerReportTotals(data,exact);
assert.equal(t.allocated,exact.reduce((n,s)=>n+s.allocated,0));assert.ok(t.closing<0,'Negative balances are preserved');
const before=JSON.stringify(data),blob=await combinedOwnerPDF(data,owner.id,period,ids,[]),pdf=await PDFDocument.load(await blob.arrayBuffer());
assert.ok(pdf.getPageCount()>=3);assert.equal(JSON.stringify(data),before,'Reporting must not mutate financial records');
const doc={id:'missing',statementId:exact[0].id,expenseId:exact[0].expenses[0].id,name:'receipt.pdf',mime:'application/pdf',size:1};
const oldFetch=globalThis.fetch;globalThis.fetch=async()=>new Response('Unavailable',{status:403});
await assert.rejects(()=>receiptResponse(doc),/receipt.pdf.*403/);
await assert.rejects(()=>ownerPacketPDF(data,exact[0],[doc]),/receipt.pdf/);
globalThis.fetch=oldFetch;
// Exercise the browser-independent download lifecycle with a small DOM double.
const created=[];class Element{constructor(tag){this.tag=tag;this.children=[];this.listeners={};created.push(this);}setAttribute(){}append(...nodes){this.children.push(...nodes);}addEventListener(type,fn){this.listeners[type]=fn;}showModal(){this.shown=true;}click(){this.clicked=true;}focus(){}close(){this.listeners.close?.();}remove(){this.removed=true;}}
const oldDocument=globalThis.document;globalThis.document={createElement:tag=>new Element(tag),body:{append:node=>{node.appended=true;}}};
download(blob,'owner.pdf');const dialog=created.find(e=>e.tag==='dialog');assert.ok(dialog.shown);assert.ok(created.some(e=>e.textContent==='Save file'&&e.clicked));assert.ok(created.some(e=>e.textContent==='Open PDF / print'));dialog.close();assert.ok(dialog.removed);assert.throws(()=>download(new Blob([]),'empty.pdf'),/empty/);globalThis.document=oldDocument;
console.log('PASS printing: selected units, ownership isolation, latest versions, exact totals, negative balances, combined PDF pages, immutable records, receipt failures, visible download retry and cleanup');
