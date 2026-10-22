import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {stripTypeScriptTypes} from 'node:module';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
const base=new URL('./.office-roster-runtime/',import.meta.url);await mkdir(base,{recursive:true});
const rosterCode=stripTypeScriptTypes(await readFile(new URL('../lib/ai-workforce.ts',import.meta.url),'utf8'),{mode:'transform'});await writeFile(new URL('roster.mjs',base),rosterCode);const {staff,offices,supervisor,individualWorking}=await import(new URL('roster.mjs',base));
assert.equal(staff.filter(p=>p.executive).length,10);assert.equal(staff.filter(p=>p.human).length,1);assert.equal(staff[0].id,'ceo');assert.equal(staff[0].reportsTo,null);assert.equal(new Set(staff.map(p=>p.id)).size,staff.length);assert.equal(new Set(staff.map(p=>p.name)).size,staff.length);
for(const p of staff){assert.ok(offices.some(([id])=>id===p.office));if(p.id!=='ceo')assert.ok(supervisor(p));const chain=new Set([p.id]);let cursor=p;while(cursor.reportsTo){assert.ok(!chain.has(cursor.reportsTo),'Reporting cycle');chain.add(cursor.reportsTo);cursor=supervisor(cursor);assert.ok(cursor);}assert.ok(staff.filter(x=>x.reportsTo===p.id).length<=5,'Span exceeds5');}
assert.equal(supervisor(staff.find(p=>p.id==='audit')).id,'ceo');assert.ok(offices.find(([id])=>id==='people')[1].includes('AI Resources'));
const p=staff.find(p=>p.id==='developer');assert.equal(individualWorking(p,[{agentId:p.id,office:p.office,status:'Working'}],true),true);for(const [runs,fresh] of [[[{office:p.office,status:'Working'}],true],[[{agentId:p.id,office:'sales',status:'Working'}],true],[[{agentId:p.id,office:p.office,status:'Completed'}],true],[[{agentId:p.id,office:p.office,status:'Working'}],false]])assert.equal(individualWorking(p,runs,fresh),false);assert.equal(individualWorking(staff[0],[{agentId:'ceo',office:'ceo',status:'Working'}],true),false);
await writeFile(new URL('ceo-inbox-state.mjs',base),stripTypeScriptTypes(await readFile(new URL('../lib/ceo-inbox-state.ts',import.meta.url),'utf8'),{mode:'transform'}));
await writeFile(new URL('ceo-inbox.mjs',base),ts.transpileModule(await readFile(new URL('../app/platform/headquarters/ceo-inbox.tsx',import.meta.url),'utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText.replace("'@/lib/ceo-inbox-state'","'./ceo-inbox-state.mjs'"));
await writeFile(new URL('task-coordinator-progress.mjs',base),await readFile(new URL('../lib/task-coordinator-progress.mjs',import.meta.url),'utf8'));
await writeFile(new URL('coordinator-progress.mjs',base),ts.transpileModule(await readFile(new URL('../app/platform/headquarters/coordinator-progress.tsx',import.meta.url),'utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText.replace("'@/lib/task-coordinator-progress.mjs'","'./task-coordinator-progress.mjs'"));
await writeFile(new URL('hq-schedule.mjs',base),await readFile(new URL('../lib/hq-schedule.mjs',import.meta.url),'utf8'));
await writeFile(new URL('next-work-countdown.mjs',base),ts.transpileModule(await readFile(new URL('../app/platform/headquarters/next-work-countdown.tsx',import.meta.url),'utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText.replace("'@/lib/hq-schedule.mjs'","'./hq-schedule.mjs'"));
const {default:Countdown}=await import(new URL('next-work-countdown.mjs',base));
for(const [paused,message] of [[true,'CEO pause is active'],[false,'CEO controls currently permit'],[null,'CEO pause state unavailable']]){const timer=renderToStaticMarkup(React.createElement(Countdown,{now:new Date('2026-10-21T13:10:00Z'),paused}));assert.ok(timer.includes('00:50:00'));assert.ok(timer.includes('00:20:00'));assert.ok(timer.includes(message));assert.ok(timer.includes('Planned timing, not proof of execution'));}
const source=await readFile(new URL('../app/platform/headquarters/workforce.tsx',import.meta.url),'utf8');const client=ts.transpileModule(source,{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText.replace("'./ceo-inbox'","'./ceo-inbox.mjs'").replace("'@/lib/ai-workforce'","'./roster.mjs'").replace("'./coordinator-progress'","'./coordinator-progress.mjs'").replace("'./next-work-countdown'","'./next-work-countdown.mjs'");await writeFile(new URL('workforce.mjs',base),client);const {default:Workforce,controlCycleHealth}=await import(new URL('workforce.mjs',base));const html=renderToStaticMarkup(React.createElement(Workforce));for(const person of staff){assert.ok(html.includes(person.name));assert.ok(html.includes(person.role.replaceAll("&","&amp;")));}assert.ok(html.includes('3D office'));assert.ok(html.includes('Flat floor plan'));assert.ok(html.includes('Reports to'));assert.ok(html.includes('fictional display name'));assert.ok(!html.includes('hq-avatar-working'));assert.ok(html.includes('Connection unverified')&&html.includes('Daily execution log'));
console.log(`PASS ${staff.length} profiles,10 executives,11 offices,acyclic single-supervisor graph,max5 reports,AI Resources replacement,actual component rendering and fail-closed individual activity.`);

const clock=Date.parse('2026-10-19T12:00:00Z');
const cycle=(minutes,status='Completed',id='company-control-123-1-coo')=>({id,agentId:'coo',status,startedAt:new Date(clock-minutes*60000).toISOString(),finishedAt:new Date(clock-minutes*60000).toISOString()});
assert.match(controlCycleHealth([],clock),/awaiting first/);
assert.match(controlCycleHealth([cycle(60)],clock),/checks recorded/);
assert.match(controlCycleHealth([cycle(89)],clock),/checks recorded/);
assert.match(controlCycleHealth([cycle(90)],clock),/overdue/);
assert.match(controlCycleHealth([cycle(5,'Failed')],clock),/checks failed/);
assert.match(controlCycleHealth([cycle(-2)],clock),/ahead/);
assert.match(controlCycleHealth([cycle(100),cycle(5,'Failed','company-control-124-1-coo')],clock),/checks failed/);
assert.match(controlCycleHealth([cycle(5,'Completed','unrelated-coo')],clock),/awaiting first/);
assert.match(controlCycleHealth([cycle(5)],null),/checking recorded cycle time/);
assert.ok(source.includes('age<600000'),'Ten-minute movement guard remains separate from hourly checks');
console.log('PASS hourly control timing, failed cycles, clock skew and missing evidence.');
