# Copy/paste prompt for Cloud AI: Review the Maamara Market fulfilment implementation

Repository: `SakaKrib/Maa-Mara-Market`
Branch: `ui-redesign-foundation`
Do not create a new branch. Do not touch production GitLab.

Please conduct an evidence-based review of the order fulfilment and shipment tracking work just added. Read `docs/ORDER_SHIPMENT_TRACKING_IMPLEMENTATION_LOG.md` first.

## Goals to verify
1. Vendor item-level progression: PAID → PROCESSING → PACKING → READY_TO_SHIP, with each step persistently recorded and permission-checked.
2. Dispatch inspection is staff/admin-only; failed inspections hold the item, passed inspections permit shipment recording.
3. The carrier-issued tracking number, selected carrier, handover time, current status, and historical tracking events persist after reload.
4. DHL/FedEx status synchronization uses the actual documented API endpoints and response formats, and only advances status when a trusted carrier event confirms it.
5. Customer and vendor tracking pages show the same stored shipment progress and event timestamps.
6. Customers can confirm their own item or report an issue; guest-order authorization is secure.
7. The 72-hour no-response task completes only eligible items with no return/refund/exchange/issue hold, and records an auditable system event.
8. Item-level completion and order-level aggregate status remain consistent across multi-item and multi-vendor orders.
9. The migration matches the models and supports the configured Django app label `oder`.
10. WebSocket authentication/access rules, Celery task discovery/schedules, and admin/vendor route protections are correct.

## Required security and correctness checks
- Verify carrier webhook authentication; do not claim native DHL/FedEx webhooks can call the normalized endpoint without an adapter and provider-native signature validation.
- Verify carrier API credential names, endpoints, response mappings, timeout behavior, duplicate event handling, stale/out-of-order events, tracking-number uniqueness, and provider rate limits.
- Verify that shipment label creation alone does not mark a parcel shipped; staff must confirm physical handover.
- Verify that reporting an issue cancels the 72-hour deadline and blocks automatic completion.
- Verify that an open return/refund/exchange cannot be auto-completed.
- Verify that callback/job retries cannot duplicate fulfilment events or transition a completed item backwards.
- Verify all timestamps are timezone-aware and the 72-hour countdown behaves predictably.
- Check that errors do not leak customer/vendor personal information.

## Mandatory weekly payout audit

This implementation records `payout_eligible_at`; it has not replaced the current monthly payout engine. Independently audit and then propose/implement the approved remaining financial work:

- The current `get_vendor_earnings()` and payout runner have used the order placement date and monthly periods. Determine the exact current behavior from code.
- Design the weekly cycle (proposed cutoff Sunday 23:59:59 Africa/Nairobi, audit Monday, submit approved batch Tuesday) using payout eligibility timestamps.
- Make sure late-eligible order items do not disappear across week/month boundaries.
- Review `VendorPayout` uniqueness by vendor and period and its paid-payout immutability behavior.
- Determine if durable batch and payout-allocation records are necessary to prevent duplicates, particularly for orders containing multiple vendors or items completed at different times.
- Reconcile each allocation to a verified customer payment, source order item, vendor amount, any holds/adjustments, weekly batch, provider submission, and provider-confirmed final payout.
- Do not equate provider submission with successful settlement.
- Do not automatically transfer money from the 72-hour completion task. Preserve administrator review/approval and provider-confirmation safeguards.
- Investigate the existing return/payment status case mismatch and vendor catalogue ownership inconsistency.
- Handle existing historical completed orders carefully. Do not fabricate historical customer-acceptance timestamps or silently pay old orders just because the migration adds new fulfilment records.

## Workflow
1. First report findings with exact file/function references; label confirmed bugs separately from risks.
2. Run Django checks, migration checks, backend tests, and frontend build. Provide actual results, not assumptions.
3. Fix clear defects within this approved fulfilment/payout scope, while preserving unrelated work.
4. Add regression tests for the relevant transitions and financial cases.
5. Inspect the final diff for unrelated changes and inspect the branch status.
6. Do not sync to production GitLab.

At completion, provide the changed-file list, commit(s), test logs, unresolved risks, required environment configuration, and an end-to-end example showing a customer payment through dispatch, carrier tracking, customer acceptance/72-hour resolution, weekly payout eligibility, and final provider-confirmed vendor payment.
