-- Provider-independent SaaS billing. No payment requests or existing client record changes.
begin;
create table public.og_subscriptions(workspace_id text primary key references public.og_companies(workspace_id),status text not null default 'Pending activation' check(status in ('Pending activation','Active','Paused','Cancelled')),payment_method text not null default 'Not selected' check(payment_method in ('Not selected','ACH','Credit card')),updated timestamptz not null default now());
create table public.og_subscription_units(workspace_id text not null references public.og_companies(workspace_id),unit_id text not null,enabled boolean not null,updated timestamptz not null default now(),primary key(workspace_id,unit_id));
create table public.og_subscription_invoices(id uuid primary key default gen_random_uuid(),workspace_id text not null references public.og_companies(workspace_id),month text not null check(month ~ '^\d{4}-(0[1-9]|1[0-2])$'),base_cents integer not null check(base_cents=999),unit_cents integer not null check(unit_cents=110),unit_ids jsonb not null check(jsonb_typeof(unit_ids)='array'),total_cents integer not null check(total_cents=999+110*jsonb_array_length(unit_ids)),status text not null default 'Draft' check(status='Draft'),created timestamptz not null default now(),unique(workspace_id,month));
create table public.og_platform_audit(id uuid primary key default gen_random_uuid(),workspace_id text references public.og_companies(workspace_id),actor uuid not null references auth.users(id),event text not null,detail jsonb not null default '{}',created timestamptz not null default now());
alter table public.og_subscriptions enable row level security;
alter table public.og_subscription_units enable row level security;
alter table public.og_subscription_invoices enable row level security;
alter table public.og_platform_audit enable row level security;
revoke all on public.og_subscriptions,public.og_subscription_units,public.og_subscription_invoices,public.og_platform_audit from public,anon,authenticated;
grant select,insert,update on public.og_subscriptions,public.og_subscription_units to service_role;
grant select,insert on public.og_subscription_invoices,public.og_platform_audit to service_role;
insert into public.og_subscriptions(workspace_id) select workspace_id from public.og_companies;
create function public.og_billing_overview(p_actor uuid,p_workspace text default null) returns jsonb language plpgsql security invoker set search_path='' as $$
declare owner_access boolean; result jsonb;
begin
 owner_access:=exists(select 1 from public.og_platform_owners where auth_id=p_actor and active);
 if not owner_access and not exists(select 1 from public.og_app_users u join public.og_companies c using(workspace_id) where u.auth_id=p_actor and u.workspace_id=p_workspace and u.status='Active' and c.status='Active' and not u.must_change_password and u.role='Global Admin') then raise exception 'Billing access denied'; end if;
 select coalesce(jsonb_agg(jsonb_build_object('workspace_id',c.workspace_id,'name',c.name,'login_slug',c.login_slug,'company_status',c.status,'status',coalesce(s.status,'Pending activation'),'payment_method',coalesce(s.payment_method,'Not selected'),'units',coalesce((select jsonb_agg(jsonb_build_object('id',j->>'id','number',j->>'number','enabled',coalesce(b.enabled,true)) order by j->>'number') from jsonb_array_elements(r.payload->'units') j left join public.og_subscription_units b on b.workspace_id=c.workspace_id and b.unit_id=j->>'id'),'[]'::jsonb),'invoices',coalesce((select jsonb_agg(to_jsonb(i) order by i.month desc) from public.og_subscription_invoices i where i.workspace_id=c.workspace_id),'[]'::jsonb),'audit',coalesce((select jsonb_agg(to_jsonb(a) order by a.created desc) from (select * from public.og_platform_audit where workspace_id=c.workspace_id order by created desc limit 30) a),'[]'::jsonb)) order by c.name),'[]'::jsonb) into result from public.og_companies c join og_private.workspaces w on w.user_id=c.workspace_id join og_private.revisions r on r.user_id=w.user_id and r.revision=w.revision left join public.og_subscriptions s using(workspace_id) where p_workspace is null or c.workspace_id=p_workspace;
 return result;
end;$$;
create function public.og_manage_subscription(p_actor uuid,p_workspace text,p_action text,p_value text,p_unit text default null) returns void language plpgsql security invoker set search_path='' as $$
declare owner_access boolean;
begin
 owner_access:=exists(select 1 from public.og_platform_owners where auth_id=p_actor and active);
 -- Serialize invoice snapshots and subscription changes per company.
 perform 1 from public.og_companies where workspace_id=p_workspace for update;
 if not found then raise exception 'Company not found'; end if;
 if not owner_access and not exists(select 1 from public.og_app_users u join public.og_companies c using(workspace_id) where u.auth_id=p_actor and u.workspace_id=p_workspace and u.status='Active' and c.status='Active' and not u.must_change_password and u.role='Global Admin') then raise exception 'Billing access denied'; end if;
 insert into public.og_subscriptions(workspace_id) values(p_workspace) on conflict do nothing;
 if p_action='status' then
  if not owner_access or p_value not in ('Pending activation','Active','Paused','Cancelled') then raise exception 'Super Admin required'; end if;
  update public.og_subscriptions set status=p_value,updated=now() where workspace_id=p_workspace;
 elsif p_action='cancel' then
  if exists(select 1 from public.og_subscriptions where workspace_id=p_workspace and status='Cancelled') then return; end if;
  update public.og_subscriptions set status='Cancelled',updated=now() where workspace_id=p_workspace;
 elsif p_action='restart' then
  if exists(select 1 from public.og_subscriptions where workspace_id=p_workspace and status='Pending activation') then return; end if;
  if not exists(select 1 from public.og_subscriptions where workspace_id=p_workspace and status in ('Cancelled','Paused')) then raise exception 'Only cancelled or paused subscriptions can restart'; end if;
  update public.og_subscriptions set status='Pending activation',updated=now() where workspace_id=p_workspace;
 elsif p_action='payment_method' then
  if p_value not in ('Not selected','ACH','Credit card') then raise exception 'Invalid payment preference'; end if;
  update public.og_subscriptions set payment_method=p_value,updated=now() where workspace_id=p_workspace;
 elsif p_action='unit' then
  if p_value not in ('enabled','disabled') or not exists(select 1 from og_private.workspaces w join og_private.revisions r on r.user_id=w.user_id and r.revision=w.revision cross join lateral jsonb_array_elements(r.payload->'units') j where w.user_id=p_workspace and j->>'id'=p_unit) then raise exception 'Select a company unit'; end if;
  insert into public.og_subscription_units(workspace_id,unit_id,enabled) values(p_workspace,p_unit,p_value='enabled') on conflict(workspace_id,unit_id) do update set enabled=excluded.enabled,updated=now();
 else raise exception 'Unknown subscription action'; end if;
 insert into public.og_platform_audit(workspace_id,actor,event,detail) values(p_workspace,p_actor,'Subscription '||p_action,jsonb_build_object('value',p_value,'unit_id',p_unit));
end;$$;
create function public.og_draft_subscription_invoice(p_actor uuid,p_workspace text,p_month text) returns jsonb language plpgsql security invoker set search_path='' as $$
declare ids jsonb; invoice public.og_subscription_invoices;
begin
 if not exists(select 1 from public.og_platform_owners where auth_id=p_actor and active) then raise exception 'Super Admin required'; end if;
 if p_month<>to_char(now() at time zone 'America/Chicago','YYYY-MM') then raise exception 'Choose the current billing month'; end if;
 perform 1 from public.og_companies where workspace_id=p_workspace and status='Active' for update;
 if not found or not exists(select 1 from public.og_subscriptions where workspace_id=p_workspace and status='Active') then raise exception 'Activate company and subscription first'; end if;
 select * into invoice from public.og_subscription_invoices where workspace_id=p_workspace and month=p_month;
 if found then return to_jsonb(invoice); end if;
 select coalesce(jsonb_agg(distinct j->>'id'),'[]'::jsonb) into ids from og_private.workspaces w join og_private.revisions r on r.user_id=w.user_id and r.revision=w.revision cross join lateral jsonb_array_elements(r.payload->'units') j left join public.og_subscription_units b on b.workspace_id=w.user_id and b.unit_id=j->>'id' where w.user_id=p_workspace and coalesce(b.enabled,true);
 insert into public.og_subscription_invoices(workspace_id,month,base_cents,unit_cents,unit_ids,total_cents) values(p_workspace,p_month,999,110,ids,999+110*jsonb_array_length(ids)) returning * into invoice;
 insert into public.og_platform_audit(workspace_id,actor,event,detail) values(p_workspace,p_actor,'Monthly invoice drafted',jsonb_build_object('invoice_id',invoice.id,'month',p_month,'total_cents',invoice.total_cents));
 return to_jsonb(invoice);
end;$$;
create function public.og_onboard_company(p_auth uuid,p_name text,p_slug text,p_domain text,p_admin_name text,p_payload jsonb) returns text language plpgsql security invoker set search_path='' as $$
declare workspace text; mail text; props text[];
begin
 -- Lock verified identity so a repeated submit cannot create duplicate portals.
 select lower(email) into mail from auth.users where id=p_auth and email_confirmed_at is not null for update;
 if mail is null or exists(select 1 from public.og_platform_owners where auth_id=p_auth or lower(email)=mail) then raise exception 'Verified client identity required'; end if;
 select workspace_id into workspace from public.og_app_users where auth_id=p_auth;
 if found then return workspace; end if;
 if length(p_admin_name) not between 1 and 200 or jsonb_typeof(p_payload) is distinct from 'object' or jsonb_array_length(p_payload->'units') is distinct from 0 or jsonb_array_length(p_payload->'owners') is distinct from 0 or jsonb_array_length(p_payload->'statements') is distinct from 0 then raise exception 'Blank company required'; end if;
 select array(select jsonb_array_elements(p_payload->'properties')->>'id') into props;
 if cardinality(props)<>1 then raise exception 'Initial property required'; end if;
 workspace:=gen_random_uuid()::text;
 insert into og_private.workspaces values(workspace,0,'client-onboarding');
 insert into og_private.revisions(user_id,revision,operation,payload) values(workspace,0,'client-onboarding',p_payload);
 insert into public.og_companies(workspace_id,name,login_slug,email_domain) values(workspace,p_name,p_slug,p_domain);
 insert into public.og_app_users(auth_id,workspace_id,name,email,role,property_ids,status,must_change_password) values(p_auth,workspace,p_admin_name,mail,'Global Admin',props,'Active',false);
 insert into public.og_subscriptions(workspace_id) values(workspace);
 insert into public.og_platform_audit(workspace_id,actor,event,detail) values(workspace,p_auth,'Client onboarding completed',jsonb_build_object('pricing_version','999-plus-110-v1','activation','Pending','terms','Pricing acknowledged; no payment authorized'));
 return workspace;
end;$$;
create function public.og_platform_manage_user(p_actor uuid,p_workspace text,p_target uuid,p_name text,p_role text,p_status text) returns void language plpgsql security invoker set search_path='' as $$
declare target public.og_app_users;
begin
 if not exists(select 1 from public.og_platform_owners where auth_id=p_actor and active) then raise exception 'Super Admin required'; end if;
 perform 1 from public.og_companies where workspace_id=p_workspace for update;
 select * into target from public.og_app_users where auth_id=p_target and workspace_id=p_workspace for update;
 if not found or length(p_name) not between 1 and 200 or p_status not in ('Active','Disabled') or p_role not in ('Global Admin','Management','Accountant','External CPA','Accounting Clerk','Analyst / Agent','Maintenance') then raise exception 'Choose a company user and valid details'; end if;
 if target.role='Global Admin' and target.status='Active' and (p_role<>'Global Admin' or p_status<>'Active') and not exists(select 1 from public.og_app_users where workspace_id=p_workspace and auth_id<>p_target and role='Global Admin' and status='Active') then raise exception 'Keep one active Company Admin'; end if;
 update public.og_app_users set name=p_name,role=p_role,status=p_status,updated=now() where auth_id=p_target and workspace_id=p_workspace;
 if p_status='Disabled' then update public.og_app_sessions set active=false where auth_id=p_target and workspace_id=p_workspace; end if;
 insert into public.og_platform_audit(workspace_id,actor,event,detail) values(p_workspace,p_actor,'Company user updated',jsonb_build_object('auth_id',p_target,'role',p_role,'status',p_status));
end;$$;
revoke all on function public.og_billing_overview(uuid,text),public.og_manage_subscription(uuid,text,text,text,text),public.og_draft_subscription_invoice(uuid,text,text),public.og_onboard_company(uuid,text,text,text,text,jsonb),public.og_platform_manage_user(uuid,text,uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.og_billing_overview(uuid,text),public.og_manage_subscription(uuid,text,text,text,text),public.og_draft_subscription_invoice(uuid,text,text),public.og_onboard_company(uuid,text,text,text,text,jsonb),public.og_platform_manage_user(uuid,text,uuid,text,text,text) to service_role;
commit;
