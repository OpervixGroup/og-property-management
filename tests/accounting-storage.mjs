import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
const db=new PGlite();
try{
 await db.exec('create role anon;create role authenticated;create role service_role bypassrls;');
 await db.exec(await readFile(new URL('../supabase/accounting-foundation-reference.sql',import.meta.url),'utf8'));
 await db.exec("insert into og_ledger_staging.books values('a','book','Synthetic A','2026-09-30'),('b','book','Synthetic B','2026-09-30');insert into og_ledger_staging.accounts values('a','book','bank','Bank',true),('a','book','income','Income',true),('b','book','other','Bank',true);");
 async function post(id,reference=id,amount=100,credit=amount,reverses=null,workspace='a',account='bank'){
  try{await db.exec('begin');await db.query("insert into og_ledger_staging.entries(workspace_id,book_id,entry_id,operation_id,posting_date,reference,source_system,external_id,reverses,actor_id,source) values($1,'book',$2,$2,'2026-10-02',$3,'QA',$2,$4,'qa-actor','{}')",[workspace,id,reference,reverses]);await db.query("insert into og_ledger_staging.lines values($1,'book',$2,1,$3,$4,0,'',''),($1,'book',$2,2,'income',0,$5,'','')",[workspace,id,account,amount,credit]);await db.exec('commit');}catch(e){await db.exec('rollback');throw e;}
 }
 await post('one');assert.equal((await db.query('select count(*)::int n from og_ledger_staging.entries')).rows[0].n,1);
 await assert.rejects(post('unbalanced','unbalanced',100,99),/balanced/);assert.equal((await db.query("select count(*)::int n from og_ledger_staging.entries where entry_id='unbalanced'")).rows[0].n,0);
 await assert.rejects(post('duplicate','ONE'),/unique/);
 await assert.rejects(post('cross-company','cross-company',100,100,null,'a','other'),/foreign key/);
 await assert.rejects(post('fractional','fractional',1.5,1.5),/bigint/);
 await assert.rejects(db.exec("update og_ledger_staging.entries set reference='rewrite' where entry_id='one'"),/immutable/);
 await assert.rejects(db.exec("delete from og_ledger_staging.lines where entry_id='one'"),/immutable/);
 await assert.rejects(db.exec("insert into og_ledger_staging.lines values('a','book','one',3,'bank',10,0,'','')"),/appended later/);
 await assert.rejects(post('bad-reversal','REV',100,100,'one'),/offset/);
 await db.exec("insert into og_ledger_staging.period_locks values('a','book','2026-10-31','Synthetic close');");await assert.rejects(post('locked'),/open ledger period/);
 for(const role of ['anon','authenticated']){await db.exec('set role '+role);await assert.rejects(db.exec('select * from og_ledger_staging.entries'),/permission/);await db.exec('reset role');}
 const rls=await db.query("select count(*)::int n from pg_class c join pg_namespace s on c.relnamespace=s.oid where s.nspname='og_ledger_staging' and relkind='r' and relrowsecurity");assert.equal(rls.rows[0].n,5);
 console.log('PASS staged normalized ledger: atomic balanced postings, workspace composite FKs, case-insensitive references, integer cents, immutable history, late line rejection, exact reversal guard, period locks, browser denial and RLS. No production migration executed.');
}finally{await db.close();}
