-- REVIEWED SETUP SCRIPT. Apply in Supabase SQL Editor only after a fresh backup.
-- Requires the existing og_private.workspaces/revisions and og_load_records/og_save_records.
-- This does not import records, move funds, send emails, or modify existing revisions.
begin;
create table public.og_app_users (
 auth_id uuid primary key, workspace_id text not null references og_private.workspaces(user_id),
 name text not null check(length(name) between 1 and 200), email text not null,
 phone text not null default '', role text not null check(role in ('Global Admin','Management','Maintenance','Accounting Clerk','Accountant','External CPA')),
 property_ids text[] not null, status text not null check(status in ('Active','Disabled')),
 must_change_password boolean not null default true, created timestamptz not null default now(),updated timestamptz not null default now(),
 unique(workspace_id,email)
);
create table public.og_app_sessions (
 session_id uuid primary key,auth_id uuid not null references public.og_app_users(auth_id),
 workspace_id text not null references og_private.workspaces(user_id),active boolean not null default true,
 created timestamptz not null default now()
);
create index og_app_sessions_member on public.og_app_sessions(workspace_id,auth_id);
create table public.og_app_documents (
 id text primary key,workspace_id text not null references og_private.workspaces(user_id),
 statement_id text not null,expense_id text not null,name text not null,mime text not null,
 size integer not null check(size between 1 and 10000000),key text not null unique,sha256 text not null,
 created timestamptz not null default now()
);
create index og_app_documents_workspace on public.og_app_documents(workspace_id);
create table public.og_app_logs (
 id uuid primary key,workspace_id text not null references og_private.workspaces(user_id),at timestamptz not null default now(),
 actor text not null,category text not null,level text not null,event text not null,detail text not null
);
create index og_app_logs_workspace_time on public.og_app_logs(workspace_id,at);
create table public.og_auth_attempts (bucket text primary key, count integer not null,updated timestamptz not null default now());
alter table public.og_app_users enable row level security;
alter table public.og_app_sessions enable row level security;
alter table public.og_app_documents enable row level security;
alter table public.og_app_logs enable row level security;
alter table public.og_auth_attempts enable row level security;
revoke all on public.og_app_sessions,public.og_app_users,public.og_app_documents,public.og_app_logs,public.og_auth_attempts from public,anon,authenticated;
grant select,insert,update on public.og_app_users,public.og_app_sessions to service_role;
grant select,insert on public.og_app_documents,public.og_app_logs to service_role;
grant select,insert,update,delete on public.og_auth_attempts to service_role;
-- No browser role can read these tables; trusted server checks membership before every read/write.
create function public.og_auth_attempt(p_bucket text,p_limit integer) returns boolean
language plpgsql security invoker set search_path='' as $$
declare n integer;
begin
 if p_limit<1 or p_limit>500 or length(p_bucket)>200 then raise exception 'Invalid rate limit'; end if;
 insert into public.og_auth_attempts(bucket,count) values(p_bucket,1)
 on conflict(bucket) do update set count=public.og_auth_attempts.count+1,updated=now() returning count into n;
 delete from public.og_auth_attempts where updated<now()-interval '2 days';
 return n<=p_limit;
end; $$;
create function public.og_bootstrap_member(p_workspace text,p_auth uuid,p_email text,p_name text,p_phone text) returns void
language plpgsql security invoker set search_path='' as $$
declare props text[];
begin
 perform 1 from og_private.workspaces where user_id=p_workspace for update;
 if not found or exists(select 1 from public.og_app_users where workspace_id=p_workspace) then raise exception 'Setup closed or workspace unavailable'; end if;
 select array(select jsonb_array_elements(r.payload->'properties')->>'id') into props
 from og_private.workspaces w join og_private.revisions r on r.user_id=w.user_id and r.revision=w.revision where w.user_id=p_workspace;
 insert into public.og_app_users(auth_id,workspace_id,name,email,phone,role,property_ids,status,must_change_password)
 values(p_auth,p_workspace,p_name,lower(p_email),p_phone,'Global Admin',props,'Active',false);
 insert into public.og_app_logs(id,workspace_id,actor,category,level,event,detail)
 values(gen_random_uuid(),p_workspace,p_name,'Access','Info','Global Admin created','Initial Global Admin membership created; SMS is not enabled.');
end; $$;
create function public.og_manage_member(p_actor uuid,p_workspace text,p_target uuid,p_name text,p_email text,p_phone text,p_role text,p_properties text[],p_status text) returns void
language plpgsql security invoker set search_path='' as $$
declare a public.og_app_users; t public.og_app_users; props text[];
begin
 perform 1 from og_private.workspaces where user_id=p_workspace for update;
 select * into a from public.og_app_users where auth_id=p_actor and workspace_id=p_workspace and status='Active' and not must_change_password;
 if not found or a.role not in ('Global Admin','Management') or p_target=p_actor then raise exception 'Access denied'; end if;
 select * into t from public.og_app_users where auth_id=p_target and workspace_id=p_workspace;
 if a.role='Management' and (p_role='Global Admin' or t.role='Global Admin') then raise exception 'Access denied'; end if;
 if t.role='Global Admin' and (p_role<>'Global Admin' or p_status='Disabled') and not exists(select 1 from public.og_app_users where workspace_id=p_workspace and role='Global Admin' and status='Active' and auth_id<>p_target) then raise exception 'Preserve an active Global Admin'; end if;
 select array(select jsonb_array_elements(r.payload->'properties')->>'id') into props
 from og_private.workspaces w join og_private.revisions r on r.user_id=w.user_id and r.revision=w.revision where w.user_id=p_workspace;
 if p_role in ('Global Admin','Management','Accountant','External CPA') then p_properties:=props; end if;
 if cardinality(p_properties)<1 or not p_properties<@props or cardinality(p_properties)<>(select count(distinct x) from unnest(p_properties) x) then raise exception 'Invalid property scope'; end if;
 if exists(select 1 from public.og_app_users where auth_id=p_target and workspace_id<>p_workspace) then raise exception 'Account belongs to another workspace'; end if;
 insert into public.og_app_users(auth_id,workspace_id,name,email,phone,role,property_ids,status)
 values(p_target,p_workspace,p_name,lower(p_email),p_phone,p_role,p_properties,p_status)
 on conflict(auth_id) do update set name=excluded.name,phone=excluded.phone,role=excluded.role,property_ids=excluded.property_ids,status=excluded.status,updated=now();
 insert into public.og_app_logs(id,workspace_id,actor,category,level,event,detail)
 values(gen_random_uuid(),p_workspace,a.name,'Access','Info','User access changed',p_name||' · '||p_role||' · '||p_status);
end; $$;
revoke all on function public.og_auth_attempt(text,integer) from public,anon,authenticated;
revoke all on function public.og_bootstrap_member(text,uuid,text,text,text) from public,anon,authenticated;
revoke all on function public.og_manage_member(uuid,text,uuid,text,text,text,text,text[],text) from public,anon,authenticated;
grant execute on function public.og_auth_attempt(text,integer) to service_role;
grant execute on function public.og_bootstrap_member(text,uuid,text,text,text) to service_role;
grant execute on function public.og_manage_member(uuid,text,uuid,text,text,text,text,text[],text) to service_role;
commit;
