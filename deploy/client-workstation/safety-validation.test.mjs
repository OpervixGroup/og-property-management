import assert from 'node:assert/strict';
import {validateSafety,safetyDigest,safetyOwner} from './safety-validation.mjs';
const at='2026-10-22T15:00:00Z';
const request={kind:'procedure-proposal',stage:'before-save',clientId:'devonshire-leasing',taskId:'synthetic-task',epoch:3,planDigest:'a'.repeat(64),sourceDigest:'b'.repeat(64),artifactDigest:'c'.repeat(64)};
const fixture=()=>({request:structuredClone(request),at,assessments:['risk','security','legal-lead','quality'].map(roleId=>({roleId,actorId:'synthetic-'+roleId,verdict:'Pass',requestDigest:safetyDigest(request),issuedAt:at,expiresAt:'2026-10-22T15:10:00Z',evidence:'synthetic-authenticated-receipt',reviewMode:'separate AI review'})),verifyAssessment:async()=>true});
assert.equal(safetyOwner.accountableRole,'risk');assert.equal((await validateSafety(fixture())).status,'Validated');
for(const mutate of [
 x=>x.assessments.pop(),x=>x.assessments.push(x.assessments[0]),x=>x.assessments[1].roleId='risk',
 x=>x.assessments[0].verdict='Blocked',x=>x.assessments[0].actorId='',x=>x.assessments[0].evidence='',
 x=>x.assessments[0].requestDigest='d'.repeat(64),x=>x.assessments[0].expiresAt=at,
 x=>x.assessments[0].issuedAt='2026-10-22T15:01:00Z',x=>x.assessments[0].issuedAt='2026-10-22T14:00:00Z',
 x=>x.assessments[0].expiresAt='2026-10-22T16:00:00Z',x=>x.assessments[0].reviewMode='automatic approval',
 x=>x.request.clientId='devonshire-hoa',x=>x.request.epoch++,x=>x.request.planDigest='e'.repeat(64),
 x=>x.request.artifactDigest=null,x=>x.request.stage='automatic-activate',x=>x.request.kind='payment',
 x=>x.verifyAssessment=undefined,x=>x.verifyAssessment=async()=>false
]){const f=fixture();mutate(f);await assert.rejects(validateSafety(f));}
let f=fixture();f.request={...request,stage:'before-source',sourceDigest:null,artifactDigest:null};f.assessments=f.assessments.filter(x=>x.roleId!=='quality').map(x=>({...x,requestDigest:safetyDigest(f.request)}));assert.equal((await validateSafety(f)).status,'Validated');
f=fixture();f.request={...request,stage:'after-readback'};f.assessments=[{...f.assessments[0],roleId:'audit',requestDigest:safetyDigest(f.request)}];assert.equal((await validateSafety(f)).status,'Validated');
assert.equal(safetyDigest({a:1,b:2}),safetyDigest({b:2,a:1}));
console.log('PASS safety validation: accountable existing Risk role, exact stage/client/task/epoch/digests, mandatory authenticating verifier, fresh role-bound evidence, denial on blocked/stale/forged/missing receipts and no protected action authorization. Synthetic only.');
