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

## Known audit work already added to this branch (verify rather than assume)
- Payment callback replay normalization was adjusted so an already `COMPLETED` order is not downgraded to `PAID`; unit regression tests were added.
- Added `project01/celery.py`, imported the Celery app from `project01/__init__.py`, configured Redis as the broker, and added worker/Beat services to both development Compose and the production Compose overlay. Confirm tasks are discovered and Beat actually schedules the 72-hour and tracking-sync tasks.
- The backend GitHub workflow now uses disposable PostgreSQL, runs `python manage.py makemigrations --check --dry-run`, applies the migration graph with `python manage.py migrate --noinput`, and runs `python manage.py test order.test_fulfillment_tracking --verbosity 2`. Inspect the current workflow run and its logs; do not report tests passing solely because earlier syntax/system-check jobs passed.
- The order payment-confirmation property and vendor/admin fulfilment queries now recognize `PAID`/`COMPLETED` casing variants. Verify legacy records and refund/return holds still behave as intended.
- Carrier `RETURNED` events now set an item hold, clear its customer-confirmation deadline, and clear current payout eligibility even if the item had previously been marked completed; historical completion/acceptance timestamps are retained. A carrier exception during the confirmation window also sets a review hold. Database-backed tests cover return before confirmation, late return after completion, delivery exception during confirmation, 72-hour auto-completion, and the unverified-payment fail-closed path. Confirm these pass in the latest PostgreSQL CI run.
- The account API response now includes the `success` flag consumed by the customer orders component and retains `DISPUTED`, cancelled, returned, and refunded orders for customer/visitor tracking. The customer orders list includes `DISPUTED` (“Issue Under Review”). Verify the issue-reporting journey remains visible and the customer can reopen the shipment timeline after reporting a problem.
- The follow-up source audit added a nested savepoint around shipment creation so duplicate carrier/tracking-number constraints can return HTTP 409 safely; it also rejects assigning one complete fulfillment line to multiple shipments, and blocks `resume_confirmation` while an active return/refund/exchange request exists. New tests cover these three cases; inspect the latest CI logs to verify them rather than assuming they passed.
- Scheduled tracking now includes delivered shipments only while an associated item is awaiting customer confirmation, under issue review, or recently completed, with a configurable 14-day default window from `delivered_at`. Verify the new setting, migration-free config, and regression test, and confirm rate-limit/call-spacing behavior remains correct.
- Updated implementation log: `docs/ORDER_SHIPMENT_TRACKING_IMPLEMENTATION_LOG.md`.
- The production Compose overlay still contains a Caddy service even though the project's stated production preference is Nginx; that pre-existing deployment discrepancy was not changed by this focused fulfilment work.

## Workflow
1. First report findings with exact file/function references; label confirmed bugs separately from risks.
2. Run Python compilation, Django system checks, fulfilment unit tests, `makemigrations --check --dry-run`, `migrate --plan`, and frontend builds. Provide actual results, not assumptions. Run DB-backed tests against a safe disposable test database if configured.
3. Validate Compose merges/configuration with both development and production overlays; confirm worker and Beat services inherit the correct application image, environment, Redis connection, and persistent Beat schedule.
4. Fix clear defects within this approved fulfilment/payout scope, while preserving unrelated work.
5. Add regression tests for the relevant transitions and financial cases.
6. Inspect the final diff for unrelated changes and inspect the branch status.
7. Do not sync to production GitLab.

At completion, provide the changed-file list, commit(s), test logs, unresolved risks, required environment configuration, and an end-to-end example showing a customer payment through dispatch, carrier tracking, customer acceptance/72-hour resolution, weekly payout eligibility, and final provider-confirmed vendor payment.
