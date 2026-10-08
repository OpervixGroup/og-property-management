-- Additive company isolation and platform-owner control plane. No client financial records are changed.
begin;
create table public.og_companies(workspace_id text primary key references og_private.workspaces(user_id),name text not null check(length(name) between 1 and 100),login_slug text not null unique check(login_slug ~ '^[a-z0-9][a-z0-9-]{2,59}$'),email_domain text not null default '',status text not null default 'Active' check(status in ('Active','Disabled')),updated timestamptz not null default now());
create table public.og_platform_owners(email text primary key,auth_id uuid unique references auth.users(id),active boolean not null default true,created timestamptz not null default now());
create table public.og_platform_sessions(session_id uuid primary key,auth_id uuid not null references auth.users(id),active boolean not null default true,created timestamptz not null default now());
alter table public.og_companies enable row level security;
alter table public.og_platform_owners enable row level security;
alter table public.og_platform_sessions enable row level security;
revoke all on public.og_companies,public.og_platform_owners,public.og_platform_sessions from public,anon,authenticated;
grant select,insert,update on public.og_companies,public.og_platform_owners,public.og_platform_sessions to service_role;
insert into public.og_companies(workspace_id,name,login_slug,email_domain)
select w.user_id,case when exists(select 1 from public.og_app_users u where u.workspace_id=w.user_id and lower(u.email)='mmartinez@devonshirecondos.com') then 'Devonshire Leasing Agency Inc' else left(coalesce(r.payload->'properties'->0->>'companyName',r.payload->'properties'->0->>'name','Company'),100) end,case when exists(select 1 from public.og_app_users u where u.workspace_id=w.user_id and lower(u.email)='mmartinez@devonshirecondos.com') then 'devonshire' else 'company-'||left(md5(w.user_id),16) end,case when exists(select 1 from public.og_app_users u where u.workspace_id=w.user_id and lower(u.email)='mmartinez@devonshirecondos.com') then 'devonshirecondos.com' else '' end
from og_private.workspaces w join og_private.revisions r on r.user_id=w.user_id and r.revision=w.revision;
insert into public.og_platform_owners(email,auth_id) values('mmartinez@opervixgroup.com',(select id from auth.users where lower(email)='mmartinez@opervixgroup.com' and email_confirmed_at is not null));
create function public.og_create_company(p_actor uuid,p_workspace text,p_name text,p_slug text,p_domain text,p_auth uuid,p_email text,p_admin_name text,p_payload jsonb) returns void language plpgsql security invoker set search_path='' as $$
declare props text[];
begin
 if not exists(select 1 from public.og_platform_owners where auth_id=p_actor and active) then raise exception 'Platform owner required'; end if;
 if exists(select 1 from public.og_app_users where auth_id=p_auth) or exists(select 1 from public.og_platform_owners where auth_id=p_auth or lower(email)=lower(p_email)) then raise exception 'Use a separate client account'; end if;
 if not exists(select 1 from auth.users where id=p_auth and lower(email)=lower(p_email)) then raise exception 'Invalid administrator identity'; end if;
 if jsonb_typeof(p_payload) is distinct from 'object' or jsonb_array_length(p_payload->'units')<>0 or jsonb_array_length(p_payload->'statements')<>0 or jsonb_array_length(p_payload->'owners')<>0 then raise exception 'Start with a blank company'; end if;
 select array(select jsonb_array_elements(p_payload->'properties')->>'id') into props;
 if cardinality(props)<>1 then raise exception 'Choose the initial property'; end if;
 insert into og_private.workspaces values(p_workspace,0,'company-created');
 insert into og_private.revisions(user_id,revision,operation,payload) values(p_workspace,0,'company-created',p_payload);
 insert into public.og_companies(workspace_id,name,login_slug,email_domain) values(p_workspace,p_name,p_slug,p_domain);
 insert into public.og_app_users(auth_id,workspace_id,name,email,role,property_ids,status) values(p_auth,p_workspace,p_admin_name,lower(p_email),'Global Admin',props,'Active');
 insert into public.og_app_logs(id,workspace_id,actor,category,level,event,detail) values(gen_random_uuid(),p_workspace,'Platform owner','Access','Info','Company created',p_name);
end;$$;
revoke all on function public.og_create_company(uuid,text,text,text,text,uuid,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.og_create_company(uuid,text,text,text,text,uuid,text,text,jsonb) to service_role;
commit;
