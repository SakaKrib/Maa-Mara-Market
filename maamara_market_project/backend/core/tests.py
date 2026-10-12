from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.test import APIRequestFactory, force_authenticate

from core.models import ActivityLog, Notification
from core.Serializer import get_activity_logs
from core.views import ActivityLogViewSet, NotificationDeleteView
from vendorDashboard.models import Vendor


class ActivityAndNotificationScopeTests(TestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.admin = User.objects.create_user(
            username="activity_admin",
            email="activity-admin@example.com",
            password="test-password",
            is_staff=True,
        )
        self.vendor_user = User.objects.create_user(
            username="activity_vendor",
            email="activity-vendor@example.com",
            password="test-password",
        )
        self.other_vendor_user = User.objects.create_user(
            username="other_activity_vendor",
            email="other-activity-vendor@example.com",
            password="test-password",
        )
        self.customer = User.objects.create_user(
            username="activity_customer",
            email="activity-customer@example.com",
            password="test-password",
        )

        self.vendor = self._create_vendor(self.vendor_user, "1")
        self.other_vendor = self._create_vendor(self.other_vendor_user, "2")

        self.vendor_activity = ActivityLog.objects.create(
            user=self.vendor_user,
            actor_type="vendor",
            action="item_created",
            description="Vendor created an item.",
        )
        self.other_vendor_activity = ActivityLog.objects.create(
            user=self.other_vendor_user,
            actor_type="vendor",
            action="item_created",
            description="Another vendor created an item.",
        )
        self.admin_activity = ActivityLog.objects.create(
            user=self.admin,
            actor_type="admin",
            action="item_created",
            description="Administrator created an item.",
        )
        self.customer_activity = ActivityLog.objects.create(
            user=self.customer,
            actor_type="user",
            action="item_created",
            description="Customer activity.",
        )

    def _create_vendor(self, user, suffix):
        return Vendor.objects.create(
            user=user,
            surname_name="Activity Test",
            first_name=f"Vendor {suffix}",
            phone_number=f"070000000{suffix}",
            username=f"activityvendor{suffix}",
            email=f"activity-vendor-profile{suffix}@example.com",
            id_number=f"12345678901{suffix}",
            vendor_code=f"ACTIVITY-TEST-{suffix}",
            country="Kenya",
            city="Nairobi",
            address="Market Street",
            address_2="",
            product_type="Handmade",
            is_food="no",
            product_description="Test products",
            company_name=f"Activity Test Shop {suffix}",
            workshop_location="Nairobi",
        )

    def _fetch_activities(self, user, scope):
        request = self.factory.get("/api/activity-logs/", {"scope": scope})
        force_authenticate(request, user=user)
        return get_activity_logs(request)

    def test_vendor_feed_only_contains_that_vendors_actor_records(self):
        response = self._fetch_activities(self.vendor_user, "vendor")

        self.assertEqual(response.status_code, 200)
        returned_ids = {row["id"] for row in response.data}
        self.assertEqual(returned_ids, {self.vendor_activity.id})
        self.assertNotIn(self.other_vendor_activity.id, returned_ids)
        self.assertNotIn(self.admin_activity.id, returned_ids)
        self.assertNotIn(self.customer_activity.id, returned_ids)

    def test_admin_feed_only_contains_admin_actor_records(self):
        response = self._fetch_activities(self.admin, "admin")

        self.assertEqual(response.status_code, 200)
        returned_ids = {row["id"] for row in response.data}
        self.assertEqual(returned_ids, {self.admin_activity.id})

    def test_vendor_cannot_request_admin_activity_scope(self):
        response = self._fetch_activities(self.vendor_user, "admin")
        self.assertEqual(response.status_code, 403)

    def test_vendor_clear_all_only_deletes_own_vendor_activity(self):
        view = ActivityLogViewSet.as_view({"delete": "clear_all_logs"})
        request = self.factory.delete("/api/activity-logs-item/clear-all-logs/")
        force_authenticate(request, user=self.vendor_user)

        response = view(request)

        self.assertEqual(response.status_code, 200)
        self.assertFalse(ActivityLog.objects.filter(pk=self.vendor_activity.pk).exists())
        self.assertTrue(ActivityLog.objects.filter(pk=self.other_vendor_activity.pk).exists())
        self.assertTrue(ActivityLog.objects.filter(pk=self.admin_activity.pk).exists())
        self.assertTrue(ActivityLog.objects.filter(pk=self.customer_activity.pk).exists())

    def test_vendor_can_clear_own_notifications_without_clearing_other_accounts(self):
        own_notification = Notification.objects.create(
            user=self.vendor_user,
            title="Vendor update",
            message="An update for this vendor.",
        )
        other_notification = Notification.objects.create(
            user=self.other_vendor_user,
            title="Other vendor update",
            message="An update for another vendor.",
        )

        view = NotificationDeleteView.as_view()
        request = self.factory.delete("/api/notifications/clear-all/")
        force_authenticate(request, user=self.vendor_user)
        response = view(request)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["deleted_count"], 1)
        self.assertFalse(Notification.objects.filter(pk=own_notification.pk).exists())
        self.assertTrue(Notification.objects.filter(pk=other_notification.pk).exists())

    def test_vendor_cannot_delete_another_accounts_notification(self):
        other_notification = Notification.objects.create(
            user=self.other_vendor_user,
            title="Private update",
            message="Only another vendor should see this.",
        )

        view = NotificationDeleteView.as_view()
        request = self.factory.delete(f"/api/notifications/{other_notification.pk}/")
        force_authenticate(request, user=self.vendor_user)
        response = view(request, notification_id=other_notification.pk)

        self.assertEqual(response.status_code, 404)
        self.assertTrue(Notification.objects.filter(pk=other_notification.pk).exists())
