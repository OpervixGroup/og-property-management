# Task coordinator integration candidate (inactive)

This module is a state-transition library, not an installed worker, scheduler, authentication system or autonomous business service. The candidate adds a backend RPC adapter, CEO-only control API/page and a reviewed-handler runner. It includes an unapplied SQL proposal. It adds no schedule, handler registration, secret, account or paid API usage. Publishing alone does not activate task execution.

The host must supply a durable SERIALIZABLE transaction adapter. Each transaction must read current controls and task state, commit atomically, roll back on exceptions and return only after durable commit. Never use an in-memory adapter in production. The tests use a synthetic serialized adapter and do not validate a database or cross-process deployment.

The host must authenticate the CEO independently of request text, validate CSRF/origin for control writes, enforce authorization for enqueue/review/claim/finish/audit, provide trusted role and standing-authority registries, and keep identity/permission decisions server-side. The review method stores supplied assessments; it does not authenticate reviewers or grant authority. Keep private plans, evidence, roles and client records outside this public repository.

New state starts globally paused. Individual and global changes increment an execution epoch. Workers must checkpoint before each unit of work and after remote reads, then stop on pause, changed epoch or lease expiry. A pause cannot recall an already issued request. Changing even another role's control conservatively invalidates existing leases. Expired attempts require reconciliation; they are never automatically requeued. Resume does not revive an invalidated attempt.

The library accepts only explicitly zero-cost corporate read-only review, development tests and internal drafts with all protected effects false and exact current Legal/Risk reviews. It does not execute handlers or prove these declarations truthful: reviewed allowlisted handlers and input validation are mandatory. Email, CRM, financial changes, client tasks and production changes are outside this executor's supported types. No arbitrary shell, URL, user code or task text execution is provided.

Successful evidence-backed work remains Awaiting audit until the exact plan, lease token and outcome digest pass a disclosed AI control assessment. This is not independent certification. Store-backed audit access restrictions and append-only history still need integration.

Before activation: implement and test the authenticated Headquarters controls and durable transactional adapter; bind existing approved handlers; test concurrent cloud processes, crash/restart, control propagation, failure reporting and source identity; persist one real authorized task result. Verify all of this on the actual deployed version before claiming cloud autonomy. Keep deployment and protected-action approvals in their existing workflows.

Run the bounded regression suite with `node tests/task-coordinator.mjs`.

## Deployment dependencies

The proposed SQL is docs/task-coordinator-storage-proposal.sql, not an applied migration. It creates one RLS-protected state row, read/CAS functions and explicit service_role permissions; anon/authenticated get no access. Apply only after exact schema/permission approval. No live schema was changed during preparation. The single-row compare-and-swap design favors bounded work; throughput/capacity is unmeasured and must not be represented as full-company scale.

The candidate route /api/platform/autonomy reuses verified platformOwner session checks and requires OG_CEO_AUTH_ID to match the server-verified owner auth ID. Missing mapping denies all control access. Populate that non-secret mapping only from the verified CEO registry; never accept a browser-supplied identity. OG_APP_URL must match the protected origin. Server keys stay on the backend. The page is /platform/autonomy; it does not claim worker readiness or change existing Headquarters visual controls.

Run node tests/task-coordinator.mjs, node tests/task-coordinator-store.mjs and node tests/task-coordinator-http.mjs. Synthetic tests are not cloud acceptance. The production worker integration and authenticated browser acceptance remain release requirements. All work stays paused initially. Removing invocation and revoking RPC execution stops new work; preserve existing state/history for reconciliation.


## Existing cloud-cycle integration

The /api/platform/autonomy/run POST endpoint uses the existing protected workforce ingestion credential. It accepts no arbitrary task payload. It selects at most one queued task with the registered og-headquarters-access-v1 handler and a technology/QA/security role. The coordinator still requires exact current reviews, zero declared cost, no protected effects and a permitted standing-authority reference. Paused or unsupported tasks do not execute.

The only implemented handler reads fixed public Headquarters/login availability and checks anonymous workforce-read denial. It does not read client records or perform sales, mail, accounting or access changes. Its result explicitly describes access checks, not business/client readiness. A successful task remains Awaiting audit. A failed, expired or control-invalidated attempt requires reconciliation and is never automatically replayed.

The existing hourly company control workflow calls this endpoint once after its control checks. No new schedule is added. Missing publication (404) is reported as pending release; other unconfirmed execution fails the job and requires reconciliation. Worker credentials and task payloads are never printed in the public job summary. Reuse of this backend credential for the new endpoint is part of the release scope; keep its value secret. Publishing does not create reviewed tasks or fill unconfigured departmental/client integrations.
