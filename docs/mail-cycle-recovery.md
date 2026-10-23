# Recovery of an expired corporate cycle with no registered effects

This is a release candidate. Synthetic tests do not prove the current server is recovered, and the change does not connect Claude or activate client learning.

The controller creates `cycle.lock` before it claims a backend mail cycle. On an error it preserves the file lock and attempts to mark the backend cycle Uncertain. A later cycle can therefore be blocked by both the stale local lock and the unresolved backend cycle. Removing only the file lock does not reconcile the backend.

The CEO-only `/platform/autonomy/mail-recovery` page reads current cycle metadata without exposing cycle tokens, source bodies or worker credentials. Its POST uses the existing verified CEO session, fixed same-origin check and durable coordinator compare-and-swap adapter. The worker-token endpoint has no recovery operation. No schema, permission or credential is added.

Recovery requires corporate execution paused, the exact expired original cycle/run, a current state digest, a CEO assertion that the original host process has stopped, and a written evidence reference. It rejects any registered mail case, private task or worker intent, including completed or uncertain effects. This deliberately supports only the initial no-effects failure; it is not a general task or delivery recovery tool.

An append-only no-effects reconciliation receipt is added. Original cycle status, lease, token, failure evidence and pending inbox source remain intact. Future claims recognize only a receipt matching the unchanged original cycle. They do not report the failed cycle as Completed and do not repeat it in the same half-hour window. Unreconciled or changed cycles continue to block execution.

## Controlled release and live acceptance

1. Review and merge the tested PR into the existing connected branch. Stage the exact SHA in GoDaddy Preview and verify CEO authentication, unauthorized denial, origin denial and the recovery UI. Miguel retains final Publish to Live. No live release or database write is performed by this source change.
2. Pause corporate execution using existing controls. Read the original host PID/start-ticks and process absence, original controller journal, exact pending inbox source and authoritative coordinator cycle. Preserve private backups and hashes of activation, ledger, lock, journal and installed code. Recheck installed model review acceptance and synthetic controller tests; recovery does not repair an unknown underlying model or source error.
3. Open the recovery page on the published exact SHA. Read current records. Stop if there is a case, task, intent, active lease, changed snapshot or mismatch with the original attempt. Record actual process-stop and no-effects evidence. Submit the exact cycle once. If the response is uncertain, read back the receipt before retrying; do not repeat or edit coordinator state directly.
4. Verify the persisted receipt matches the unchanged original cycle and current coordinator state. Only then prepare a reviewed host recovery command that rechecks corporate pause, exact lock bytes/run/PID/start-ticks, process absence and the matching backend receipt. Preserve an immutable private backup; archive the exact stale lock without clearing the ledger, resetting the pending source, altering ownership or discarding uncertain effects. No generic `rm cycle.lock`, forced Completed state or automatic retry is included in this candidate.
5. Resume only already approved work through the single existing DigitalOcean owner and timer. Verify one bounded attempt and real provider/storage receipts. Any failure remains held for evidence-based recovery. Both desks require actual learning save/readback acceptance during permitted hours. The separate dual-provider workstation bridge in PR34 remains unfinished and must not be represented as connected.

## Validation

Run `node tests/mail-cycle-recovery.mjs`, `node tests/mail-cycle-recovery-http.mjs`, the existing mail/coordinator suites, typecheck and production build. Fixtures are synthetic. Tests cover CEO authorization, source/intent refusal, expired lease and pause, changed-state rejection, immutable original history, readback after uncertain response, invalidated receipts and overlapping claims.
