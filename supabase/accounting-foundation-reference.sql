-- STAGING REFERENCE ONLY. Not a production migration and not called by OG yet.
-- Create a CLI migration only after a private restore/backfill and comparison.
-- Native application validation remains required. This adds database constraints
-- for a future normalized ledger; it does not import or post customer finances.
begin;
create schema og_ledger_staging;
revoke all on schema og_ledger_staging from public,anon,authenticated;
grant usage on schema og_ledger_staging to service_role;
create table og_ledger_staging.books(
 workspace_id text not null,book_id text not null,company text not null,
 opening_date date not null,primary key(workspace_id,book_id)
);
create table og_ledger_staging.accounts(
 workspace_id text not null,book_id text not null,account_key text not null,
 account_type text not null,active boolean not null,
 primary key(workspace_id,book_id,account_key),
 foreign key(workspace_id,book_id) references og_ledger_staging.books
);
create table og_ledger_staging.period_locks(
 workspace_id text not null,book_id text not null,through_date date not null,
 reason text not null check(length(trim(reason)) between 1 and 2000),
 primary key(workspace_id,book_id,through_date),
 foreign key(workspace_id,book_id) references og_ledger_staging.books
);
create table og_ledger_staging.entries(
 workspace_id text not null,book_id text not null,entry_id text not null,
 operation_id text not null check(length(operation_id) between 1 and 100),
 posting_date date not null,reference text not null check(length(trim(reference)) between 1 and 200),
 source_system text not null,external_id text not null,
 reverses text,actor_id text not null check(length(trim(actor_id)) between 1 and 200),
 source jsonb not null check(jsonb_typeof(source)='object'),
 posting_transaction bigint not null default txid_current(),
 created timestamptz not null default now(),
 primary key(workspace_id,book_id,entry_id),
 unique(workspace_id,book_id,operation_id),
 foreign key(workspace_id,book_id) references og_ledger_staging.books,
 foreign key(workspace_id,book_id,reverses) references og_ledger_staging.entries,
 check((source_system='' and external_id='') or (length(trim(source_system)) between 1 and 100 and length(trim(external_id)) between 1 and 200))
);
create unique index entries_reference on og_ledger_staging.entries(workspace_id,book_id,lower(trim(reference)));
create unique index entries_external_source on og_ledger_staging.entries(workspace_id,book_id,lower(trim(source_system)),lower(trim(external_id))) where external_id<>'';
create unique index entries_original_reversal on og_ledger_staging.entries(workspace_id,book_id,reverses) where reverses is not null;
create index entries_book_date on og_ledger_staging.entries(workspace_id,book_id,posting_date,entry_id);
create table og_ledger_staging.lines(
 workspace_id text not null,book_id text not null,entry_id text not null,
 line_no integer not null check(line_no between 1 and 100),account_key text not null,
 debit bigint not null check(debit between 0 and 100000000000),
 credit bigint not null check(credit between 0 and 100000000000),
 unit_id text not null,memo text not null check(length(memo)<=500),
 primary key(workspace_id,book_id,entry_id,line_no),
 foreign key(workspace_id,book_id,entry_id) references og_ledger_staging.entries,
 foreign key(workspace_id,book_id,account_key) references og_ledger_staging.accounts,
 check((debit>0 and credit=0) or (credit>0 and debit=0))
);
create index lines_account_lookup on og_ledger_staging.lines(workspace_id,book_id,account_key,entry_id);
create function og_ledger_staging.immutable() returns trigger language plpgsql security invoker set search_path='' as $$begin raise exception 'Posted ledger history is immutable';end;$$;
create trigger entries_immutable before update or delete on og_ledger_staging.entries for each row execute function og_ledger_staging.immutable();
create trigger lines_immutable before update or delete on og_ledger_staging.lines for each row execute function og_ledger_staging.immutable();
create function og_ledger_staging.serialize_book() returns trigger language plpgsql security invoker set search_path='' as $$begin
 perform 1 from og_ledger_staging.books where workspace_id=new.workspace_id and book_id=new.book_id for update;
 if tg_table_name='entries' then new.posting_transaction=txid_current();new.created=transaction_timestamp();end if;
 return new;
end;$$;
create trigger entries_book_lock before insert on og_ledger_staging.entries for each row execute function og_ledger_staging.serialize_book();
create trigger periods_book_lock before insert on og_ledger_staging.period_locks for each row execute function og_ledger_staging.serialize_book();
create function og_ledger_staging.check_entry() returns trigger language plpgsql security invoker set search_path='' as $$
declare count_lines bigint; debits numeric; credits numeric; opening date; original og_ledger_staging.entries%rowtype;
begin
 select count(*),sum(debit),sum(credit) into count_lines,debits,credits from og_ledger_staging.lines where workspace_id=new.workspace_id and book_id=new.book_id and entry_id=new.entry_id;
 if count_lines not between 2 and 100 or debits is distinct from credits or debits<=0 then raise exception 'Journal must contain balanced exact-cent lines';end if;
 select opening_date into opening from og_ledger_staging.books where workspace_id=new.workspace_id and book_id=new.book_id;
 if new.posting_date<=opening or exists(select 1 from og_ledger_staging.period_locks where workspace_id=new.workspace_id and book_id=new.book_id and through_date>=new.posting_date) then raise exception 'Posting date is outside the open ledger period';end if;
 if exists(select 1 from og_ledger_staging.lines l join og_ledger_staging.accounts a using(workspace_id,book_id,account_key) where l.workspace_id=new.workspace_id and l.book_id=new.book_id and l.entry_id=new.entry_id and not a.active) then raise exception 'Account is inactive';end if;
 if new.reverses is not null then
  select * into original from og_ledger_staging.entries where workspace_id=new.workspace_id and book_id=new.book_id and entry_id=new.reverses;
  if original.reverses is not null or original.posting_date>new.posting_date or count_lines<>(select count(*) from og_ledger_staging.lines where workspace_id=new.workspace_id and book_id=new.book_id and entry_id=new.reverses) or exists(select 1 from og_ledger_staging.lines l left join og_ledger_staging.lines o on o.workspace_id=l.workspace_id and o.book_id=l.book_id and o.entry_id=new.reverses and o.line_no=l.line_no where l.workspace_id=new.workspace_id and l.book_id=new.book_id and l.entry_id=new.entry_id and (o.line_no is null or l.account_key<>o.account_key or l.debit<>o.credit or l.credit<>o.debit or l.unit_id<>o.unit_id or l.memo<>o.memo)) then raise exception 'Reversal must offset one original entry exactly';end if;
 end if;
 return null;
end;$$;
create constraint trigger entries_balance after insert on og_ledger_staging.entries deferrable initially deferred for each row execute function og_ledger_staging.check_entry();
-- A later attempt to add lines to an existing entry must be checked too.
create function og_ledger_staging.check_line() returns trigger language plpgsql security invoker set search_path='' as $$
declare entry_transaction bigint;
begin
 select posting_transaction into entry_transaction from og_ledger_staging.entries where workspace_id=new.workspace_id and book_id=new.book_id and entry_id=new.entry_id;
 if entry_transaction<>txid_current() then raise exception 'Posted ledger lines cannot be appended later';end if;
 return new;
end;$$;
create trigger lines_same_transaction before insert on og_ledger_staging.lines for each row execute function og_ledger_staging.check_line();
alter table og_ledger_staging.books enable row level security;
alter table og_ledger_staging.accounts enable row level security;
alter table og_ledger_staging.period_locks enable row level security;
alter table og_ledger_staging.entries enable row level security;
alter table og_ledger_staging.lines enable row level security;
revoke all on all tables in schema og_ledger_staging from public,anon,authenticated;
revoke all on all functions in schema og_ledger_staging from public,anon,authenticated;
grant select,insert on all tables in schema og_ledger_staging to service_role;
grant execute on all functions in schema og_ledger_staging to service_role;
commit;
