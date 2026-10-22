import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {sourceDeploymentId} from './deployment-id.cjs';

export function verifyBuildAssets(root) {
 const build=path.join(root,'.next');
 const config=JSON.parse(fs.readFileSync(path.join(build,'required-server-files.json'),'utf8')).config;
 if(config.deploymentId!==sourceDeploymentId(root)) throw Error('Build deployment identity does not match packaged source');
 const refs=new Set();let manifests=0;
 const visit=directory=>{
  for(const name of fs.readdirSync(directory).sort()) {
   const file=path.join(directory,name),stat=fs.lstatSync(file);
   if(stat.isDirectory())visit(file);
   else if(name.endsWith('_client-reference-manifest.js')) {
    manifests++;
    for(const match of fs.readFileSync(file,'utf8').matchAll(/static\/(?:chunks|css)\/[^"'\s\\]+?\.(?:js|css)/g))refs.add(match[0]);
   }
  }
 };
 const app=path.join(build,'server','app');
 visit(app);
 for(const route of ['platform/headquarters/page','platform/headquarters/client-campus/page']) {
  if(!fs.existsSync(path.join(app,route+'_client-reference-manifest.js')))throw Error('Missing protected route manifest: '+route);
 }
 if(!manifests||!refs.size)throw Error('No application asset references found');
 for(const ref of refs){
  const file=path.resolve(build,decodeURIComponent(ref));
  if(!file.startsWith(path.resolve(build)+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()||!fs.statSync(file).size)throw Error('Missing or empty build asset: '+ref);
 }
 return {deploymentId:config.deploymentId,manifests,assets:refs.size};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log('Verified application build assets',verifyBuildAssets(process.cwd()));
