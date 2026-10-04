-- REVIEW DRAFT: not yet executed against project conganplywqzmuktmyxd.
-- First migration phase preserves the existing versioned OG record format.
-- Apply only after inspecting existing project objects and taking backups.
-- Browser clients must never receive the server key or call these functions.
begin;
create schema og_private;
revoke all on schema og_private from public, anon, authenticated;
grant usage on schema og_private to service_role;
create table og_private.workspaces (
 user_id text primary key,
 revision bigint not null check (revision >= 0),
 operation text not null
);
create table og_private.revisions (
 user_id text not null references og_private.workspaces(user_id),
 revision bigint not null check (revision >= 0),
 operation text not null check (length(operation) between 1 and 100),
 payload jsonb not null check (jsonb_typeof(payload) = 'object'),
 created timestamptz not null default now(),
 primary key (user_id, revision),
 unique (user_id, operation)
);
alter table og_private.workspaces enable row level security;
alter table og_private.revisions enable row level security;
-- No anonymous/authenticated grants or policies: only the trusted OG server.
revoke all on all tables in schema og_private from public, anon, authenticated;
grant select, insert, update on og_private.workspaces to service_role;
grant select, insert on og_private.revisions to service_role;
create function public.og_load_records(p_user text,p_operation text default null) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare result jsonb;
begin
 select jsonb_build_object('revision', w.revision, 'data', r.payload, 'operationApplied', exists(select 1 from og_private.revisions h where h.user_id=p_user and h.operation=p_operation)) into result
 from og_private.workspaces w join og_private.revisions r
 on r.user_id=w.user_id and r.revision=w.revision where w.user_id=p_user;
 if result is null then raise exception using errcode='OG404', message='Workspace not migrated'; end if;
 return result;
end;
$$;
create function public.og_save_records(p_user text,p_revision bigint,p_operation text,p_data jsonb) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare current_revision bigint;
begin
 if p_operation is null or length(p_operation) not between 1 and 100 or jsonb_typeof(p_data) is distinct from 'object' then
  raise exception 'Invalid save input';
 end if;
 -- Row lock serializes every save and operation retry for this workspace.
 select revision into current_revision from og_private.workspaces where user_id=p_user for update;
 if not found then raise exception using errcode='OG404',message='Workspace not migrated'; end if;
 if exists(select 1 from og_private.revisions where user_id=p_user and operation=p_operation) then
  return public.og_load_records(p_user);
 end if;
 if current_revision <> p_revision then raise exception using errcode='OG409',message='Revision conflict'; end if;
 insert into og_private.revisions(user_id,revision,operation,payload) values(p_user,p_revision+1,p_operation,p_data);
 update og_private.workspaces set revision=p_revision+1,operation=p_operation where user_id=p_user;
 return public.og_load_records(p_user);
end;
$$;
revoke all on function public.og_load_records(text,text) from public,anon,authenticated;
revoke all on function public.og_save_records(text,bigint,text,jsonb) from public,anon,authenticated;
grant execute on function public.og_load_records(text,text) to service_role;
grant execute on function public.og_save_records(text,bigint,text,jsonb) to service_role;
commit;
