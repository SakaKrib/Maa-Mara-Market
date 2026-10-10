from unittest.mock import patch

from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework.test import APIRequestFactory, force_authenticate

from core.models import Notification
from vendorDashboard.VendorRequests import approve_request
from vendorDashboard.models import Vendor, VendorItemRequest


class VendorItemRequestDenialNotificationTests(TestCase):
    def setUp(self):
        self.vendor_user = User.objects.create_user(
            username="denial_vendor_user",
            email="denial-vendor@example.com",
            password="test-password",
        )
        self.admin = User.objects.create_user(
            username="denial_admin",
            email="denial-admin@example.com",
            password="test-password",
            is_staff=True,
        )
        self.vendor = Vendor.objects.create(
            user=self.vendor_user,
            surname_name="Vendor",
            first_name="Denial",
            phone_number="0700000000",
            username="denialvendor",
            email="denial-vendor-profile@example.com",
            id_number="123456789012",
            vendor_code="DENIAL-1001",
            country="Kenya",
            city="Nairobi",
            address="Market Street",
            address_2="",
            product_type="Handmade",
            is_food="no",
            product_description="Marketplace products",
            company_name="Denial Test Shop",
            workshop_location="Nairobi",
        )
        self.item_request = VendorItemRequest.objects.create(
            vendor=self.vendor,
            created_by=self.vendor_user,
            name="Denial notification regression item",
            description="A test request to cover denial notifications.",
            price="100.00",
        )

    def test_denial_notification_targets_vendor_user_account(self):
        request = APIRequestFactory().post(
            f"/api/vendor/requests/{self.item_request.pk}/approve/",
            {"action": "deny"},
            format="json",
        )
        force_authenticate(request, user=self.admin)

        with (
            patch(
                "vendorDashboard.VendorRequests.render_to_string",
                return_value="<p>Your item request was denied.</p>",
            ),
            patch("vendorDashboard.VendorRequests.EmailMultiAlternatives.send"),
        ):
            response = approve_request(request, pk=self.item_request.pk)

        self.assertEqual(response.status_code, 200, getattr(response, "data", response))
        self.item_request.refresh_from_db()
        self.assertEqual(self.item_request.status, "denied")

        notification = Notification.objects.get(
            title="Item Request Denied",
            url=f"/vendors-dashboard/vendor/requests/{self.item_request.id}/",
        )
        self.assertEqual(notification.user, self.vendor_user)
        self.assertNotEqual(notification.user, self.vendor)
