# Maamara Market — Order Fulfilment and Shipment Tracking Implementation Log

## Purpose

This record documents the shipment/dispatch/customer-acceptance workflow added on the `ui-redesign-foundation` development branch. GitHub remains the development source of truth. Production GitLab was not modified.

## Implementation scope

### Backend
- Added an item-level `OrderItemFulfillment` record with persistent stage, dispatch inspection state, customer-confirmation deadline, issue/hold reason, completion timestamp, and `payout_eligible_at`.
- Added `Shipment`, `ShipmentEvent`, and `FulfillmentEvent` records so tracking numbers, carrier events, status transitions, actor/source, notes, and timestamps survive page refreshes.
- Initialized item tracking after verified payment, including idempotent handling when payment callbacks are replayed.
- Added vendor APIs to advance only one supported preparation step at a time: Paid → Processing → Packing → Ready to Ship.
- Added staff/admin APIs for dispatch inspection, carrier tracking-number registration, physical carrier handover, manual verified tracking events, provider refresh, and issue resolution.
- Added customer APIs to confirm receipt per item or report a problem. Reporting a problem stops the deadline and holds that item for staff review.
- Added an automatic 72-hour confirmation task. It completes only items whose confirmation deadline has passed and which have no detected return/refund/exchange hold. Unverified payment or open-return checks fail closed into an issue/hold state.
- Added normalized carrier-status handling for DHL and FedEx tracking APIs, with periodic 30-minute synchronization when the required carrier credentials/endpoints are configured. Provider errors never fabricate shipment progress.
- Added a token-protected normalized webhook endpoint for deployments that configure a carrier-side adapter to send the common payload.
- Added WebSocket broadcasts for customer order tracking and the existing vendor order update group.
- Added routes and Celery Beat entries.

### Frontend
- Added a persistent step-by-step vendor fulfilment panel to the vendor Orders page. Each step opens a confirmation modal, the next step can appear after a successful update, and the current state remains visible after dismissing the modal or leaving the page.
- Added customer item-level shipment timeline, carrier tracking link/events, the receipt-confirmation modal, persistent inline confirm/report controls, and the problem-reporting action.
- Added an admin Shipment Dispatch page in the admin navigation for inspections, shipment records, carrier handover confirmation, tracking refresh, manual event entry, and issue resolution.

### Tests
- Added unit tests for carrier status normalization and sequential vendor preparation stages.
- These tests have been added to the repository, but they have not been executed in a live project container as part of this change.

## Carrier integration and configuration notes

DHL/FedEx live tracking requires real credentials and access permitted for Maamara Market's carrier account. The repository previously contained rate-quote code but disabled the actual DHL/FedEx rate calls; a rate quote is not a shipment booking or tracking feed.

Configure as appropriate for the actual carrier accounts:
- `DHL_TRACKING_API_URL` (defaults to DHL Unified Tracking endpoint)
- `DHL_TRACKING_API_KEY` (falls back to `DHL_API_KEY` when absent)
- `FEDEX_TRACKING_API_URL` (defaults to FedEx Track API endpoint)
- Existing `FEDEX_OAUTH_URL`, `FEDEX_CLIENT_ID`, and `FEDEX_CLIENT_SECRET`
- `SHIPMENT_TRACKING_WEBHOOK_TOKEN` only when deploying a normalized webhook adapter

The admin workflow currently records a carrier-issued tracking number after a dispatcher books the shipment using the carrier's approved channel. It does not automatically purchase a label or book a DHL/FedEx shipment. The admin must confirm physical handover; the label/tracking number alone does not mean the parcel is already with the carrier.

The normalized webhook endpoint is not a plug-and-play DHL/FedEx webhook adapter: the carrier's native signing/payload requirements must be reviewed before registering it directly with a provider. Polling through the configured official carrier tracking API is the supported direct integration in this change.

## Financial and policy boundary

- Customer acceptance and the 72-hour timeout mark an item completed and record `payout_eligible_at`.
- A customer-reported issue stops automatic completion and remains held until an authorized staff resolution.
- This change does **not** automatically transfer vendor money. Vendor payout submission must remain a separately audited/approved financial action with provider confirmation.
- The existing payout generator and period calculation still need the separate weekly-batch audit: it currently uses a monthly vendor-period approach and order-placement-date selection. Cloud AI should verify and implement the weekly eligibility-based batch/line-allocation changes separately, with careful migration/backfill for historical orders. Do not assume that writing `payout_eligible_at` has already switched the payout engine to weekly periods.

## Verification status

- Source changes were assembled against `ui-redesign-foundation`.
- No local browser/device run or backend container test run has been performed here.
- The GitHub branch should be checked for migration consistency, Django checks, tests, and frontend build results after the commit.
- Carrier API behavior remains unverified against live DHL/FedEx credentials.
- Do not deploy to production until the automated checks pass, carrier credentials are verified in a safe environment, and Cloud AI has reviewed the financial/payout boundary described above.

## Change-by-change history

1. Inspected order status definitions, order-payment finalization, vendor-order interfaces, customer tracking interface, shipping-rate code, Celery schedules, and payout-related references before implementing.
2. Added persistent item fulfilment, shipment, shipment event, and fulfilment event models with migration `0044_fulfillment_tracking.py`.
3. Added vendor, customer, dispatch/admin, carrier-polling, and normalized webhook APIs in `order/fulfillment.py`.
4. Added Celery tasks/schedules for 72-hour auto-completion and carrier synchronization.
5. Seeded fulfilment records from verified paid-order finalization; replayed payment callbacks reuse existing records.
6. Added vendor/customer/admin workflow components and routes/sidebar access.
7. Added carrier normalization regression tests and this implementation/review log.
