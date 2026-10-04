import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {stripTypeScriptTypes} from 'node:module';
const code=stripTypeScriptTypes(await readFile(new URL('../lib/fee-summary.ts',import.meta.url),'utf8'),{mode:'transform'});
const {monthlyFeeSummary,monthlyRentReview}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
const statements=[{status:'Pending',expenses:[{gl:'80400',cents:9152},{gl:'80300',cents:4200},{gl:'81000',cents:198},{gl:'80000',cents:31900},{gl:'repair',cents:8800},{gl:'materials',cents:17072},{gl:'80400',cents:900,sharedId:'shared-other'}]},{status:'Approved',expenses:[{gl:'80400',cents:1},{gl:'80300',cents:2},{gl:'81000',cents:3}]}];
const before=JSON.stringify(statements);assert.deepEqual(monthlyFeeSummary(statements),{management:9153,maintenance:4202,electricity:201,hoa:31900,fees:13355,combined:13556,drafts:1});assert.equal(JSON.stringify(statements),before);assert.deepEqual(monthlyFeeSummary([]),{management:0,maintenance:0,electricity:0,hoa:0,fees:0,combined:0,drafts:0});
console.log('PASS exact fee/electricity totals, excluded HOA/labor/materials/shared charges, draft count, empty totals and unchanged source inputs');

const example={status:'Pending',allocated:114400,opening:99000,adjustments:12345,paidAmount:31900,offsetReceived:31900,expenses:[{gl:'80400',cents:9152},{gl:'80300',cents:4200},{gl:'80000',cents:31900},{gl:'81000',cents:198},{gl:'labor',cents:8800},{gl:'materials',cents:17072}]};
const rent=monthlyRentReview([example],[{cents:131500,source:'Matched rent receipts',required:true}]);assert.equal(rent.ownerShare,43078);assert.equal(rent.assigned,114400);assert.equal(rent.difference,17100);assert.equal(rent.matched,131500);assert.equal(rent.manualCount,0);
const manual=monthlyRentReview([example],[{cents:131500,source:'Manual office rent',required:true},{cents:null,source:'Manual office rent',required:true}]);assert.equal(manual.matched,0);assert.equal(manual.manualRent,131500);assert.equal(manual.manualCount,1);assert.equal(manual.missing,1);
const corrected=monthlyRentReview([{...example,credits:[{cents:720}]}],[{cents:114400,source:'Matched rent receipts'}]);assert.equal(corrected.assigned,114400);assert.equal(corrected.ownerShare,43798);assert.equal(corrected.difference,0);assert.equal(corrected.otherCharges,25152);
const negative=monthlyRentReview([{...example,allocated:10000}],[]);assert(negative.ownerShare<0);assert.equal(negative.assigned,10000);
console.log('PASS original $171 difference, excluded opening/payment/offset balances, manual-vs-matched receipts, missing rent, credits and negative owner shares');
