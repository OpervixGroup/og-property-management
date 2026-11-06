# Company Headquarters

Super Admin navigation links to `/platform/headquarters`. Both the page and its read-only `/api/platform/workforce` endpoint use the existing `platformOwner()` check; company administrators are not granted platform access.

The endpoint reads an optional trusted JSON snapshot from `OG_WORKFORCE_STATE_FILE`. Keep that file outside the repository and public web root. A protected, separately authorized executor must write it atomically. No executor, scheduler, connector credential, database permission or hosting configuration is provisioned by this change. Missing configuration shows disconnected; errors fail closed. No browser endpoint accepts writes or arbitrary file paths.

Snapshot contract: `{updatedAt: ISO timestamp, runs: [{id, office, role, task, status, result, startedAt, finishedAt}]}`. Status is Working, Completed, Blocked or Failed. Keep secrets and raw client records out. Only explicit display fields are returned, never arbitrary snapshot properties. Maximum input size is 2 MB; at most the latest 300 records are shown. Requests are authenticated and marked private/no-store.

Polling occurs every ten seconds. Movement is decorative and enabled only while recent data records a Working task. Updates older than ten minutes suppress movement and show stale history; this threshold is a display safeguard, not proof a task has stopped. Pausing movement and system reduced-motion preferences are supported. Task history is not a financial progress metric. Live progress, CEO approvals, client provisioning and continuous execution require separate verified integrations; this view does not perform those actions.

Deployment acceptance: verify anonymous and company-admin denial, authorized platform-owner rendering, missing/malformed/stale feeds, real executor snapshot delivery, reduced motion, and an actual worker run independent of a user's computer before calling this a cloud workforce. Review and approve the release before production deployment.
