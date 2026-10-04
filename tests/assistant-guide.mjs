import assert from 'node:assert/strict';
import {readFile,mkdtemp,writeFile,rm} from 'node:fs/promises';
import {stripTypeScriptTypes} from 'node:module';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
const dir=await mkdtemp(join(tmpdir(),'og-assistant-'));
try{
 await writeFile(join(dir,'workflow-guide.mjs'),stripTypeScriptTypes(await readFile(new URL('../lib/workflow-guide.ts',import.meta.url),'utf8'),{mode:'transform'}));
 await writeFile(join(dir,'assistant-guide.mjs'),stripTypeScriptTypes(await readFile(new URL('../lib/assistant-guide.ts',import.meta.url),'utf8'),{mode:'transform'}).replace("'./workflow-guide'","'./workflow-guide.mjs'"));
 const {workflowGuides}=await import(pathToFileURL(join(dir,'workflow-guide.mjs')));const {answerGuide,quickQuestions}=await import(pathToFileURL(join(dir,'assistant-guide.mjs')));
 const tabs=['home','maintenance','calendar','leasing','people','properties','communication','accounting','metrics','reporting','overview','statements','distributions','units','settings','documents','activity','general-settings'];
 assert.deepEqual(workflowGuides.map(g=>g.id).sort(),tabs.sort());
 for(const g of workflowGuides)for(const id of g.links)assert(tabs.includes(id));
 assert.deepEqual(answerGuide('How do I match a tenant receipt?').guideIds,['people']);
 assert.deepEqual(answerGuide('How do I allocate pool income?').guideIds,['accounting']);
 assert.deepEqual(answerGuide('How do I issue inventory to a unit?').guideIds,['maintenance']);
 assert.deepEqual(answerGuide('How do I add a user?').guideIds,['general-settings']);
 assert.match(answerGuide('Can the CPA edit records?').text,/read-only/);
 assert.match(answerGuide('What can an Accounting Clerk do?').text,/without financial approvals/);
 assert.match(answerGuide('How does Unit 108 HOA work?').text,/uncovered balance remains an owner bill/);
 assert.match(answerGuide('How do I send email?').text,/does not send/);
 assert.match(answerGuide('1099 onboarding').text,/not implemented/);
 assert.equal(answerGuide('How do I add a charge?').guideIds.length,3);
 assert.match(answerGuide('Predict next year rental market').text,/do not have a verified procedure/);
 assert.deepEqual(answerGuide('next','leasing').guideIds,['leasing']);
 for(const questions of Object.values(quickQuestions))for(const question of questions){const a=answerGuide(question);assert(a.guideIds.length,question);for(const id of a.guideIds)assert(tabs.includes(id));}
 console.log('PASS assistant coverage, guide links, suggested questions, topic routing, clarification, unsupported features and safe fallback');
}finally{await rm(dir,{recursive:true,force:true});}
