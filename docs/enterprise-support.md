# Operations and support

Devonshire production: https://og.opervixgroup.com. Support: support@opervixgroup.com. Client name is server-configured using OG_CLIENT_NAME (default Devonshire Leasing Agency Inc), never accepted from a browser. Support records are isolated by OG_WORKSPACE_ID; the current deployment still serves one workspace. Future enterprise onboarding needs a verified tenant routing layer and per-client mailbox credentials, not client-supplied workspace IDs.

The assistant offers an explicit Live support email handoff, saved ticket number and status. It does not claim a staffed live chat. Only the submitted description and screen go to support; conversation, credentials, documents and financial ledgers are excluded. Global Admin/Management can review all workspace tickets; other users see their own requests. Five manual requests per user/hour; incident notices deduplicated per route/digest/hour. Server-only table with RLS and no anon/authenticated grants.

Internal Next.js server errors and browser unhandled errors queue sanitized incident notices. Handled validation failures, browser extensions, host outages and process crashes are not universal application error coverage. Add independent uptime/process monitoring in hosting for failures where the app cannot run or the database is unavailable. Queue failures emit a generic runtime log entry. Mail delivery is never required to finish a business transaction.

Outlook activation remains necessary: separate mailbox app registration, scoped Exchange Application RBAC to dla@devonshirecondos.com, private MS_TENANT_ID/MS_CLIENT_ID/MS_CLIENT_SECRET, OG_WORK_EMAIL_ENABLED=true after controlled send/read QA. Scheduler calls authenticated GET /api/work-email and drains maintenance plus support queues. Graph 202 means Accepted by Outlook, not confirmed delivery. Timeout/ambiguous delivery is held for review, never automatically resent.

Maintenance notices and matched tenant replies use the shared DLA mailbox. Other Communication actions remain drafts until a separate reviewed send workflow is implemented. Do not claim all communication is already connected.

## Production repair workflow

Use GoDaddy runtime logs and ticket references to diagnose remotely. Never edit live application files, restart production for routine investigation, or turn off auth. Build and validate a new version in Preview (with synthetic/test data for writes); verify the Git commit and production settings, then Publish to Live. Keep production OG_APP_URL=https://og.opervixgroup.com independent from Preview; never sync Preview secrets over this address. Preserve backward-compatible database changes so the previous release continues working. Do not alter financial records during deployment QA.

GoDaddy single-app hosting does not establish a zero-downtime SLA. Prove rolling/blue-green switching and rollback with the host before promising uninterrupted updates; otherwise schedule a short maintenance window. Server access is via authorized GoDaddy management/logs and deployment controls, not a public admin shell. For enterprise use, separate staging database, encrypted backups, alert delivery independent of client Microsoft connectivity, role-scoped support console and tested disaster recovery are required.
