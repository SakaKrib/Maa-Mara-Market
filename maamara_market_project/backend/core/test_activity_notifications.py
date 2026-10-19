from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework.test import APIRequestFactory, force_authenticate

from ReactSerializers.models import Item
from vendorDashboard.models import Vendor, VendorRequest
from core.models import ActivityLog, Notification
from core.Serializer import ActivityLogSerializer, NotificationSerializer, get_activity_logs
from ReactSerializers.vendors import list_verified_vendor_requests


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
            description="A customer added Bidets Tool to their cart.",
            item=self.item,
        )

        data = self.serialize_activity(activity, self.customer)

        self.assertEqual(data["display_message"], "You added Bidets Tool to your cart.")

    def test_own_wishlist_action_renders_as_you_from_neutral_event(self):
        activity = ActivityLog.objects.create(
            user=self.customer,
            actor_type="user",
            action="item_added_to_wishlist",
            description="A customer added Bidets Tool to their wishlist.",
            item=self.item,
        )

        data = self.serialize_activity(activity, self.customer)

        self.assertEqual(
            data["display_message"],
            "You added Bidets Tool to your wishlist.",
        )

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

    def test_vendor_scope_deduplicates_audience_copies_of_one_event(self):
        customer_log = ActivityLog.objects.create(
            user=self.customer,
            actor_type="user",
            action="return_requested",
            description="A customer requested a return for Bidets Tool.",
            item=self.item,
        )
        ActivityLog.objects.create(
            user=self.vendor_user,
            actor_type="vendor",
            action="return_requested",
            description="A customer requested a return for Bidets Tool.",
            item=self.item,
        )
        admin_log = ActivityLog.objects.create(
            user=self.admin,
            actor_type="admin",
            action="return_requested",
            description="A customer requested a return for Bidets Tool.",
            item=self.item,
        )

        request = APIRequestFactory().get(
            "/api/activity-logs/?scope=vendor&all=true"
        )
        force_authenticate(request, user=self.vendor_user)
        response = get_activity_logs(request)

        returned_ids = {entry["id"] for entry in response.data}

        self.assertIn(customer_log.id, returned_ids)
        self.assertNotIn(admin_log.id, returned_ids)
        self.assertEqual(
            len([entry for entry in response.data if entry["action"] == "return_requested"]),
            1,
        )

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


    def test_vendor_request_list_get_does_not_create_activity(self):
        request = APIRequestFactory().get("/api/vendor/requests?status=verified")
        force_authenticate(request, user=self.admin)

        response = list_verified_vendor_requests(request)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            ActivityLog.objects.filter(action="viewed_vendor_requests").count(),
            0,
        )

    def test_admin_feed_shows_only_one_legacy_vendor_request_view_activity(self):
        ActivityLog.objects.create(
            user=self.admin,
            actor_type="admin",
            action="viewed_vendor_requests",
            description="The administrator viewed vendor requests (all).",
        )
        ActivityLog.objects.create(
            user=self.admin,
            actor_type="admin",
            action="viewed_vendor_requests",
            description="The administrator viewed vendor requests (verified).",
        )

        request = APIRequestFactory().get("/api/activity-logs/?scope=admin&all=true")
        force_authenticate(request, user=self.admin)
        response = get_activity_logs(request)

        matching = [
            row for row in response.data
            if row["action"] == "viewed_vendor_requests"
        ]
        self.assertEqual(len(matching), 1)

    def test_vendor_item_update_uses_first_person_for_vendor_and_named_vendor_for_admin(self):
        activity = ActivityLog.objects.create(
            user=self.vendor_user,
            actor_type="vendor",
            action="item_updated",
            description="A vendor updated Bidets Tool.",
            item=self.item,
        )

        vendor_data = self.serialize_activity(activity, self.vendor_user)
        admin_data = self.serialize_activity(activity, self.admin)

        self.assertEqual(vendor_data["display_message"], "You updated Bidets Tool.")
        self.assertEqual(
            admin_data["display_message"],
            "Vendor One Vendor updated Bidets Tool.",
        )

    def test_vendor_item_request_uses_first_person_in_vendor_activity(self):
        activity = ActivityLog.objects.create(
            user=self.vendor_user,
            actor_type="vendor",
            action="item_request_created",
            description="A vendor submitted an item request for Bidets Tool.",
            item=self.item,
        )

        data = self.serialize_activity(activity, self.vendor_user)

        self.assertEqual(
            data["display_message"],
            "You submitted an item request for Bidets Tool.",
        )

    def test_admin_vendor_item_activity_preserves_named_vendor_message(self):
        activity = ActivityLog.objects.create(
            user=self.admin,
            actor_type="admin",
            action="item_updated",
            description="Vendor One Vendor updated Bidets Tool.",
            item=self.item,
        )

        data = self.serialize_activity(activity, self.admin)

        self.assertEqual(
            data["display_message"],
            "Vendor One Vendor updated Bidets Tool.",
        )


    def test_legacy_admin_vendor_registration_notification_names_vendor(self):
        vendor_request = VendorRequest.objects.create(
            user=self.vendor_user,
            vendor_data={"first_name": "One", "surname_name": "Vendor"},
        )
        notification = Notification.objects.create(
            user=self.admin,
            title="New Vendor Request",
            message="A vendor submitted a new vendor request.",
            vendor_request=vendor_request,
        )

        request = APIRequestFactory().get("/api/notifications/")
        force_authenticate(request, user=self.admin)
        data = NotificationSerializer(
            notification,
            context={"request": request},
        ).data

        self.assertEqual(
            data["display_message"],
            "Vendor One Vendor submitted a new vendor request.",
        )

    def test_vendor_notification_hides_admin_style_vendor_name(self):
        notification = Notification.objects.create(
            user=self.vendor_user,
            title="Item updated",
            message="Vendor One Vendor updated Bidets Tool.",
        )
        request = APIRequestFactory().get("/api/notifications/")
        force_authenticate(request, user=self.vendor_user)

        data = NotificationSerializer(
            notification,
            context={"request": request},
        ).data

        self.assertEqual(data["display_message"], "You updated Bidets Tool.")


    def test_customer_cart_activity_creates_vendor_notification(self):
        notification_count = Notification.objects.filter(
            user=self.vendor_user,
            title="Item added to cart",
        ).count()

        ActivityLog.objects.create(
            user=self.customer,
            actor_type="user",
            action="item_added_to_cart",
            description=f"A customer added {self.item.name} to their cart.",
            item=self.item,
        )

        notification = Notification.objects.filter(
            user=self.vendor_user,
            title="Item added to cart",
        ).latest("created_at")

        self.assertEqual(
            Notification.objects.filter(
                user=self.vendor_user,
                title="Item added to cart",
            ).count(),
            notification_count + 1,
        )
        self.assertEqual(
            notification.message,
            f"A customer added {self.item.name} to their cart.",
        )
        self.assertEqual(
            notification.url,
            f"/vendors-dashboard/item-onsite/items/{self.item.id}",
        )

    def test_legacy_vendor_homepage_item_notification_routes_to_item(self):
        notification = Notification.objects.create(
            user=self.vendor_user,
            title="Item added to cart",
            message=f"A customer added {self.item.name} to their cart.",
            url="/vendors-dashboard",
        )
        self.assertEqual(
            notification.url,
            f"/vendors-dashboard/item-onsite/items/{self.item.id}",
        )

    def test_item_notification_routes_admin_to_admin_item_performance(self):
        notification = Notification.objects.create(
            user=self.admin,
            title="Item viewed",
            message=f"A customer viewed {self.item.name}.",
            url=f"/item/{self.item.id}/",
        )
        self.assertEqual(
            notification.url,
            f"/admin-dashboard/items/{self.item.id}",
        )

    def test_existing_legacy_item_notification_url_is_resolved_when_serialized(self):
        notification = Notification.objects.create(
            user=self.vendor_user,
            title="Your item was viewed",
            message=f"A customer viewed your item {self.item.name}.",
            url=f"/vendors-dashboard/item-onsite/items/{self.item.id}",
        )
        # Simulate a pre-fix row already stored with the generic dashboard URL.
        Notification.objects.filter(pk=notification.pk).update(url="/vendors-dashboard")
        notification.refresh_from_db()
        data = NotificationSerializer(notification).data
        self.assertEqual(
            data["url"],
            f"/vendors-dashboard/item-onsite/items/{self.item.id}",
        )

    def test_vendor_sees_named_item_approval_not_approval_action(self):
        activity = ActivityLog.objects.create(
            user=self.vendor_user,
            actor_type="vendor",
            action="item_request_approved",
            description="Your item request for Bidets Tool was approved by the admin.",
            item=self.item,
        )

        data = self.serialize_activity(activity, self.vendor_user)

        self.assertEqual(data["display_message"], "Your item Bidets Tool was approved.")
        self.assertNotIn("You approved", data["display_message"])

    def test_admin_sees_the_approval_decision_and_item_name(self):
        activity = ActivityLog.objects.create(
            user=self.admin,
            actor_type="admin",
            action="item_request_approved",
            description="The administrator approved the vendor item request for Bidets Tool.",
            item=self.item,
        )

        data = self.serialize_activity(activity, self.admin)

        self.assertEqual(data["display_message"], "You approved the item request for Bidets Tool.")

    def test_vendor_sees_named_item_decline_not_decline_action(self):
        activity = ActivityLog.objects.create(
            user=self.vendor_user,
            actor_type="vendor",
            action="item_request_denied",
            description="Your item request for Bidets Tool was declined by the administrator.",
        )

        data = self.serialize_activity(activity, self.vendor_user)

        self.assertEqual(
            data["display_message"],
            "Your item Bidets Tool was declined by the administrator.",
        )
        self.assertNotIn("You declined", data["display_message"])

    def test_admin_sees_the_decline_decision_and_item_name(self):
        activity = ActivityLog.objects.create(
            user=self.admin,
            actor_type="admin",
            action="item_request_denied",
            description="The administrator declined the vendor request for Bidets Tool.",
        )

        data = self.serialize_activity(activity, self.admin)

        self.assertEqual(data["display_message"], "You declined the item request for Bidets Tool.")

    def test_legacy_item_update_without_item_relation_keeps_item_name(self):
        activity = ActivityLog.objects.create(
            user=self.vendor_user,
            actor_type="vendor",
            action="item_updated",
            description="You updated Aluminum Accents.",
        )

        data = self.serialize_activity(activity, self.vendor_user)

        self.assertEqual(data["display_message"], "You updated Aluminum Accents.")
        self.assertNotEqual(data["display_message"], "You updated the item.")

    def test_legacy_generic_item_update_resolves_name_from_related_url(self):
        activity = ActivityLog.objects.create(
            user=self.vendor_user,
            actor_type="vendor",
            action="item_updated",
            description="You updated the item.",
            related_url=f"/vendors-dashboard/item-onsite/items/{self.item.id}",
        )

        data = self.serialize_activity(activity, self.vendor_user)

        self.assertEqual(data["display_message"], "You updated Bidets Tool.")
