create table if not exists public.og_support_events (
 id uuid primary key, workspace_id text not null, auth_id uuid, client_name text not null,
 kind text not null check(kind in ('Support','Incident')), subject text not null,
 message text not null, context text not null, state text not null check(state in ('Queued','Pending connection','Delivery uncertain','Accepted by Outlook','Rejected')),
 fingerprint text unique, created_at timestamptz not null default now(), attempted_at timestamptz);
alter table public.og_support_events enable row level security;
revoke all on public.og_support_events from anon,authenticated;
grant select,insert,update on public.og_support_events to service_role;
create index if not exists og_support_workspace_queue on public.og_support_events(workspace_id,state,created_at);
create index if not exists og_support_user_history on public.og_support_events(workspace_id,auth_id,created_at);