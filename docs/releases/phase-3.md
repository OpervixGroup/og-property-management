# Phase 3 — monthly pool and accounting controls

Adds a reviewed monthly calculation in Accounting > Pool allocation & contracts, and a versioned Chart of Accounts directory in Accounting > QBO exports. The shared monthly rent roll remains the tenant-rent source.

Collected-rent calculations use cash receipts explicitly applied to rent charges, rather than forecast amounts or manual office rent. All active participating units share the income, including verified vacant units. The equal-share method follows the latest agreed instruction. A separate reviewed type-weight method requires positive weights, agreement/source and reviewer; $929/$1,144 are not defaults. Both rent and CPS allocations conserve exact cents using deterministic remainders.

CPS source bills must identify verified vacant units and unique invoice references. Market exclusions affect shared electricity bills and its denominator, while rental participation remains independent. A reviewed zero is explicit. Source snapshots, weights, cash/expected-rent observations, shares, reviewer and versions persist without overwriting history. New cash or roster/source changes flag a saved calculation for review. Forecast or stale calculations cannot newly approve distributions or certify month close. These controls do not establish bank funding for checks.

Private DLA review measures management and recurring maintenance fees supported by an effective fee agreement and classified to active income accounts in the reviewed QBO chart. The $10,000 minimum is before operating expenses, has no ceiling and flags shortfall without generating a surcharge. HOA, CPS, owner income and security-deposit liabilities are excluded. DLA review/chart data are absent from scoped Analyst and Maintenance responses and owner-statement exports.

The normalized chart CSV preserves company, original source text, source hash, full account names, numbers, types, active state and genuine API IDs only when supplied. The trusted save handler verifies the uploaded source hash. Mapping histories retain effective months, sources and reviewers. DLA income roles reject expense accounts; owner deductions require expense accounts. Owner-pool operating, owner escrow and DLA operating roles cannot share a bank identity. New classifications and bill export preparation require an exact active account from the latest reviewed chart. Historical records and already prepared batches remain preserved.

Fee contracts support a reviewed unit-specific fixed or percentage management fee, monthly maintenance and HOA. Original signed agreements and exception data require review before real use. Unit 1315 remains outside the pool and its HOA-through-1607 treatment is preserved. Unpaid rent, opening balances, escrow and bank balances are never reset to force a zero result.

## Release boundaries

No live tenant import, QBO posting, payment, bank creation or mailbox activation is included. No database migration or additional environment variable is required. Reuse existing Node 22, private Supabase configuration and workspace. Do not restore a data backup or deploy test providers when publishing.

The CPA reference PDF is a printed example, not the underlying formulas. The optional weighted method reproduces the example when those weights and total are explicitly supplied; it does not certify the original CPA policy. Obtain the actual agreement/formulas before selecting weights in a real month. Confirm unit 2404 HOA and unit 108 treatment against source documents; no new exception is invented.

The live DLA Chart of Accounts was reviewed separately. Its source evidence and normalized company CSV stay in the private restart package, not the repository. No native chart export download or QBO internal account IDs are claimed from that read-only review.

## Validation

Production build and TypeScript; 79 core regression checks; 34 access assertions; 20 foundation scenarios; 26 tenancy/import scenarios; 31 Phase 3 calculation/GL scenarios; actual production HTTP handlers with a disposable provider; browser persistence, input review and downloads. See the private QA handoff for final evidence. Financial integrations remain explicitly unactivated.
