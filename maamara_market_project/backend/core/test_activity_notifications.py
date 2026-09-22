from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework.test import APIRequestFactory, force_authenticate

from ReactSerializers.models import Item
from vendorDashboard.models import Vendor
from core.models import ActivityLog, Notification
from core.Serializer import ActivityLogSerializer, NotificationSerializer, get_activity_logs


class ActivityNotificationPresentationTests(TestCase):
    def setUp(self):
        self.customer = User.objects.create_user(
            username="customer_one",
            password="test-password",
        )
        self.vendor_user = User.objects.create_user(
            username="vendor_one",
            password="test-password",
        )
        self.admin = User.objects.create_user(
            username="admin_one",
            password="test-password",
            is_staff=True,
        )

        self.vendor = Vendor.objects.create(
            user=self.vendor_user,
            surname_name="Vendor",
            first_name="One",
            phone_number="0700000000",
            username="vendorone",
            email="vendor@example.com",
            id_number="123456789012",
            vendor_code="1001",
            country="Kenya",
            city="Nairobi",
            address="Market Street",
            address_2="",
            product_type="Handmade",
            is_food="no",
            product_description="Marketplace products",
            company_name="Vendor Shop",
            workshop_location="Nairobi",
        )

        self.item = Item.objects.create(
            name="Bidets Tool",
            description="Test item",
            price=100,
            in_stock=10,
            vendor=self.vendor,
            created_by=self.vendor_user,
        )
        self.other_item = Item.objects.create(
            name="Other Tool",
            description="Unrelated test item",
            price=50,
            in_stock=5,
            created_by=self.customer,
        )

    def serialize_activity(self, activity, user=None):
        request = APIRequestFactory().get("/api/activity-logs/")
        if user is not None:
            force_authenticate(request, user=user)
        return ActivityLogSerializer(
            activity,
            context={"request": request},
        ).data

    def test_customer_wishlist_message_is_human_friendly(self):
        activity = ActivityLog.objects.create(
            user=self.customer,
            actor_type="user",
            action="item_added_to_wishlist",
            description="A customer added Bidets Tool to their wishlist.",
            item=self.item,
        )

        data = self.serialize_activity(activity)

        self.assertEqual(
            data["display_message"],
            "A customer added Bidets Tool to their wishlist.",
        )
        self.assertNotIn("'Bidets Tool'", data["display_message"])
        self.assertNotIn("customer_one", data["display_message"])

    def test_own_customer_action_can_render_as_you(self):
        activity = ActivityLog.objects.create(
            user=self.customer,
            actor_type="user",
            action="item_added_to_cart",
            description="You added Bidets Tool to your cart.",
            item=self.item,
        )

        data = self.serialize_activity(activity, self.customer)

        self.assertEqual(data["display_message"], "You added Bidets Tool to their cart.")

    def test_administrator_approval_does_not_expose_username(self):
        activity = ActivityLog.objects.create(
            user=self.admin,
            actor_type="admin",
            action="item_request_approved",
            description="The administrator approved the item request for Bidets Tool.",
            item=self.item,
        )

        data = self.serialize_activity(activity)

        self.assertEqual(
            data["display_message"],
            "The administrator approved the item request for Bidets Tool.",
        )
        self.assertNotIn("admin_one", data["display_message"])
        self.assertNotIn("'Bidets Tool'", data["display_message"])

    def test_legacy_notification_is_normalized_without_username_or_quotes(self):
        notification = Notification.objects.create(
            user=self.customer,
            title="Wishlist Update",
            message="Okoth added 'Bidets Tool' to wishlist.",
        )

        data = NotificationSerializer(notification).data

        self.assertNotIn("Okoth", data["display_message"])
        self.assertNotIn("'Bidets Tool'", data["display_message"])
        self.assertEqual(
            data["display_message"],
            "A customer added Bidets Tool to their wishlist.",
        )

    def test_vendor_activity_scope_includes_customer_action_on_vendor_item(self):
        ActivityLog.objects.create(
            user=self.customer,
            actor_type="user",
            action="item_added_to_cart",
            description="A customer added Bidets Tool to their cart.",
            item=self.item,
        )
        unrelated = ActivityLog.objects.create(
            user=self.customer,
            actor_type="user",
            action="item_added_to_cart",
            description="A customer added Other Tool to their cart.",
            item=self.other_item,
        )

        request = APIRequestFactory().get(
            "/api/activity-logs/?scope=vendor&all=true"
        )
        force_authenticate(request, user=self.vendor_user)
        response = get_activity_logs(request)

        returned_ids = {entry["id"] for entry in response.data}

        self.assertIn(
            ActivityLog.objects.get(item=self.item).id,
            returned_ids,
        )
        self.assertNotIn(unrelated.id, returned_ids)

    def test_vendor_scope_does_not_return_empty_or_unrelated_activity(self):
        ActivityLog.objects.create(
            user=self.customer,
            actor_type="user",
            action="item_added_to_cart",
            description="A customer added Other Tool to their cart.",
            item=self.other_item,
        )

        request = APIRequestFactory().get(
            "/api/activity-logs/?scope=vendor&all=true"
        )
        force_authenticate(request, user=self.vendor_user)
        response = get_activity_logs(request)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, [])
