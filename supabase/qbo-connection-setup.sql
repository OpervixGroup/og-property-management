-- Optional provider setup, separate from financial snapshots. Apply only before enabling QBO.
begin;
create table if not exists public.og_qbo_connections (
 workspace_id text primary key references og_private.workspaces(user_id),
 generation uuid not null default gen_random_uuid(),
 realm_id text, company_name text, environment text check(environment in ('sandbox','production')),
 ciphertext text, status text not null default 'Disconnected' check(status in ('Disconnected','Connected','Reconnect required')),
 lease_token uuid, lease_until timestamptz, updated timestamptz not null default now()
);
alter table public.og_qbo_connections enable row level security;
revoke all on public.og_qbo_connections from public,anon,authenticated;
grant select,insert,update,delete on public.og_qbo_connections to service_role;
create or replace function public.og_claim_qbo(p_workspace text,p_generation uuid,p_lease uuid)
returns boolean language sql security invoker set search_path='' as $$
 with claimed as (update public.og_qbo_connections set lease_token=p_lease,lease_until=now()+interval '5 minutes'
 where workspace_id=p_workspace and generation=p_generation and (lease_until is null or lease_until<now()) returning 1)
 select exists(select 1 from claimed);
$$;
revoke all on function public.og_claim_qbo(text,uuid,uuid) from public,anon,authenticated;
grant execute on function public.og_claim_qbo(text,uuid,uuid) to service_role;
commit;
