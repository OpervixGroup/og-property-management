alter table public.og_subscriptions add column if not exists receipt_email text not null default '';
create or replace function public.og_billing_overview(p_actor uuid,p_workspace text default null) returns jsonb language plpgsql security invoker set search_path='' as $$
declare owner_access boolean; result jsonb;
begin
 owner_access:=exists(select 1 from public.og_platform_owners where auth_id=p_actor and active);
 if not owner_access and not exists(select 1 from public.og_app_users u join public.og_companies c using(workspace_id) where u.auth_id=p_actor and u.workspace_id=p_workspace and u.status='Active' and c.status='Active' and not u.must_change_password and u.role='Global Admin') then raise exception 'Billing access denied'; end if;
 select coalesce(jsonb_agg(jsonb_build_object('workspace_id',c.workspace_id,'name',c.name,'login_slug',c.login_slug,'company_status',c.status,'status',coalesce(s.status,'Pending activation'),'payment_method',coalesce(s.payment_method,'Not selected'),'receipt_email',coalesce(s.receipt_email,''),'units',coalesce((select jsonb_agg(jsonb_build_object('id',j->>'id','number',j->>'number','enabled',coalesce(b.enabled,true)) order by j->>'number') from jsonb_array_elements(r.payload->'units') j left join public.og_subscription_units b on b.workspace_id=c.workspace_id and b.unit_id=j->>'id'),'[]'::jsonb),'invoices',coalesce((select jsonb_agg(to_jsonb(i) order by i.month desc) from public.og_subscription_invoices i where i.workspace_id=c.workspace_id),'[]'::jsonb),'audit',coalesce((select jsonb_agg(to_jsonb(a) order by a.created desc) from (select * from public.og_platform_audit where workspace_id=c.workspace_id order by created desc limit 30) a),'[]'::jsonb)) order by c.name),'[]'::jsonb) into result from public.og_companies c join og_private.workspaces w on w.user_id=c.workspace_id join og_private.revisions r on r.user_id=w.user_id and r.revision=w.revision left join public.og_subscriptions s using(workspace_id) where p_workspace is null or c.workspace_id=p_workspace;
 return result;
end;$$;
create or replace function public.og_manage_subscription(p_actor uuid,p_workspace text,p_action text,p_value text,p_unit text default null) returns void language plpgsql security invoker set search_path='' as $$
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
 elsif p_action='receipt_email' then
  if p_value is null or length(p_value)>254 or p_value !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'Enter a valid receipt email'; end if;
  update public.og_subscriptions set receipt_email=lower(trim(p_value)),updated=now() where workspace_id=p_workspace;
 elsif p_action='payment_method' then
  if p_value not in ('Not selected','ACH','Credit card') then raise exception 'Invalid payment preference'; end if;
  update public.og_subscriptions set payment_method=p_value,updated=now() where workspace_id=p_workspace;
 elsif p_action='unit' then
  if p_value not in ('enabled','disabled') or not exists(select 1 from og_private.workspaces w join og_private.revisions r on r.user_id=w.user_id and r.revision=w.revision cross join lateral jsonb_array_elements(r.payload->'units') j where w.user_id=p_workspace and j->>'id'=p_unit) then raise exception 'Select a company unit'; end if;
  insert into public.og_subscription_units(workspace_id,unit_id,enabled) values(p_workspace,p_unit,p_value='enabled') on conflict(workspace_id,unit_id) do update set enabled=excluded.enabled,updated=now();
 else raise exception 'Unknown subscription action'; end if;
 insert into public.og_platform_audit(workspace_id,actor,event,detail) values(p_workspace,p_actor,'Subscription '||p_action,jsonb_build_object('value',p_value,'unit_id',p_unit));
end;$$;
create or replace function public.og_onboard_company_billing(p_auth uuid,p_name text,p_slug text,p_domain text,p_admin_name text,p_payload jsonb,p_receipt_email text,p_payment_method text) returns text language plpgsql security invoker set search_path='' as $$
declare workspace text; existing_workspace text;
begin
 if p_receipt_email is null or length(p_receipt_email)>254 or p_receipt_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'Enter a valid receipt email'; end if;
 if p_payment_method is null or p_payment_method not in ('Not selected','ACH','Credit card') then raise exception 'Invalid payment preference'; end if;
 perform 1 from auth.users where id=p_auth and email_confirmed_at is not null for update;
 if not found then raise exception 'Verified client identity required'; end if;
 select workspace_id into existing_workspace from public.og_app_users where auth_id=p_auth;
 workspace:=public.og_onboard_company(p_auth,p_name,p_slug,p_domain,p_admin_name,p_payload);
 if existing_workspace is null then
  perform public.og_manage_subscription(p_auth,workspace,'receipt_email',p_receipt_email,null);
  perform public.og_manage_subscription(p_auth,workspace,'payment_method',p_payment_method,null);
 end if;
 return workspace;
end;$$;
revoke all on function public.og_onboard_company_billing(uuid,text,text,text,text,jsonb,text,text) from public,anon,authenticated;
grant execute on function public.og_onboard_company_billing(uuid,text,text,text,text,jsonb,text,text) to service_role;