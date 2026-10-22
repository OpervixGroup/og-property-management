# Client procedure learning

This package extends the existing cloud controller. It does not install a timer or activate client work by itself.

The existing controller must import `runClientLearning` from this directory and call it only after a terminal corporate result, while retaining its existing `cycle.lock`. Pass the original cycle start time, existing activation configuration, guarded native app adapter, raw authenticated headquarters request function and cancellation signal. Save its minimal result separately as `last-client-learning.json`. Do not pass the corporate API wrapper: it adds a corporate tenant field that the client-learning schema deliberately rejects.

Deployment requires the matching protected headquarters endpoint, exact private client registry, verified calendars and existing host timer. Install the files into `deploy/client-learning/` and `lib/client-learning.mjs` in the existing runtime, update the package manifest with actual SHA256 values, verify it as the node user, and preserve backups and every unresolved attempt. Keep `clientLearningEnabled` false until those checks pass. No scheduler or lock may be reset to obtain a passing test.

Client excerpts are processed only by the existing authorized Codex Pro account. Legal, Risk and Audit are explicitly same-executor AI assessments. They do not constitute legal certification or human approval. Proposed lessons remain in their respective client folders and cannot authorize a business transaction or a procedure change.

Real client review runs obey the verified weekday service window and holiday calendar. After-hours synthetic acceptance does not establish a successful client review. Missing source, pause state, model review, save receipt or readback holds the attempt. Uncertain saves retain immutable intent and permit read-only reconciliation; recovery never uploads another copy.
