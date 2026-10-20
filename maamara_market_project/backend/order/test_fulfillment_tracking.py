from datetime import timedelta
from decimal import Decimal
from types import SimpleNamespace
from uuid import uuid4

from django.contrib.auth import get_user_model
from django.test import SimpleTestCase, TestCase
from django.utils import timezone

from ReactSerializers.models import Item
from order.fulfillment import (
    FULFILLMENT_RANK,
    VENDOR_TRANSITIONS,
    _advance_from_carrier,
    _normalize_carrier_status,
)
from order.models import Order, OrderItem, OrderItemFulfillment, Payment, Shipment
from order.order_completion import _normalize_replayed_order_status


class CarrierStatusNormalizationTests(SimpleTestCase):
    def test_dhl_delivery_description_maps_to_delivered(self):
        self.assertEqual(_normalize_carrier_status("Delivered - signed for"), "DELIVERED")

    def test_carrier_in_transit_descriptions_are_normalized(self):
        self.assertEqual(_normalize_carrier_status("Shipment is in transit"), "IN_TRANSIT")
        self.assertEqual(_normalize_carrier_status("Departed facility"), "IN_TRANSIT")

    def test_last_mile_descriptions_map_to_out_for_delivery(self):
        self.assertEqual(_normalize_carrier_status("On vehicle for delivery"), "OUT_FOR_DELIVERY")

    def test_pickup_descriptions_do_not_skip_to_delivery(self):
        self.assertEqual(_normalize_carrier_status("Shipment picked up"), "SHIPPED")

    def test_label_creation_is_not_mistaken_for_carrier_handover(self):
        self.assertIsNone(_normalize_carrier_status("Label created"))

    def test_return_to_sender_is_recognized_as_a_hold_event(self):
        self.assertEqual(_normalize_carrier_status("Returned to sender"), "RETURNED")

    def test_delivery_exception_is_recognized(self):
        self.assertEqual(_normalize_carrier_status("Delivery exception"), "EXCEPTION")

    def test_unknown_carrier_text_does_not_advance_order(self):
        self.assertIsNone(_normalize_carrier_status("Reference uploaded"))

    def test_vendor_steps_are_sequential_and_stop_at_dispatch(self):
        self.assertEqual(VENDOR_TRANSITIONS["PAID"], "PROCESSING")
        self.assertEqual(VENDOR_TRANSITIONS["PROCESSING"], "PACKING")
        self.assertEqual(VENDOR_TRANSITIONS["PACKING"], "READY_TO_SHIP")
        self.assertNotIn("READY_TO_SHIP", VENDOR_TRANSITIONS)

    def test_customer_acceptance_occurs_after_delivery_stages(self):
        self.assertLess(FULFILLMENT_RANK["DELIVERED"], FULFILLMENT_RANK["AWAITING_CONFIRMATION"])
        self.assertLess(FULFILLMENT_RANK["AWAITING_CONFIRMATION"], FULFILLMENT_RANK["COMPLETED"])



class PaymentReplayStatusTests(SimpleTestCase):
    def test_completed_order_does_not_downgrade_on_payment_replay(self):
        self.assertEqual(_normalize_replayed_order_status("COMPLETED"), "COMPLETED")

    def test_legacy_lowercase_completed_status_is_normalized_not_downgraded(self):
        self.assertEqual(_normalize_replayed_order_status("completed"), "COMPLETED")

    def test_legacy_lowercase_paid_status_is_normalized(self):
        self.assertEqual(_normalize_replayed_order_status("paid"), "PAID")



class PaymentConfirmationStatusTests(SimpleTestCase):
    def test_paid_and_completed_statuses_are_case_insensitive(self):
        for value in ("PAID", "paid", "Paid", "COMPLETED", "completed", "Completed"):
            with self.subTest(status=value):
                fake_order = SimpleNamespace(payment=SimpleNamespace(status=value))
                self.assertTrue(Order.payment_confirmed.fget(fake_order))

    def test_missing_or_unpaid_payment_is_not_confirmed(self):
        self.assertFalse(Order.payment_confirmed.fget(SimpleNamespace(payment=None)))
        for value in ("PENDING", "FAILED", "REFUNDED", ""):
            with self.subTest(status=value):
                fake_order = SimpleNamespace(payment=SimpleNamespace(status=value))
                self.assertFalse(Order.payment_confirmed.fget(fake_order))



class CarrierReturnHoldTests(TestCase):
    def setUp(self):
        user_model = get_user_model()
        self.user = user_model.objects.create_user(
            username=f"fulfillment-test-{uuid4().hex[:12]}",
            password="test-only-password",
        )
        self.item = Item.objects.create(
            name=f"Test tracking item {uuid4().hex[:8]}",
            description="Test-only item for fulfilment regression tests.",
            created_by=self.user,
        )
        self.payment = Payment.objects.create(
            amount=Decimal("100.00"),
            merchant_reference=uuid4().hex,
            status="PAID",
        )
        self.order = Order.objects.create(
            user=self.user,
            payment=self.payment,
            ordered_date=timezone.now(),
            status="AWAITING_CONFIRMATION",
        )
        self.order_item = OrderItem.objects.create(
            order=self.order,
            item=self.item,
            user=self.user,
            price_at_purchase=Decimal("100.00"),
            quantity=1,
        )
        self.deadline = timezone.now() + timedelta(days=3)
        self.fulfillment = OrderItemFulfillment.objects.create(
            order_item=self.order_item,
            status="AWAITING_CONFIRMATION",
            confirmation_deadline=self.deadline,
        )
        self.shipment = Shipment.objects.create(
            order=self.order,
            carrier="DHL",
            tracking_number=f"TEST-{uuid4().hex}",
            status="DELIVERED",
        )
        self.shipment.order_items.add(self.fulfillment)

    def test_return_to_sender_clears_deadline_and_holds_fulfillment(self):
        _advance_from_carrier(
            self.shipment,
            "RETURNED",
            "Returned to sender",
            occurred_at=timezone.now(),
            source="CARRIER_API",
            event_id="return-event-1",
        )
        self.fulfillment.refresh_from_db()
        self.order.refresh_from_db()

        self.assertEqual(self.fulfillment.status, "ISSUE_REPORTED")
        self.assertIsNone(self.fulfillment.confirmation_deadline)
        self.assertIn("returned to sender", self.fulfillment.hold_reason.lower())
        self.assertEqual(self.order.status, "DISPUTED")

    def test_late_return_revokes_payout_eligibility_without_erasing_history(self):
        accepted_at = timezone.now() - timedelta(minutes=15)
        self.fulfillment.status = "COMPLETED"
        self.fulfillment.completed_at = accepted_at
        self.fulfillment.customer_confirmed_at = accepted_at
        self.fulfillment.payout_eligible_at = accepted_at
        self.fulfillment.save(update_fields=[
            "status", "completed_at", "customer_confirmed_at", "payout_eligible_at", "updated_at"
        ])

        _advance_from_carrier(
            self.shipment,
            "RETURNED",
            "Returned to sender after delivery scan",
            occurred_at=timezone.now(),
            source="CARRIER_API",
            event_id="late-return-event",
        )
        self.fulfillment.refresh_from_db()
        self.order.refresh_from_db()

        self.assertEqual(self.fulfillment.status, "ISSUE_REPORTED")
        self.assertIsNone(self.fulfillment.payout_eligible_at)
        self.assertEqual(self.fulfillment.completed_at, accepted_at)
        self.assertEqual(self.fulfillment.customer_confirmed_at, accepted_at)
        self.assertEqual(self.order.status, "DISPUTED")
