import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {sourceDeploymentId} from '../scripts/deployment-id.cjs';
const root=fs.mkdtempSync(path.join(os.tmpdir(),'og-release-'));
try {
 fs.mkdirSync(path.join(root,'app'));
 fs.writeFileSync(path.join(root,'app','page.tsx'),'release one');
 const first=sourceDeploymentId(root);
 assert.match(first,/^og-[a-f0-9]{24}$/);
 assert.equal(sourceDeploymentId(root),first,'Same source must produce the same identity at build and startup');
 fs.writeFileSync(path.join(root,'.env.local'),'synthetic-secret');
 fs.mkdirSync(path.join(root,'.next'));
 fs.writeFileSync(path.join(root,'.next','BUILD_ID'),'unrelated-build');
 fs.mkdirSync(path.join(root,'public','assets'),{recursive:true});
 fs.writeFileSync(path.join(root,'public','assets','runtime.txt'),'synthetic durable upload');
 assert.equal(sourceDeploymentId(root),first,'Secrets and previous build output must not affect identity');
 fs.writeFileSync(path.join(root,'app','page.tsx'),'release two');
 assert.notEqual(sourceDeploymentId(root),first,'Changed application source must invalidate asset cache keys');
 console.log('Deployment identity checks passed');
} finally { fs.rmSync(root,{recursive:true,force:true}); }
