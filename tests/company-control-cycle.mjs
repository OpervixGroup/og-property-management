import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';
import {spawnSync} from 'node:child_process';

const workflow=(await readFile(new URL('../.github/workflows/company-control-cycle.yml',import.meta.url),'utf8')).replace(/\r\n/g,'\n');
// Exercise the actual shell condition expressions without network access. Bash/MSYS
// cannot initialize in this Windows sandbox; the supported expression grammar is
// deliberately narrow so changed shell syntax fails rather than silently passing.
function conditionFor(variable){
 const match=workflow.match(new RegExp('if ([^\\n]+); then\\n\\s+'+variable+'="Failed"'));
 assert.ok(match,variable+' failure condition exists');return match[1];
}
function evaluate(expression,values){
 const tests=[...expression.matchAll(/\[ "\$\{(\w+)\}" (!=|=) "([^"]+)" \]/g)];
 assert.ok(tests.length);
 assert.equal(expression.replace(/\[ "\$\{(\w+)\}" (!=|=) "([^"]+)" \]/g,'TEST').replace(/\s/g,''),Array(tests.length).fill('TEST').join('||'));
 return tests.some(([,key,operator,value])=>operator==='='?values[key]===value:values[key]!==value);
}
const technology=conditionFor('technology_status'),security=conditionFor('security_status'),overall=conditionFor('overall_status');
const start=workflow.indexOf("'{\n"),end=workflow.indexOf("}')\"",start);
assert.ok(start>=0&&end>start);
const payloadExpression=workflow.slice(start+1,end+1);
let cases=0;
for(const hq_status of ['200','503','000'])for(const denial_status of ['403','200','000'])for(const feed_status of ['401','200','000'])for(const invalid_bearer_status of ['403','200','000']){
 const values={hq_status,denial_status,feed_status,invalid_bearer_status};
 values.technology_status=evaluate(technology,values)?'Failed':'Completed';
 values.security_status=evaluate(security,values)?'Failed':'Completed';
 const status=evaluate(overall,values)?'Failed':'Completed';
 assert.equal(status,hq_status==='200'&&denial_status==='403'&&feed_status==='401'&&invalid_bearer_status==='403'?'Completed':'Failed');
 const payload=runInNewContext('('+payloadExpression+')',{$cycle:'synthetic-cycle-123-2',$started:'2026-01-01T00:00:00Z',$finished:'2026-01-01T00:00:01Z',$overall:status,$technologyStatus:values.technology_status,$technologyResult:'Synthetic HTTP/login availability only',$securityStatus:values.security_status,$securityResult:'Synthetic access results'});
 assert.equal(payload.runs.length,14);assert.equal(payload.messages.length,4);
 const ids=[...payload.runs,...payload.messages].map(row=>row.id);assert.equal(new Set(ids).size,18);
 assert.deepEqual(Array.from(ids),['coo','cfo','sales','marketing','cto','resources','controller','legal','secretary','strategy','operations','orchestration','security','evaluation','msg-1','msg-2','msg-3','msg-4'].map(suffix=>'synthetic-cycle-123-2-'+suffix));
 for(const role of ['coo','operations-lead','orchestration','evaluation'])assert.equal(payload.runs.find(row=>row.agentId===role).status,status);
 assert.equal(payload.runs.find(row=>row.agentId==='security').status,values.security_status);
 assert.equal(payload.runs.find(row=>row.agentId==='cto').status,values.technology_status);
 assert.ok(payload.messages.at(-1).text.includes(status));cases++;
}
assert.match(workflow,/curl --silent --show-error --connect-timeout 10 --max-time 30/);
assert.match(workflow,/else\n\s+printf '000'/);
assert.equal((workflow.match(/\$\(http_status /g)||[]).length,5,'all four probes and evidence submission use bounded helper');
assert.doesNotMatch(workflow,/--retry/,'POSTs must never automatically retry');
assert.match(workflow,/feed_status="\$\(http_status --output \/dev\/null "\$\{INGEST_URL%\/events\}"\)"/);
assert.match(workflow,/Authorization: Bearer opervix-synthetic-invalid-token/);
assert.match(workflow,/Headquarters HTTP\/login availability check returned 200 after redirects/);
assert.match(workflow,/accepted == 18 and \.runs == 14 and \.messages == 4/);
const persistence=workflow.indexOf('persisted="Confirmed"'),summary=workflow.indexOf('} >> "${GITHUB_STEP_SUMMARY}"'),failure=workflow.indexOf('if [ "${overall_status}" != "Completed" ] || [ "${persisted}" != "Confirmed" ]; then');
assert.ok(persistence<summary&&summary<failure&&failure>0,'save evidence, summarize, then fail runner');
assert.match(workflow.slice(failure),/exit 1/);
const finalCondition=workflow.slice(failure).match(/^if (.+); then/)[1];
for(const overall_status of ['Completed','Failed'])for(const persisted of ['Confirmed','Failed'])assert.equal(evaluate(finalCondition,{overall_status,persisted}),overall_status!=='Completed'||persisted!=='Confirmed','failed control or unconfirmed persistence must fail runner');
if(process.platform==='linux'){
 const markers=[...workflow.matchAll(/^        run: \|\n/gm)];
 assert.ok(markers.length>=2,'control and coordinator shell blocks exist');
 for(const marker of markers){
  const lines=[];
  for(const line of workflow.slice(marker.index+marker[0].length).split('\n')){if(line.trim()&&!line.startsWith('          '))break;lines.push(line);}
  assert.ok(lines.some(line=>line.trim()),'each actual shell block has content');
  const script=lines.map(line=>line.slice(10)).join('\n')+'\n';
  const result=spawnSync('bash',['-n','-'],{input:script,encoding:'utf8'});
  if(result.error)throw result.error;
  assert.equal(result.status,0,'native Bash syntax check: '+result.stderr);
 }
 console.log('PASS native Bash syntax for the complete actual control workflow; no requests executed.');
}else{
 console.log('SKIP native Bash syntax on '+process.platform+'; Linux CI performs this check.');
}
console.log(`PASS company-control workflow: ${cases} synthetic HTTP combinations, actual 18-record payload/status propagation, immutable IDs, bounded transport, no POST retry, persistence/summary/failure ordering. No network calls performed.`);

