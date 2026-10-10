create index if not exists og_app_sessions_auth on public.og_app_sessions(auth_id);
create index if not exists og_platform_audit_actor on public.og_platform_audit(actor);
create index if not exists og_platform_audit_workspace_time on public.og_platform_audit(workspace_id,created);
create index if not exists og_platform_sessions_auth on public.og_platform_sessions(auth_id);

