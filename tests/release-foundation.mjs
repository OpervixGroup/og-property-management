import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {fixture} from './model-loader.mjs';
await fixture();
const {compatibleGLAccount}=await import('./.mock-runtime/gl-controls.mjs');
const account=type=>({key:'synthetic',number:'100',name:'Synthetic',type,detail:'',active:true,qboId:''});
assert.equal(compatibleGLAccount('DLA management income',account('Bank')),false);
assert.equal(compatibleGLAccount('DLA management income',account('Income')),true);
assert.equal(compatibleGLAccount('Owner management expense',account('Other Expense')),true);
assert.equal(compatibleGLAccount('Owner escrow',account('Income')),false);
assert.equal(compatibleGLAccount('Owner escrow',{...account('Bank'),active:false}),false);
const db=new PGlite();
try{await db.exec('create table public.og_app_sessions(auth_id uuid);create table public.og_platform_sessions(auth_id uuid);create table public.og_platform_audit(actor uuid,workspace_id text,created timestamptz);');
 const sql=await readFile(new URL('../supabase/performance-indexes.sql',import.meta.url),'utf8');await db.exec(sql);await db.exec(sql);
 const result=await db.query("select indexname from pg_indexes where schemaname='public'");assert.equal(result.rows.length,4);
}finally{await db.close();}
console.log('PASS compatible accounting roles, inactive account exclusion, four database indexes and repeat-safe setup');
