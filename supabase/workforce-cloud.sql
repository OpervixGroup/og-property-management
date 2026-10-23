-- Opervix cloud workforce evidence. Apply before enabling the ingestion secret.
begin;
create table if not exists public.og_workforce_runs (
 external_id text primary key check(length(external_id) between 1 and 100),
 agent_id text not null check(length(agent_id) between 1 and 100),
 office text not null check(length(office) between 1 and 40),
 role text not null check(length(role) between 1 and 150),
 task text not null check(length(task) between 1 and 1000),
 status text not null check(status in ('Working','Completed','Blocked','Failed')),
 result text not null default '' check(length(result)<=2000),
 started_at timestamptz not null,
 finished_at timestamptz,
 updated_at timestamptz not null default now(),
 check(status='Working' or finished_at is not null)
);
create index if not exists og_workforce_runs_started_idx on public.og_workforce_runs(started_at desc);
alter table public.og_workforce_runs enable row level security;
revoke all on public.og_workforce_runs from public,anon,authenticated;
grant select,insert,update,delete on public.og_workforce_runs to service_role;

create table if not exists public.og_workforce_messages (
 external_id text primary key check(length(external_id) between 1 and 100),
 office text not null check(length(office) between 1 and 40),
 sender text not null check(length(sender) between 1 and 150),
 recipient text not null check(length(recipient) between 1 and 150),
 kind text not null check(length(kind) between 1 and 50),
 text text not null check(length(text) between 1 and 4000),
 recorded_at timestamptz not null,
 task_id text check(task_id is null or length(task_id)<=100)
);
create index if not exists og_workforce_messages_recorded_idx on public.og_workforce_messages(recorded_at desc);
alter table public.og_workforce_messages enable row level security;
revoke all on public.og_workforce_messages from public,anon,authenticated;
grant select,insert,update,delete on public.og_workforce_messages to service_role;
commit;
