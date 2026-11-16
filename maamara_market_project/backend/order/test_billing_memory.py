from datetime import timedelta
from decimal import Decimal
from uuid import uuid4

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import AccessToken

from order.models import BillingAddress, Order, Payment


class PreviousBillingAddressTests(TestCase):
    URL = "/api/checkout/previous-billing/"

    def setUp(self):
        self.user = get_user_model().objects.create_user("bm-user", "bm@example.com", "pw")
        self.other = get_user_model().objects.create_user("bm-other", "bo@example.com", "pw")

    def order(self, *, user=None, visitor_id=None, paid=True, city="Nairobi", age_days=0):
        address = BillingAddress.objects.create(
            user=user, visitor_id=visitor_id, first_name="Amina", last_name="K",
            email="a@example.com", phone="+254700000000", street_address="1 Road",
            city=city, zip="00100", country="KE",
        )
        payment = Payment.objects.create(
            amount=Decimal("10.00"), merchant_reference=uuid4().hex, status="PAID" if paid else "PENDING"
        )
        return Order.objects.create(
            user=user, visitor_id=visitor_id, payment=payment, billing_address=address,
            ordered_date=timezone.now() - timedelta(days=age_days), status="COMPLETED",
        )

    def visitor_client(self, visitor_id):
        client = APIClient()
        token = AccessToken()
        token["visitor"] = True
        token["visitor_id"] = visitor_id
        client.cookies["visitorId"] = visitor_id
        client.cookies["visitorAccessToken"] = str(token)
        return client

    def test_signed_in_user_gets_most_recent_paid_billing_address(self):
        self.order(user=self.user, city="Old Town", age_days=10)
        self.order(user=self.user, city="New Town", age_days=1)
        client = APIClient(); client.force_authenticate(self.user)
        data = client.get(self.URL).json()["billing_address"]
        self.assertEqual(data["city"], "New Town")
        self.assertEqual(data["country"], "KE")

    def test_visitor_gets_their_own_previous_address(self):
        self.order(visitor_id="visitor-1", city="Mombasa")
        data = self.visitor_client("visitor-1").get(self.URL).json()["billing_address"]
        self.assertEqual(data["city"], "Mombasa")

    def test_visitor_never_sees_another_visitors_or_a_users_address(self):
        self.order(visitor_id="visitor-1", city="Mombasa")
        self.order(user=self.user, city="Nairobi")
        self.assertIsNone(self.visitor_client("visitor-2").get(self.URL).json()["billing_address"])

    def test_unpaid_orders_are_not_offered(self):
        self.order(user=self.user, paid=False)
        client = APIClient(); client.force_authenticate(self.user)
        self.assertIsNone(client.get(self.URL).json()["billing_address"])

    def test_other_users_address_is_not_returned(self):
        self.order(user=self.other, city="Kisumu")
        client = APIClient(); client.force_authenticate(self.user)
        self.assertIsNone(client.get(self.URL).json()["billing_address"])

    def test_anonymous_request_without_a_visitor_token_is_refused(self):
        self.assertIn(APIClient().get(self.URL).status_code, (401, 403))
