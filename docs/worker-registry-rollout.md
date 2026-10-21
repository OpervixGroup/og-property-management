# Worker authentication and role registry rollout

This source update aligns CEO role controls and the protected draft bridge with the existing 33-profile headquarters roster. Logical roles do not grant application credentials or client access. Every task still requires exact source, scope, reviews, lease, hours, pause checks and outcome audit.

The private runner must be upgraded with the matching 33-role registry and reviewed instruction file before use. The old 32-role runner will fail the exact-registry request; it must remain stopped rather than retry in a loop. Keep the prior runtime and configuration for review and rollback. No scheduler or cutover is installed by this source change.

GoDaddy's observed runtime-log UI displayed only the event name from structured JSON, hiding the authentication reason. The route now writes a bounded plain-text prefix and enum reason. The logger still suppresses repeated reasons per process and never prints credentials, hashes, lengths, headers or request bodies. Authentication remains unchanged. After CEO publication, perform one read-only request and inspect protected logs; do not treat a source test or internal self-test as external worker connectivity.

Acceptance requires clean tests/typecheck/build, authenticated readControls from the real worker, exact task claim and saved outcome, pause/epoch/lease/restart checks, outcome review and a separately approved non-overlapping scheduler cutover. Client connectors, financial writes and outbound permissions remain separate.
