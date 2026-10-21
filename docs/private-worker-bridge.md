# Private draft-worker bridge

This candidate connects a separately installed private worker to the existing durable task coordinator. It does not install a model, schedule, credential, role task or client connector. Missing configuration denies execution.

`POST /api/platform/autonomy/private-worker` requires a dedicated server-side `OG_PRIVATE_WORKER_SECRET`. Use a cryptographically random base64url value of at least 43 characters, configure it through the hosting provider's protected secret controls, and keep the matching worker credential outside source control and model inputs. Do not reuse a CEO session, Supabase service key or workforce ingestion credential.

The JSON envelope is `{operation,input}`. Supported operations are readControls, selectEligible, recordClaimIntent, claim, checkpoint, ensureContext, finish and recordStopped. There is no enqueue, review, Audit, CEO-control or financial action endpoint. The fixed tenant is corporate; client tasks are rejected.

Tasks must use the exact `private-codex-draft-v1` handler, a registered role, a future deadline, bounded source text and its digest, an unchanged plan digest, current evidenced Legal/Risk reviews, the recorded standing authority and zero declared cost/protected effects. Source text is part of the reviewed plan. A declaration alone does not establish source truth: Operations must review source provenance before registration.

The worker identity is fixed. Prepared, Claimed or Stopped attempts block another task for that worker until reconciled; restart cannot bypass an uncertain attempt. Claims, contexts and outcomes use the existing compare-and-swap store and preserve the event history. No new table or public database grant is required.

The endpoint enforces current global/individual CEO pauses, epoch, lease and Monday–Friday 08:00 inclusive to 17:00 exclusive America/Chicago. It does not authorize customer activity. A pause cannot recall a request already sent; checkpoints fence subsequent work and acceptance. Failed or uncertain attempts require explicit reconciliation, not blind retry.

Successful model work stops at Awaiting audit. The returned worker receipt hashes the bounded submitted result. The coordinator's stored outcome additionally contains status, timestamp and lease token; the existing Audit workflow must hash that actual stored outcome. The worker cannot approve its own output or change CEO controls.

Legacy control-cycle handlers explicitly exclude private draft tasks. Before cutover, test the new endpoint in protected preview, missing/invalid bearer denial, real durable races, exact outcomes, pause during inference, expired leases and restart. Keep existing scheduling until a non-overlapping cutover is approved and verified. No cloud-runtime or full-business-autonomy claim follows from publishing this route.

Run `node --test tests/private-worker-http.mjs`, the existing autonomy suite, typecheck and the production build. Fixtures are synthetic and establish source behavior, not production acceptance or independent audit certification.
