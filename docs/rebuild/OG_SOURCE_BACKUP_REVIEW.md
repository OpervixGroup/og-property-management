# OG source and data backup review

Reviewed October 4, 2026. The supplied source is `OG-26.9.3-GoDaddy-Source.zip` (179 archive entries). The matching workspace archive is `OG_Workspace_Backup_2026-10-04.zip` (two entries). Originals were read without modification and extracted into separate local working directories.

## Baseline identity

- Source ZIP SHA-256: `77a8a7a803b9326f70ddc925199eb6d66be9c9b01f904dd93cd935d5cc15054a`.
- Data ZIP SHA-256: `e36898f3664bdf9086623781bbbed03289947a98abc21f85328cf8b01d63e0ec`.
- Data records SHA-256: `11841d034320acda25283dd5c6db2ff479bcfb988d209973c0c855c780191ee7`; matches both the archive manifest and the earlier extracted data folder.
- Version: 26.9.3; declared runtime Node 22.x. Source and workspace backups are from before the recent changes. Source ZIP filesystem timestamp is October 3, 2026 at 8:32 PM; workspace manifest creation time is October 3 at 9:27 PM America/Chicago. Filesystem timestamps alone are not a Git revision.

## Saved workspace

The actual data contains one property, 97 units (95 participating), 35 owners, 97 ownership associations, 97 Pending statements, one period and six financial audit entries. No duplicate unit IDs, missing referenced unit owners or statements pointing to nonexistent units were found. This is a basic relationship check, not reconciliation to QBO.

The snapshot does not contain an operations collection with saved tenants, leases, work orders or calendar events. Those newer operational records must not be assumed present. Authentication accounts, server configuration and document binaries are also absent. Restoring this snapshot over current production would risk losing later records; no production restore has been performed.

## Checks completed

The source archive’s own verifier accepts the data ZIP checksum, revision and required records. The actual saved data passes the baseline domain validator without modification. Core application tests pass 79 checks; access policy tests pass 22 assertions. Staff-directory tests and local database tests pass.

The first core test run encountered a Linux `/tmp` output path on Windows. A separate local test runner changed only the output destination; original archive and source test remain unchanged. Test-only PDF output is synthetic. Dependencies were reused locally from the existing installation with matching declared versions, so this is not evidence of a fresh lockfile installation. Checks run on local Node 24; Node 22/hosting validation is still required.

## Publication gate

Local compilation, production build and HTTP checks are recorded separately when finished. Simulated provider tests cannot establish a working live Supabase account. No production code rollback, database replacement, GitHub main update or GoDaddy deployment has been performed in this review.

Before publication, verify the hosting runtime, active OG workspace and schema, live sign-in/membership, saved-data access, document availability and an isolated recovery drill. Confirm whether the desired release is source rollback while retaining current data, or a separate preview of the historical snapshot. Keep historical data testing separate from the live database.

## Final local review result

Production build and TypeScript passed. Local HTTP integration tests passed with a simulated Supabase provider; a Windows-only runner used a file URL for the test preload. Actual historical records rendered in a temporary read-only localhost preview. All three overridden preview files were restored afterward and the preview server stopped. No temporary preview code is a release artifact.

GoDaddy project z64hid4a52 shows Node 22, main branch and preview commit 60f51d6. Current authenticated preview loads records from Supabase. Historical and current financial settings differ. Those snapshots are not identical. Preserve current production records during any source rollback. Publication status remains NOT READY pending release preparation and compatibility checks.
