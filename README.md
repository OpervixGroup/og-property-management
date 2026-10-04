# OG — GoDaddy standalone migration build

Internal property management and rental-pool administration for Devonshire Leasing Agency, Inc. App owner: Global Home Cyber Tech LLC DBA Opervix Group. Version 26.9.3.

**Phases 1–5 have been published by Miguel. Phase 6 is an intermediate integration checkpoint. Microsoft sign-in and work-order email are disabled until administrator setup and live verification; direct QBO API exchange is still pending. Read `docs/phase6-connections.md` before enabling providers.**

## What this build changes

- Standard Next.js on Node 22, with `npm run build` and `npm start` listening on the hosting `PORT`.
- Supabase email/password login, no public registration, one-time protected Global Admin setup.
- Initial admin: Miguel Martinez, mmartinez@devonshirecondos.com, +12105761708. SMS is deferred.
- User creation and temporary passwords; users must change temporary passwords before they can access records.
- Global Admin and Management create/manage users. Only Global Admin can grant or manage Global Admin roles. Self-demotion/disable is prohibited. Accounts are disabled instead of deleted.
- CPA and Accountant view all records and print/download reports; no financial writes, document uploads or user management.
- Accounting Clerk works only within assigned properties: charges, receipts, receipt matching, draft unit expenses and receipts. No approvals, Paid status, allocations or user administration.
- Maintenance works only within assigned properties: work orders, entry permissions, pets and key information; parts catalog contains unit charge prices, not supplier bulk costs. **Inventory issues, returns and purchasing remain Management tasks in this standalone release.**
- Server-side membership checks on every protected request. Roles are not read from user-editable JWT metadata. Disabling an account blocks its next request even if its authentication token has not expired. Password resets revoke OG session records, so previous tokens cannot regain access after the password change.
- Private Supabase document metadata and files; Global Admin logs with no app delete/update capability. Financial audit history stays in the existing immutable record revisions.

All existing management-level pool calculations, statement versions, CSV import/export, QBO report parsing, inventory workflows and PDF packages remain in the application. Tenant rent stays office-only in owner PDFs. No ACH/check initiation or QBO writes. Password-reset emails, SMS, owner portal access and Microsoft email/SharePoint integration are **not connected**.

## 1. Repository and preview

Create a **private** repository named `og-property-management` under OpervixGroup. Put this directory's contents at the repository root, including `package.json`, `package-lock.json`, app, lib, components, public, scripts, tests and supabase. Do not upload node_modules, .next, a financial workspace backup or actual .env files.

GoDaddy → Connect GitHub → select only this repository → main branch → create a private preview. GoDaddy must be allowed to access the selected private repository. The current GitHub connection to GoDaddy does not grant this coding session GitHub access.

GoDaddy installs runtime dependencies only. TypeScript and Tailwind build dependencies are therefore in `dependencies`. The source contains no server API key, passwords, financial backup, or client financial dataset. The seed roster is a renamed demo fixture used only by tests; production never seeds missing records.

## 2. Private server configuration

Set the variables shown in `.env.example` in **GoDaddy preview secrets**. Get the current secret key privately from Supabase; never paste it into chat or commit it.

- `NEXT_PUBLIC_SUPABASE_URL`: https://conganplywqzmuktmyxd.supabase.co
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: publishable key, not the server secret.
- `SUPABASE_SERVER_KEY`: current unrevealed secret key.
- `OG_WORKSPACE_ID`: **userId from the latest workspace backup manifest**, not the Supabase project ID, email, or Auth user ID. This binds every staff user to the existing shared financial workspace.
- `OG_APP_URL`: exact private preview origin, e.g. https://your-preview-host. Change to https://og.opervixgroup.com when the domain is verified. Financial write requests reject any other Origin.
- `OG_BOOTSTRAP_TOKEN`: a random private token of at least 32 characters, chosen outside chat, used once to set up Miguel's account. Remove it from hosting secrets after account setup.
- `NEXT_TELEMETRY_DISABLED=1`

Never reuse the Supabase key previously pasted into the conversation. Rotate any exposed key first.

## 3. Supabase preparation

Take a fresh workspace backup from the **current** OG application. Freeze edits and document uploads during transfer and verification. Confirm records still use Supabase and retain the old site for recovery.

Review and execute `supabase/standalone-setup.sql` in this project's SQL Editor. It requires the existing `og_private.workspaces`, `og_private.revisions`, `og_load_records` and `og_save_records`. Do **not** re-run `staging-schema.sql` against the already migrated project. The setup script adds the standalone user, session, document, log and rate-limit tables. It has no anonymous/authenticated table or RPC grants. Financial record payloads are unchanged.

Run locally in the source directory with Node 22 and a private `.env.local`:

```sh
npm ci
node --env-file=.env.local scripts/migrate-documents.mjs /absolute/path/OG_Backup.zip
node --env-file=.env.local scripts/migrate-documents.mjs /absolute/path/OG_Backup.zip --apply
node --env-file=.env.local scripts/verify-standalone.mjs
```

First command verifies checksums and exact current record contents/revision without writes. `--apply` copies missing files into the private Supabase bucket and inserts document metadata while retaining IDs and expense links. Existing files must match hashes; they are never overwritten. Re-running is safe after an interrupted copy. Original files and records remain intact. Even an empty backup needs the apply step to create/verify the private bucket. The read-only verifier checks record access, private tables and RPC denial to anonymous users.

Inspect original system logs separately before cutover. The current backup preserves **financial audit events**, but does not export the old site's server-only system log table. Keep the original site's Global Admin logs available read-only until those have been securely exported. New standalone logs start with account setup. Do not claim the old server logs have been migrated.

## 4. Set up Miguel, then staff

Open the private preview. The initial login page allows setup only while there are no memberships for this workspace. Enter the private setup token and choose Miguel's password directly in the form (minimum 12 characters). This creates a Supabase Auth account plus server-managed Global Admin membership. It does not send an email or SMS and does not claim email/phone verification by message. If this email already exists in Supabase Auth, setup rejects instead of taking over the account; resolve that conflict with the account owner before proceeding.

After setup, remove the bootstrap token. Sign in again. Open account menu → General settings → Users & access → Create user. Give the new user a temporary password through an approved private channel. The user must change it before accessing records. Use Edit access to disable/change a role. Use Reset password to issue a new temporary password. Change your own password from the account menu. Email delivery is intentionally not configured.

Global Admin and Management retain the full existing application. Clerk and Maintenance receive smaller scoped workspaces. These do not yet duplicate every management screen; see the limitations above.

## 5. Before publishing / DNS

The private preview must pass actual Supabase login and role tests, a receipt upload/download/package test, and a verified backup recovery drill. Review Supabase security advisors and Postgres access grants after applying SQL. Confirm all latest records and supporting files match the current OG workspace. No seed or default opening balance should replace real records.

After testing, connect **og.opervixgroup.com** in GoDaddy; preserve the existing main Airo website and Microsoft email/DNS records. Update OG_APP_URL to the custom domain. Publish only with the plan/price approved. Then add an Airo **Client Login** button pointing to that domain. No domain, DNS record, purchase, email, bank instruction or public deployment has been changed by this build.

## Verification

```sh
npm run typecheck
npm test
node tests/staff-users.mjs
node tests/standalone-sql.mjs
npm run build
node tests/http-auth.mjs
```

SQL tests use local PGlite, not the live Supabase project. HTTP tests use a local mock identity/data provider and run against the production Next server. These confirm code paths and permission boundaries but do not replace real provider or hosting tests. `npm start` supports an assigned PORT. `supabase/RECOVERY.md` describes cutover and recovery.
