from decimal import Decimal
from uuid import uuid4

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from ReactSerializers.models import Item
from order.fulfillment import shipping_summary
from order.models import BillingAddress, Order, OrderItem, OrderItemFulfillment, Payment, Shipment


class DispatchShippingLinkTests(TestCase):
    def setUp(self):
        User = get_user_model()
        self.admin = User.objects.create_user("dl-admin", "a@example.com", "pw", is_staff=True)
        self.customer = User.objects.create_user("dl-buyer", "b@example.com", "pw")

    def order(self, *, provider=None, service=None, country="KE"):
        item = Item.objects.create(name=f"I {uuid4().hex[:6]}", description="x", created_by=self.customer)
        payment = Payment.objects.create(amount=Decimal("100.00"), merchant_reference=uuid4().hex, status="PAID")
        address = BillingAddress.objects.create(user=self.customer, country=country, city="Somewhere")
        order = Order.objects.create(
            user=self.customer, payment=payment, ordered_date=timezone.now(), status="PROCESSING",
            billing_address=address, shipping_provider=provider, shipping_service=service,
            shipping_amount=Decimal("4200.00") if provider else Decimal("0.00"),
            shipping_provider_amount=Decimal("32.00") if provider else None,
            shipping_currency="USD" if provider else None,
        )
        line = OrderItem.objects.create(order=order, item=item, user=self.customer, price_at_purchase=Decimal("100.00"), quantity=1)
        fulfillment = OrderItemFulfillment.objects.create(
            order_item=line, status="DISPATCH_INSPECTED", inspection_status="PASSED"
        )
        return order, fulfillment

    def book(self, order, fulfillment, **extra):
        client = APIClient()
        client.force_authenticate(self.admin)
        body = {"order_id": order.id, "fulfillment_ids": [fulfillment.id], "tracking_number": "TRK123", **extra}
        return client.post("/api/fulfillment/shipments/", body, format="json")

    def test_summary_describes_a_paid_courier(self):
        order, _ = self.order(provider="DHL", service="Express Worldwide", country="US")
        summary = shipping_summary(order)
        self.assertEqual(summary["arrangement"], "carrier")
        self.assertEqual(summary["carrier_code"], "DHL")
        self.assertEqual(summary["amount_kes"], "4200.00")
        self.assertFalse(summary["needs_attention"])

    def test_overseas_order_without_courier_needs_attention_but_local_does_not(self):
        overseas, _ = self.order(country="US")
        local, _ = self.order(country="KE")
        self.assertTrue(shipping_summary(overseas)["needs_attention"])
        self.assertEqual(shipping_summary(overseas)["arrangement"], "customer_arranged")
        self.assertFalse(shipping_summary(local)["needs_attention"])

    def test_booking_a_different_carrier_than_paid_requires_confirmation(self):
        order, fulfillment = self.order(provider="DHL", service="Express Worldwide", country="US")
        response = self.book(order, fulfillment, carrier="FEDEX")
        self.assertEqual(response.status_code, 409)
        self.assertEqual(response.json()["code"], "CARRIER_MISMATCH")
        self.assertEqual(Shipment.objects.count(), 0)
        confirmed = self.book(order, fulfillment, carrier="FEDEX", confirm_mismatch=True)
        self.assertIn(confirmed.status_code, (200, 201), confirmed.content[:200])

    def test_matching_carrier_books_and_fills_in_the_paid_service(self):
        order, fulfillment = self.order(provider="DHL", service="Express Worldwide", country="US")
        response = self.book(order, fulfillment, carrier="DHL")
        self.assertIn(response.status_code, (200, 201), response.content[:200])
        self.assertEqual(Shipment.objects.get().service, "Express Worldwide")

    def test_customer_arranged_order_can_be_booked_with_other(self):
        order, fulfillment = self.order(country="KE")
        response = self.book(order, fulfillment, carrier="OTHER", service="Rider")
        self.assertIn(response.status_code, (200, 201), response.content[:200])

    def test_staff_queue_includes_the_shipping_summary(self):
        order, _ = self.order(provider="FedEx", service="International Priority", country="GB")
        client = APIClient()
        client.force_authenticate(self.admin)
        rows = client.get("/api/fulfillment/admin/").json()["results"]
        row = next(r for r in rows if r["order_id"] == order.id)
        self.assertEqual(row["shipping"]["carrier_code"], "FEDEX")
