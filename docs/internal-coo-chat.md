# Internal CEO–COO conversation release candidate

The previous screen downloaded a draft. This change adds a founder-only inbox in existing private workforce storage, with optional replies from an Opervix-managed Ollama-compatible service. No OpenAI client, external AI fallback, attachment processing, customer lookup, email delivery, or task-execution tools are included.

## What is available in the code

- Existing authenticated founder identity, active session, password-change gate, same-origin POSTs, ten requests per minute and immutable message IDs.
- Saved questions remain visible after reload. Identical retries cannot create a second model request; changing text under an existing ID is rejected.
- Private messages are excluded from the general workforce feed; ingestion rejects their reserved ID prefix. Existing RLS denies browser table access. Only the service-side founder route reads this inbox.
- Optional model calls contain the current question and up to eleven recent conversation messages, plus fixed advisory instructions. A conservative 6,000-byte cumulative context budget prunes older messages while preserving the instructions and current question; an oversized current question is saved but inference is declined. The selected model's tokenizer and framing must be verified in staging against its 8,192-token context and output reserve. There is no automatic customer-record lookup, attachment processing or workfeed export. Free text may still contain confidential information: users should not paste credentials, client documents or confidential customer details. Responses are bounded, complete text only, and saved with an explicit AI label. No model output is executed.
- Disabled or invalid configuration saves the question with no automatic dispatch. Failure saves an explicit unavailable receipt when possible. An interrupted request may leave only a saved question. After 60 seconds without a saved reply, the display says no reply is verified and review is required; this is a derived warning, not proof that the backend terminated. It is never automatically rerun. The CEO can explicitly prepare and send a separate attempt. Replies link to the original request ID in storage.
- A configured endpoint is not a health check. Only a completed, stored reply proves that attempt worked. Historical pending questions are not automatically dispatched after enabling inference.

## Required deployment work

No working internal AI endpoint was verified in the available repository or local machine. No server, model, network route, production secrets or deployment was changed. The included Compose file is an untested deployment template, not evidence of a running service.

1. Identify an existing Opervix-managed always-on host, its operator, RAM/GPU/disk capacity and private route from the app host. A CEO laptop cannot supply replies while powered off. Do not buy hosting or models without the CEO's approval.
2. Select and review a local model's license, model digest, quality and resource needs. Prepare a reviewed Ollama container image pinned by digest and preloaded model directory. No cloud model identifiers are permitted. The template performs no downloads and denies model-container Internet egress. Resource limits are placeholders requiring measurement, not capacity claims.
3. Stage `deploy/internal-coo/compose.yaml` in a nonproduction environment. Set its two required variables, validate with `docker compose config`, and test boot and model loading. This template has not been run here because no Docker host or reviewed model is available. Verify actual host firewall/egress rules and network isolation; an environment declaration alone does not prove privacy.
4. On the same host, use a loopback inference URL. For a separate private host, supply an HTTPS gateway at an RFC1918 IP with a trusted TLS certificate and a bearer token of at least 32 characters. The gateway must authenticate the token, restrict access to the app host and forward only to local inference. Never expose Ollama publicly. This connector intentionally rejects public names/addresses, credentials in URLs, arbitrary paths and redirects.
5. In private server settings set `OG_INTERNAL_COO_URL` (origin only), `OG_INTERNAL_COO_MODEL` (reviewed installed local model), and `OG_INTERNAL_COO_TOKEN` for a remote gateway. Set `OG_INTERNAL_COO_ISOLATED=true` only after verifying cloud inference is disabled, no prompt logging, no external egress, private backups and authorized storage access. Keep `OG_INTERNAL_COO_ENABLED=false` until synthetic staging checks pass.
6. Verify GoDaddy can privately reach that gateway and supports a request lasting up to 45 seconds. This is not established. If it cannot, keep inference disabled and plan moving the app to an approved private host; do not expose the model on a public URL as a shortcut.
7. Test founder/nonfounder access, cross-origin rejection, save/reload, repeated requests, model offline/timeout, complete replies and no external inference traffic. Enable in staging only, then request the CEO's publication decision. Miguel performs GoDaddy publication.

For latency, `OG_INTERNAL_COO_KEEP_ALIVE_SECONDS` defaults to zero (unload after each reply). After measuring the host's memory and agreeing retention limits, an operator can set a bounded warm period of 0–300 seconds. Verify cold and warm responses fit the 45-second application timeout. No capacity or latency claim is made before that test.

The existing `supabase/workforce-cloud.sql` tables must already exist with their stated RLS/grants. This release adds no schema migration. “Internal only” means existing Opervix-controlled app/storage plus a private model host; it does not mean records leave the existing hosted Supabase database.

## Operations and rollback

Monitor request failures, duration, resource use and unanswered questions without logging message text. No model-host monitoring service is provisioned by this patch. Do not treat a reply as Legal/Risk approval, completed work, or client-onboarding readiness. Turn `OG_INTERNAL_COO_ENABLED=false` to stop new inference calls while retaining the inbox. Restore the preceding application release if the inbox itself fails; preserve stored messages. No automatic task dispatch or replay is implemented.

## References

- Ollama chat API: https://docs.ollama.com/api/chat
- Ollama container setup: https://docs.ollama.com/docker
- Ollama local/cloud controls: https://docs.ollama.com/faq

Local tests use synthetic storage and synthetic model responses only. A real private-model acceptance test and production publication remain pending.
