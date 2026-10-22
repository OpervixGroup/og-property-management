import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {sourceDeploymentId} from '../scripts/deployment-id.cjs';
import {verifyBuildAssets} from '../scripts/verify-build-assets.mjs';
const root=fs.mkdtempSync(path.join(os.tmpdir(),'og-assets-'));
try {
 const write=(name,value)=>{const file=path.join(root,name);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,value);};
 const asset='static/chunks/app/platform/headquarters/page-fixture.js';
 for(const route of ['platform/headquarters/page','platform/headquarters/client-campus/page'])write('.next/server/app/'+route+'_client-reference-manifest.js',JSON.stringify({chunks:['6018',asset]}));
 write('.next/required-server-files.json',JSON.stringify({config:{deploymentId:sourceDeploymentId(root)}}));
 assert.throws(()=>verifyBuildAssets(root),/Missing or empty build asset/);
 write('.next/'+asset,'synthetic compiled page');
 assert.equal(verifyBuildAssets(root).assets,1);
 write('.next/'+asset,'');
 assert.throws(()=>verifyBuildAssets(root),/Missing or empty build asset/);
 write('.next/'+asset,'synthetic compiled page');
 write('app/page.tsx','changed source after build');
 assert.throws(()=>verifyBuildAssets(root),/identity does not match/);
 console.log('Missing asset and mismatched release checks passed');
} finally {fs.rmSync(root,{recursive:true,force:true});}
