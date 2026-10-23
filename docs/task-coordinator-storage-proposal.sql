-- REVIEW PROPOSAL ONLY. No live application is implied by this file.
-- Requires exact schema/permission approval and rollback review before applying.
begin;
create table public.og_coordinator_state (
 singleton boolean primary key default true check(singleton),
 revision bigint not null default 0 check(revision>=0),
 state jsonb not null check(jsonb_typeof(state)='object'),
 updated_at timestamptz not null default now()
);
alter table public.og_coordinator_state enable row level security;
revoke all on public.og_coordinator_state from public, anon, authenticated;
grant select,update on public.og_coordinator_state to service_role;
insert into public.og_coordinator_state(singleton,state) values(true,'{"control":{"paused":true,"epoch":0,"roles":{}},"tasks":{},"events":[]}');
create function public.og_coordinator_read() returns jsonb language sql security invoker set search_path='' as $$
 select jsonb_build_object('revision',revision,'state',state) from public.og_coordinator_state where singleton=true;
$$;
create function public.og_coordinator_cas(expected_revision bigint,next_state jsonb) returns boolean language plpgsql security invoker set search_path='' as $$
declare changed integer;
begin
 if next_state is null or jsonb_typeof(next_state)<>'object' or jsonb_typeof(next_state->'control') is distinct from 'object' or jsonb_typeof(next_state->'tasks') is distinct from 'object' or jsonb_typeof(next_state->'events') is distinct from 'array' then raise exception 'Invalid coordinator state';end if;
 update public.og_coordinator_state set state=next_state,revision=revision+1,updated_at=now() where singleton=true and revision=expected_revision;
 get diagnostics changed=row_count;return changed=1;
end;$$;
revoke all on function public.og_coordinator_read() from public,anon,authenticated;
revoke all on function public.og_coordinator_cas(bigint,jsonb) from public,anon,authenticated;
grant execute on function public.og_coordinator_read() to service_role;
grant execute on function public.og_coordinator_cas(bigint,jsonb) to service_role;
commit;
-- Rollback before any actual work: revoke function execute from service_role;
-- retain state/evidence; remove host invocation. Do not drop task history.
