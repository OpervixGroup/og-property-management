// Revision-bound, JSON-only changes. Financial and authorization validation still
// runs on the reconstructed record on the trusted server before any save.
export type RecordPatch={path:string[];kind:'set'|'append';value:unknown};
const forbidden=new Set(['__proto__','prototype','constructor']);
const plain=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const equal=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b);
export function recordPatch(before:unknown,after:unknown):RecordPatch[]{
 const patches:RecordPatch[]=[];
 function visit(a:unknown,b:unknown,path:string[]){
  if(equal(a,b))return;
  if(Array.isArray(a)&&Array.isArray(b)&&b.length>=a.length&&a.every((v,i)=>equal(v,b[i]))){patches.push({path,kind:'append',value:b.slice(a.length)});return;}
  if(plain(a)&&plain(b)&&Object.keys(a).every(k=>Object.hasOwn(b,k))){for(const key of Object.keys(b))visit(a[key],b[key],[...path,key]);return;}
  patches.push({path,kind:'set',value:b});
 }
 visit(before,after,[]);return patches;
}
export function applyRecordPatch<T>(before:T,input:unknown):T{
 if(!Array.isArray(input)||input.length>10000)throw Error('Invalid workspace changes');
 let next:any=structuredClone(before);const seen:string[][]=[];
 for(const p of input){
  if(!p||!Array.isArray(p.path)||p.path.length>20||p.path.some((k:unknown)=>typeof k!=='string'||!k||/[\u0000-\u001f]/.test(k)||k.length>200||forbidden.has(k as string))||!['set','append'].includes(p.kind)||!Object.hasOwn(p,'value')||p.value===undefined)throw Error('Invalid workspace change path');
  if(seen.some(path=>path.slice(0,p.path.length).join('\0')===p.path.join('\0')||p.path.slice(0,path.length).join('\0')===path.join('\0')))throw Error('Overlapping workspace changes');
  seen.push(p.path);
  if(!p.path.length){if(p.kind!=='set'||!plain(p.value))throw Error('Invalid root change');next=structuredClone(p.value);continue;}
  let parent=next;for(const key of p.path.slice(0,-1)){if(!plain(parent)||!Object.hasOwn(parent,key))throw Error('Unknown workspace change path');parent=parent[key];}
  if(!plain(parent))throw Error('Workspace changes cannot address array elements');const key=p.path.at(-1)!;
  if(p.kind==='append'){if(!Object.hasOwn(parent,key)||!Array.isArray(parent[key])||!Array.isArray(p.value))throw Error('Invalid history append');parent[key].push(...structuredClone(p.value));}
  else parent[key]=structuredClone(p.value);
 }
 return next;
}
