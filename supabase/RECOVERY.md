# OG standalone cutover and recovery

## Current boundary
Financial records already use Supabase. The old host still holds the encrypted connection configuration, document metadata and server logs. The standalone app reads the same financial workspace using OG_WORKSPACE_ID and moves metadata/files to Supabase. Both sites must not be used as separate books. Never switch to an older financial snapshot after new writes without reconciling them.

## Before cutover
1. Save all changes in current OG. Stop edits and uploads in all sessions.
2. Download a fresh workspace backup; store two encrypted/protected copies outside the hosting account. Verify checksums and record contents with scripts/verify-backup.mjs and migrate-documents.mjs (dry run).
3. Keep the source commit/ZIP and hosting configuration separately. Secrets must be retained in an approved password manager, never in the source archive.
4. Review and apply standalone SQL. Run document copy with --apply, then verify-standalone.mjs. Check every file and linked receipt, not only counts.
5. Preserve/export original server logs separately; the workspace ZIP excludes those server-only logs. Original financial audit events stay in the migrated revision payloads.
6. Set up the Global Admin in the preview. Test actual login, temporary password change, role/property restrictions and disabled-account blocking. Record the actual test results.
7. Perform the isolated recovery drill below. Only then choose a production cutover time and hosting plan. Preserve the old site read-only until reconciliation and recovery are complete.

## Routine backups
- Download a current workspace ZIP after each completed accounting day and before major imports/changes. Retain 30 daily and 12 month-end copies in two protected locations.
- The ZIP includes the current record payload with statement versions and financial audit events, supporting bytes and hashes. It excludes old database revision rows, Auth accounts, server logs and secrets.
- Obtain a separate protected Postgres/Supabase Auth database backup plus storage backup. A database dump does not include Storage object bytes. Use official Supabase database export instructions and configured access; do not assume Free includes automatic full backups.
- Retain user memberships (og_app_users), metadata (og_app_documents), logs (og_app_logs), financial workspaces/revisions and authentication records for a full recovery. Do not rely only on the GitHub source repository.
- No automated backup schedule or email delivery is enabled by this build.

## Isolated recovery drill (pending real environment)
1. Choose a separate Supabase test project and private test hosting preview. Never run the drill over live financial rows.
2. Restore protected financial revisions, memberships/logs and document metadata from database backup. Restore files into a private bucket and verify hashes. Re-establish Auth accounts using supported Supabase recovery, preserving auth IDs where restored from database; do not silently assign existing memberships to new unrelated IDs.
3. Point the test preview to the restored project using separate server secrets and the original workspace ID. Check current revision and full record contents against the saved backup, not only unit totals.
4. Download an owner PDF and support package; verify month/unit/owner and actual rent privacy. Check labor and materials receipts independently.
5. Verify Global Admin, Management, both read-only roles, Clerk and Maintenance scopes. Disable a user and verify a still-existing token cannot access records. Record failure/success, source backup date, hashes, restored revision and elapsed time.
6. Keep recovery test records separate and document any missing Auth or log history. A successful local SQL/mock-provider test is not a completed disaster-recovery drill.

## Rollback after cutover
First stop all writes. Capture a fresh standalone backup and a protected database/storage backup. Compare current Supabase revision and documents with the old host. Financial records use the same workspace, so keep the current Supabase revision; do not replace it with the old D1 demo snapshot. Documents uploaded after cutover have no old-host metadata unless separately reconciled. Restore a previous application source version only if it can still read the current schema and objects. If it cannot, keep access read-only and repair the adapter. Preserve audit/log history throughout; never delete failed events to make a reconciliation appear clean.
