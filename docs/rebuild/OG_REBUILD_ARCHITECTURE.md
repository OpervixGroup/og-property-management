# OG App reconstruction architecture and execution guide

Prepared October 4, 2026, America/Chicago. Owner: Miguel. Implementer: Codex. Status: verified baseline established on rebuild-backup-2026-10-04 from source commit 4d6d4a46444fa4039dae60fbf6b66265b04548f3.

This guide defines how to reconstruct OG from Miguel’s known working backup, complete one workflow at a time, and deliver a verified release for Miguel to publish on GoDaddy. It is a proposed architecture, not evidence that these features have been rebuilt. The backup is the baseline. Recent changes are reference material and must not be merged wholesale.

## 1. Recovery and baseline

Read this file, OG_REBUILD_STATUS.json, and OG_RESUME_PROMPT.txt at the start of every resumed session. Verify the actual source and GitHub state before editing. Never infer completion from this chat or a menu label.

Known repository: https://github.com/OpervixGroup/og-property-management

Latest verified recent-change commit at the time this guide was written: `60f51d61dad06642215c8f52ce60108f87613e08`. This is NOT the approved reconstruction baseline. The older commit visible in the user’s browser, `0287fca17aef6db8b7549e1d1353ea3ca27af4ca`, is also NOT confirmed as the backup.

Current reference source is in `work/og-build` in this chat’s workspace. It is a source directory, not a confirmed Git checkout. Previous phases passed local tests and builds, but the user reports many options do not work. Those checks do not establish production readiness.

First task: obtain the backup location or commit from Miguel. Preserve an untouched copy and record its SHA-256 or Git commit. Establish whether it includes source code, database data, private documents, configuration, or only a website export. A code backup alone does not restore operational records. Inventory existing production data separately before proposing restoration or migration. Do not replace a production database as part of restoring code.

Create an isolated reconstruction branch from the confirmed backup. Keep existing main intact. Record the chosen branch, baseline, actual commands and runtime in the status file. Read repository AGENTS.md and applicable skills. The current reference uses Next.js 16, React, TypeScript and Supabase; retain the backup’s working stack unless a specific defect justifies a change. Read the installed framework documentation before adapting its APIs.

## 2. Product rules

- Every visible action must complete an actual authorized workflow, persist its result, and show it after refresh and a new login.
- Build the domain logic and persistence first, then the screens. An AppFolio menu is a reference for flow; it is not a specification or proof of functionality.
- A disconnected feature must clearly state its status. Do not present a navigation link as a working integration.
- Roles, property access and organization membership are enforced on the server. Hiding a button is insufficient.
- Money uses integer cents, explicit rounding and deterministic remainder allocation. Unknown amounts are not zero. Financial records retain provenance and audit history.
- Saving, approving, posting and sending are separate actions where they have separate business consequences. Reports and dashboards never silently post financial transactions.
- Use confirmed IDs to link units, owners, tenants, leases and work orders. Names alone are insufficient for identity matching.
- Protect approved historical results. Correct them through a documented reversal or superseding version, not destructive editing.
- Collect only necessary information. Keep company records, tenant details, credentials and actual GL exports out of public source control.
- Keep the interface simple: clear names, consistent save/cancel behavior, useful error messages, and warnings before discarding unsaved changes.

## 3. Source code responsibilities

The following layout is a proposed destination. Map the backup’s files to these responsibilities before moving anything. Refactor incrementally while preserving working behavior.

```text
app/                         pages, navigation and server entry points
app/api/                     authenticated request handlers
components/                  reusable forms, tables, dialogs and print controls
lib/domain/                  pure rules for each business module
  properties/ people/ leasing/ maintenance/ calendar/
  accounting/ rental-pool/ reporting/
lib/application/             commands and queries coordinating domain rules
lib/server/                  authorization, repositories, transactions, secrets
lib/integrations/            QBO and Microsoft adapters behind interfaces
lib/printing/                report specifications and Letter PDF generation
supabase/migrations/         versioned schema and database permission changes
tests/                       domain, persistence, access and workflow tests
docs/rebuild/                this plan, status, decisions, evidence and releases
```

Request flow: screen → server handler → authenticated user and property checks → application command → domain validation → transaction → audit record → saved result → refreshed screen. Queries apply the same access scope and expose only fields the role may view. Integration callbacks use verified service identities and replay protection, not browser-user assumptions.

Each module defines typed inputs, records, allowed state transitions, validation failures, commands, queries and report fields. UI components must not own financial rules. Repositories isolate database details. Adapters isolate QBO and Microsoft behavior so simulated integration tests cannot be mistaken for live connectivity.

Use database transactions for related updates, foreign keys for relationships, unique references for duplicate prevention, and versions for concurrent-edit detection. Where the backup stores a whole workspace snapshot, first verify its locking, transaction and access guarantees; do not migrate it into new tables merely for stylistic consistency.

## 4. Core record relationships

| Record | Relationships and control |
|---|---|
| Organization and staff | Verified login identity, active membership, role, property assignments; auditable access changes |
| Property and unit | Stable IDs; unit numbers unique within their property; participation and occupancy are separate concepts |
| Person and organization contact | Tenant, owner, vendor or other role through explicit associations; preserve original imported source |
| Ownership | Owner and unit with effective dates; distribution grouping uses owner ID |
| Tenancy and lease | Tenant contacts, unit, start/end dates, rent agreement and lease status; retain prior tenancies |
| Work order | Property/unit, tenancy when relevant, issue, assignee/vendor, status, expenses, history and attachments |
| Calendar event | Property, dates/time zone, recurrence, optional linked work order/showing; cancel and trash are distinct states |
| Accounting record | Organization, period, GL account, transaction reference, amount, source and approval/posting state |
| Pool allocation and owner statement | Period, eligible units, versioned assumptions, exact allocations and approval/payment evidence |
| Integration message and audit | Stable external IDs, processing state, attempts and actor; avoid storing secrets in logs |

The previously used 95 participating units are a reconciliation reference, not a hard-coded truth. Confirm current total units, participating units, vacancies, retired units and private arrangements against the backup and source evidence. Unit 909 was requested vacant; verify effective date and actual status before reapplying it.

## 5. Workflow contracts

### Properties, People and Leasing

Create or identify a property/unit → associate the correct owner → create or match tenant contacts → create a tenancy and lease → verify occupancy → show the same information in unit, tenant and leasing views. Lease status, occupancy, pool participation and active-record status must have separate definitions. Prevent conflicting active tenancies according to the agreed policy.

Import tenant contacts and rent agreements through a preview showing matches, duplicate candidates, unmatched rows and source dates. Require review of ambiguous matches. Preserve original values and distinguish contract rent, posted charges and collected cash. QBO import never invents a lease or verified occupancy merely because a customer exists.

### Maintenance

Proposed flow: Draft → Open → Assigned → In Progress → Completed → Closed; Cancelled is a separate terminal state. Confirm exact statuses against the backup and Miguel’s operating process before implementation. Reopening requires a reason and audit entry.

Creation/updates persist before any notification is queued. Assignee, entry permission, tenant contact, scheduling, labor, materials, vendor costs and attachments have explicit validation. A save failure must not send an email. Printing reads the saved work order and includes a clear work-order ID, unit, issue, status, relevant contact/entry details and dates on US Letter pages.

Every opened/updated work order should queue the requested notification to `dla@devonshirecondos.com`. Confirm which changes warrant notifications and prevent retries from duplicating delivery. Microsoft 365 connection remains unactivated in the recent reference. Track queued, sent, failed and uncertain delivery separately. Replies update the ticket only after verified mailbox access, external message deduplication, ticket correlation and sender authorization. Unmatched or ambiguous replies go to staff review.

### Calendar

Create → edit → cancel or move to recoverable trash → restore. Delete Event appears at the bottom of the saved-event form. Define occurrence versus entire-series editing before enabling recurring deletion; explicitly label whichever scope is implemented. Preserve recurrence, time zone, links and prior status for restoration. A linked event change must not silently close or delete its work order. Permanent purge is outside this initial plan.

### Accounting and rental pool

Draft data/import → reconciliation → reviewed assumptions → calculated preview → approval → owner statement/distribution preparation → recorded payment evidence → period close. The first release does not initiate bank payments.

The requested management calculation is: tenant rent amount − rent pool − maintenance fee − management fee − pool electricity = DLA income total. Confirm the meaning, source and period basis of every term against the monthly checklist. HOA and repairs must be separately identified: agree whether they belong to owner distribution, DLA profitability, or both as separate attributed entries. Never deduct the same expense twice.

Separate contractual, accrued and cash views. Pool receipts are not automatically DLA revenue. Owner distributions are not automatically DLA operating expenses. Record allocation assumptions with their effective month and source. Reconcile distributions and profitability to the approved ledger and source checklist.

Vacant participating units retain the requested HOA, maintenance fee, management fee and pool electricity rules, with incurred repairs added when supported. Verify allocation bases and fee agreements first. Vacancy does not create fictional rent receipts. Confirm private-unit and owner-offset arrangements from evidence before preserving or changing their special rules.

Import QBO GL accounts using the correct Devonshire company, external account IDs, numbers, names, account types and active state. Preview mapping conflicts and protect historical references when an account is inactive. Decide which system owns postings and master data; do not enable bidirectional posting until that contract is agreed and tested.

### Reporting and dashboard

Every dashboard count and link uses the same scoped query and filters as its destination. Define reporting date, period, occupancy and verification rules. Provide vacant count, participating-unit count and verified/unverified lease counts without overlapping ambiguous labels.

Every report defines its source, filters, totals, role restrictions and printable columns. Screen, export and print reconcile to the same result. US Letter output must support long descriptions, page breaks, repeated headers and all selected rows. Printing cannot include hidden private fields or accidentally print only the current table page.

### Account and administration

Own profile and display preferences are separate from staff administration. Users cannot edit their own role or property scope through profile settings. Management and administrator powers need an explicit approved access matrix.

Microsoft 365 sign-in requires administrator configuration and real-account validation. Retain existing active OG membership and server-enforced scope; never grant a role based on email domain or editable identity metadata. Microsoft sign-in and Outlook mailbox processing use separately scoped connections. AppFolio settings labels are not a promise to implement every proprietary feature.

## 6. Execution phases and completion evidence

| Phase | Codex task | Required exit evidence |
|---|---|---|
| 0 Baseline | Preserve and inspect supplied backup; inventory code, data and hosting | Baseline hash/commit, working local startup, menu/action inventory, known defects and production-data preservation plan |
| 1 Logic | Define entity relationships, access matrix, workflows and accounting assumptions | Written decisions with Miguel’s unresolved questions clearly listed; agreed first-phase scope |
| 2 Foundation | Repair persistence, access boundaries, audit, errors and navigation | Role/property isolation tests; concurrent-save behavior; save/refresh/new-session verification |
| 3 Core records | Properties, People, Leasing and reviewed imports | Correct cross-page relationships, duplicate handling, occupancy and agreement/cash separation |
| 4 Maintenance and Calendar | End-to-end work orders, scheduling, print, cancel/delete/restore | Actual persisted workflow tests, recurrence scope, Letter sample inspection; email status truthful |
| 5 Accounting and Pool | GL mapping, ledger, assumptions, allocation, statements and profitability | Agreed checklist example reconciles in cents; approvals/history protected; vacancy rules verified |
| 6 Reporting and Dashboard | Complete report definitions, exports and connected counts | Totals reconcile; filtered print matches export; every dashboard link works |
| 7 Administration and integrations | Account settings, Microsoft sign-in, Outlook and QBO connections | Approved role matrix; real connection tests; denied-access tests; duplicate/retry handling |
| 8 Release | Full workflow acceptance, source push and GoDaddy release package | Exact release commit, tested artifact, hosting checklist, recovery instructions; Miguel publishes |

The phase order is proposed. A critical dependency may be moved earlier through a recorded decision. Do not label a phase complete because its screens render. At each phase, demonstrate results and update the status/decision files before beginning the next major scope.

## 7. Verification and release rules

Maintain an action inventory: page, option, expected result, role, persistence source, external dependency, current status and evidence. Statuses: verified working; implemented but unverified; disconnected; intentionally unavailable; defect. This inventory addresses the user’s reported broken options directly.

Use synthetic records for development. For each meaningful workflow test valid actions, invalid actions, unauthorized role/property access, duplicate submission, conflicting edit, refresh and a new session. Test financial arithmetic with evidence-backed examples and exact totals. Mock tests verify logic only; real connector tests are separately marked. Capture concise screenshots or sample PDFs where appearance matters.

Use the confirmed backup’s package manager and lockfile with reproducible installation. Current reference declares Node 22.x; recent local checks ran on Node 24. Before release, test with the runtime actually supported by the chosen hosting environment and record it. Run appropriate tests, type checking and production build. Never commit temporary preview routes, generated build folders, credentials or operational datasets.

Push phase commits to the reconstruction branch and verify their remote SHAs. Do not overwrite main with the old backup or force-push. Final promotion to the publication branch must be an explicit reviewed release decision. Preserve a code rollback reference and a separate data recovery plan; code rollback does not undo database changes.

## 8. GoDaddy publication handoff

Miguel publishes. Confirm the exact GoDaddy hosting product before selecting packaging. The current reference requires a Node server for authenticated API routes; a static website upload does not supply those server functions. If the available plan cannot run this application, document the supported hosting arrangement while keeping the intended GoDaddy domain. Do not claim compatibility before verifying it.

Provide the exact source commit, production artifact where applicable, build/start instructions verified for that environment, required configuration names without secret values, migration order, domain/callback requirements and rollback steps. Current reference uses `next build --webpack` and a Node start script; these are reference facts to recheck against the selected backup.

Keep backend secrets in private server configuration. Confirm Supabase project/workspace, HTTPS origin, authentication redirects, private document storage, any Microsoft provider setup, mailbox processing schedule and QBO connection. Secrets are never placed in frontend bundles or emailed into this plan.

Before publication: save production data and document backups; test additive migrations in a separate environment; inspect release changes and prepare recovery. After Miguel publishes: verify sign-in, role/property boundaries, create/update/read, dashboard links, calendar restore, Letter printing and connected integrations against the exact live version. Do not declare success from the GitHub commit alone.

## 9. Session checkpoint procedure

After each completed task, update OG_REBUILD_STATUS.json with actual baseline, branch, commit, phase, completed evidence, unresolved defects, changed files, and the next concrete action. Maintain a dated decision log explaining business choices. Once a reconstruction repository is established, place these sanitized planning files under `docs/rebuild/` and commit updates with each phase.

If interrupted mid-edit, record uncommitted files and tests not yet run. On resume, inspect existing changes before editing; never reset or discard them automatically. If an external write had an unknown outcome, read back its state before retrying. This checkpoint is the durable memory; do not rely on the chat being available.

Immediate next action: inventory baseline options and define the Phase 1 workflow contracts. All 179 source ZIP files match the verified baseline commit; use the status file for subsequent progress. No source reconstruction, database restoration or deployment has been performed by creating this guide.
