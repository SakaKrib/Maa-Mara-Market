from types import SimpleNamespace

from django.test import SimpleTestCase

from order.fulfillment import FULFILLMENT_RANK, VENDOR_TRANSITIONS, _normalize_carrier_status
from order.models import Order
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
