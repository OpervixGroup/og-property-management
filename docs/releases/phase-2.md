# Phase 2 tenant and leasing workflow

Connects Properties, People, Leasing and Accounting to one monthly rent roll. Expected rent uses effective lease or tenant agreement terms; verified vacancy is separate from pool membership. Unknown, conflicting and partial-month sources require review. Signed active leases and verified rent are preserved; renewals create separate records.

Adds authenticated downloads of saved rent rolls, contact directories and normalization templates, plus a reviewed tenant CSV import and directory export with stable unit and tenant identifiers, source rows, SHA-256 provenance and before/after evidence. The OG normalization template is distinct from QuickBooks Customer Contact List, which supplies contact columns but does not establish current tenancy dates or agreement rent. Selected import rows create no invoices, receipts, allocations or occupancy changes. Existing QBO Payment CSV receipt matching retains raw source amounts and explicit charge applications. Property names disambiguate tenant choices; nonpayment rows remain excluded and counted.

Analyst / Agent can enter and edit tenant contacts for assigned units through the trusted scoped endpoint. Opening balances and posted ledger entries remain protected; cross-property writes are rejected. Invalid currency blocks saving; dates commit on blur; active lease terms are visibly locked.

Validation: production build and TypeScript; 79 core regression checks, 30 access assertions, 20 foundation scenarios and 24 new tenancy/import scenarios; standalone SQL; actual HTTP routes with a disposable provider including scope, replay, conflict, opening-balance tampering and verified-rent safeguards; browser contact import, shared views, lease/renewal and Analyst contact workflows. No production financial records or QBO transactions were changed.

No database migration or new environment variable is required for this phase. Publish GitHub main through the existing GoDaddy project with Node 22, npm run build and npm start. Keep the existing Supabase workspace and hosting configuration. Never deploy the test mock provider or run standalone setup against the existing database. The prior Phase 1 commit is the rollback checkpoint. Exact CPA pool allocation/GL mapping, full owner close, remaining module work and live Microsoft 365/QBO integration retain their later phase gates.


## Handwritten contact requirements — October 4

Adds separate owner city/state/ZIP fields, structured second vehicle make/year/plate, assigned-unit Analyst vehicle entry and explicit Tenants/Owners/Other communication groups. Older drafts remain Unclassified. Owner profiles show mailing components, phone, payment preference and special instructions. Existing tax handling remains last four digits plus protected-record reference; full Tax IDs and payment execution are not configured. Communications remain drafts until the later Microsoft 365 activation phase.

Production build/TypeScript, 79 core checks, 30 access assertions, 26 tenancy/import scenarios and actual HTTP integration passed. Disposable browser tests verified owner address persistence, second vehicle profile saving and tenant-draft separation from owners with zero console errors. No production contacts, financial records or outgoing messages were changed.
