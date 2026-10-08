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
 elsif p_action='payment_method' then
  if p_value not in ('Not selected','ACH','Credit card') then raise exception 'Invalid payment preference'; end if;
  update public.og_subscriptions set payment_method=p_value,updated=now() where workspace_id=p_workspace;
 elsif p_action='unit' then
  if p_value not in ('enabled','disabled') or not exists(select 1 from og_private.workspaces w join og_private.revisions r on r.user_id=w.user_id and r.revision=w.revision cross join lateral jsonb_array_elements(r.payload->'units') j where w.user_id=p_workspace and j->>'id'=p_unit) then raise exception 'Select a company unit'; end if;
  insert into public.og_subscription_units(workspace_id,unit_id,enabled) values(p_workspace,p_unit,p_value='enabled') on conflict(workspace_id,unit_id) do update set enabled=excluded.enabled,updated=now();
 else raise exception 'Unknown subscription action'; end if;
 insert into public.og_platform_audit(workspace_id,actor,event,detail) values(p_workspace,p_actor,'Subscription '||p_action,jsonb_build_object('value',p_value,'unit_id',p_unit));
end;$$;
