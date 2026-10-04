# Phase 1 foundation release

Builds on the restored 26.9.3 source. Adds shared identity/history validation, Analyst / Agent assigned-property entry, server-reviewed recoverable record actions, immutable review/audit evidence, stale approval checks, revision conflicts and replay protection. Eight primary navigation entries remain ordered; refresh has a successful timestamp and retains data on fetch failure. Wide tables scroll inside their content area.

Validation: 79 core checks, 30 access assertions, 20 foundation scenarios, standalone PostgreSQL suite, actual HTTP handlers using a disposable provider, and browser analyst/manager approval/cancel/delete/restore. Final production build passed with TypeScript. No real accounting postings or outbound messages were made.

Existing installations require supabase/upgrade-analyst-role.sql for the new role. It changes the allowed role names only; it creates no user and changes no existing assignment. Verify/apply that reviewed migration before activating Analyst / Agent accounts. Preserve current hosting configuration and workspace; do not run fresh standalone setup against an existing database. Keep the prior release for rollback.

Publish each accepted phase through the existing GoDaddy project using Node 22, npm run build, npm start. After publication verify sign-in, current saved data, eight destinations, refresh and a reversible nonfinancial record-action workflow. Later accounting, integration and module phases remain planned and are not certified by this release.
