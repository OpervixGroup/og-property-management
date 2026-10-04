-- Phase 1 upgrade for an existing standalone OG installation.
-- Review with the source release. Does not create members or change their access.
-- Existing login/session controls and table grants remain unchanged.
begin;
alter table public.og_app_users drop constraint og_app_users_role_check;
alter table public.og_app_users add constraint og_app_users_role_check
 check(role in ('Global Admin','Management','Analyst / Agent','Maintenance','Accounting Clerk','Accountant','External CPA'));
commit;
