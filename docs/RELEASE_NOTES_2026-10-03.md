# OG update — October 3, 2026

For Devonshire Leasing Agency Inc. App owner: Global Home Cyber Tech LLC DBA Opervix Group.

## Completed in this update

1. **Tenant receipts matched to charges.** Pending, Partially Paid and Paid are calculated from receipt/credit applications. Cash matched to Rent updates office actual-rent totals; owner reports exclude tenant rent.
2. **Unit-linked escrow.** Deposits/refunds, held balances, documented deduction review, support uploads and an escrow register PDF. Reviewed deductions may be classified as agency income; no automatic forfeiture, make-ready payment or fund transfer.
3. **Operating-income/payables review.** Confirmed management, maintenance and other agency charges appear separately from supplier/HOA expense/pass-through classifications. Returns appear as negative review lines. PDF/CSV downloads; amounts are charge-based, not proof of cash collection or supplier payment.
4. **Expected-rent allocation.** Verified monthly assumption total divided by current active units, or total verified per-unit expected rent divided by active units. Exact deterministic remainder cents, source snapshots and versions. Contract-specific fee rules and first-of-month ownership transfers are supported. A roster change requires new allocation review.
5. **Combined owner/month package and settlement.** Every current unit statement and supporting receipt for one owner/month, combined summary, one externally completed reference allocated across approved statements, separate cash and HOA offset. Unit 108’s uncovered HOA remains an owner bill.
6. **QBO review export.** GL/account-mapped CSV and receipt ZIP; only explicitly unpaid Expense rows enter a bills-import candidate. Prepared sources are duplicate-protected; saved bill/review rows are downloadable again. Nothing is uploaded or posted to QBO.
7. **Operational completion.** Inventory partial returns, remaining reversals, physical gains/losses, supplier returns, supplier invoice uploads, one-time automatic approved labor posting at Ready to bill, tenant/lease links and lease attachments.
8. **Bank boundary.** Bank balances/worksheet are removed from the accounting interface; prior data is preserved. QBO and outside reconciliation remain separate work.
9. **Help and source.** In-app workflow guidance updated. Refreshed source ZIP includes this report, setup instructions and tests.

## Tested

- 65 application-model, PDF and package checks passed.
- 5 SQLite persistence/concurrency/history checks passed, including combined cash and HOA amounts surviving a database restart.
- TypeScript passed. Production build checked during publication.
- Original Unit 1607 six-deduction example remains exactly **$430.78**. The later Unit 1315 HOA instruction changes the live example; it is not silently omitted to retain the original result.
- No real tenant/owner records were modified for testing. No emails, payment instructions or QBO entries were sent.

## Still needs configuration or real evidence

- The verified month's expected-rent source/amount, electricity total, individual contracts and real opening balances.
- Dustin's classification/recipient review, transition/reconciliation work outside OG, the original $171 difference and escrow deduction basis.
- Actual QBO company account names, supported import sample and an external trial import/matching review. Smart Receipts categorization is not connected.
- Microsoft application permissions and successful SharePoint/email testing. Original uploads persist in private demo storage; downloaded packages are not yet auto-archived to a SharePoint monthly library.
- Staff roles and owner/tenant portals. Current administrator access must remain private.
- Current browser end-to-end/live upload testing. Sites requires its browser-control capability for that test, and it is unavailable in this session; no substitute browser path was used.
- Production normalization, volume testing, mid-month ownership prorations and any approved transfer balance settlements.

This is a working pool-administration prototype, not a replacement for QBO or a production trust-account ledger.
