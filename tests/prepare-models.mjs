import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {stripTypeScriptTypes} from 'node:module';
// Prepare every transitive model import, so new model dependencies do not leave
// stale hand-maintained test fixtures unable to load.
export async function prepareModels(runtime,names){
 await mkdir(runtime,{recursive:true});const seen=new Set();
 async function prepare(name){
  if(seen.has(name))return;seen.add(name);
  let source=await readFile(new URL('../lib/'+name+'.ts',import.meta.url),'utf8');
  if(name==='seed')source=source.replace("import roster from './roster.json';",'const roster='+await readFile(new URL('../lib/roster.json',import.meta.url),'utf8')+';');
  const code=stripTypeScriptTypes(source,{mode:'transform'});
  for(const match of code.matchAll(/from ['"]\.\/([^'"]+)['"]/g))await prepare(match[1]);
  await writeFile(new URL(name+'.mjs',runtime),code.replace(/from (['"])\.\/([^'"]+)\1/g,(_,quote,path)=>'from '+quote+'./'+path+'.mjs'+quote));
 }
 for(const name of names)await prepare(name);
}
