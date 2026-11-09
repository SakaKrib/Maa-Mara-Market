from django.contrib.auth.models import User
from django.core.cache import cache
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from core.models import ContentReport, Conversation, DirectMessage, Notification, UserBlock
from ReactSerializers.models import Item
from shop.models import Review
from vendorDashboard.models import Vendor


@override_settings(RATE_LIMITS_ENABLED=False)
class ModerationTests(TestCase):
    def setUp(self):
        cache.clear()
        self.admin = User.objects.create_user("boss", "boss@example.com", "pw", is_staff=True, is_superuser=True)
        self.alice = User.objects.create_user("alice", "alice@example.com", "pw")
        self.bob = User.objects.create_user("bob", "bob@example.com", "pw")
        self.vendor_user = User.objects.create_user("vend", "vend@example.com", "pw")
        self.vendor = Vendor.objects.create(
            user=self.vendor_user, surname_name="V", first_name="One", phone_number="0700000000",
            username="vendone", email="vend@example.com", id_number="123456789012", vendor_code="2001",
            country="Kenya", city="Nairobi", address="Market", address_2="", product_type="Handmade",
            is_food="no", product_description="x", company_name="Vend Shop", workshop_location="Nairobi",
        )
        self.item = Item.objects.create(
            name="Basket", description="d", price=100, in_stock=3, vendor=self.vendor, created_by=self.vendor_user,
        )
        self.review = Review.objects.create(item=self.item, user=self.bob, rating=1, review_text="rude words")
        self.client = APIClient()

    def report(self, user, **body):
        self.client.force_authenticate(user)
        payload = {"target_type": "review", "target_id": self.review.pk, "reason": "harassment"}
        payload.update(body)
        return self.client.post("/api/moderation/reports/", payload, format="json")

    def test_report_is_stored_with_snapshot_and_admin_notified(self):
        res = self.report(self.alice, details="abusive")
        self.assertEqual(res.status_code, 201, res.content)
        r = ContentReport.objects.get()
        self.assertEqual(r.target_owner, self.bob)
        self.assertIn("rude words", r.snapshot)
        self.assertTrue(Notification.objects.filter(user=self.admin, title="New content report").exists())

    def test_duplicate_open_report_is_not_duplicated(self):
        self.report(self.alice)
        res = self.report(self.alice)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(ContentReport.objects.count(), 1)

    def test_cannot_report_own_content_or_missing_or_bad_reason(self):
        self.assertEqual(self.report(self.bob).status_code, 400)
        self.assertEqual(self.report(self.alice, target_id=99999).status_code, 400)
        self.assertEqual(self.report(self.alice, reason="nope").status_code, 400)
        self.assertEqual(self.report(self.alice, target_type="nope").status_code, 400)

    def test_anonymous_without_visitor_cookie_cannot_report(self):
        self.client.force_authenticate(None)
        res = self.client.post("/api/moderation/reports/", {"target_type": "review", "target_id": self.review.pk,
                                                             "reason": "spam"}, format="json")
        self.assertIn(res.status_code, (401, 403))

    def test_only_admin_sees_and_resolves_reports(self):
        self.report(self.alice)
        rid = ContentReport.objects.get().pk
        self.client.force_authenticate(self.alice)
        self.assertIn(self.client.get("/api/admin/moderation/reports/").status_code, (401, 403))
        self.assertIn(self.client.post(f"/api/admin/moderation/reports/{rid}/resolve/", {"action": "remove"},
                                       format="json").status_code, (401, 403))
        self.client.force_authenticate(self.admin)
        listing = self.client.get("/api/admin/moderation/reports/").json()
        self.assertEqual(listing["open_count"], 1)
        self.assertEqual(listing["sla_hours"], 24)

    def test_remove_hides_review_and_notifies_reporter_and_owner(self):
        self.report(self.alice)
        rid = ContentReport.objects.get().pk
        self.client.force_authenticate(self.admin)
        res = self.client.post(f"/api/admin/moderation/reports/{rid}/resolve/",
                               {"action": "remove", "note": "abuse"}, format="json")
        self.assertEqual(res.status_code, 200, res.content)
        self.review.refresh_from_db()
        self.assertTrue(self.review.moderation_hidden)
        r = ContentReport.objects.get()
        self.assertEqual((r.status, r.action, r.resolved_by), ("actioned", "removed", self.admin))
        self.assertTrue(Notification.objects.filter(user=self.alice, title="Your report was reviewed").exists())
        self.assertTrue(Notification.objects.filter(user=self.bob, title="Content removed").exists())
        self.client.force_authenticate(self.alice)
        listing = self.client.get(f"/api/items/{self.item.pk}/reviews/")
        self.assertEqual(listing.status_code, 200)
        self.assertEqual(len(listing.json().get("results", listing.json())), 0)

    def test_suspend_deactivates_user_but_never_staff(self):
        self.report(self.alice)
        rid = ContentReport.objects.get().pk
        self.client.force_authenticate(self.admin)
        res = self.client.post(f"/api/admin/moderation/reports/{rid}/resolve/", {"action": "remove_suspend"},
                               format="json")
        self.assertEqual(res.status_code, 200)
        self.bob.refresh_from_db()
        self.assertFalse(self.bob.is_active)
        # resolved reports cannot be resolved again
        again = self.client.post(f"/api/admin/moderation/reports/{rid}/resolve/", {"action": "dismiss"}, format="json")
        self.assertEqual(again.status_code, 400)
        # staff are protected
        report = ContentReport.objects.create(reporter=self.alice, target_type="user", target_id=self.admin.pk,
                                              target_owner=self.admin, reason="spam")
        res = self.client.post(f"/api/admin/moderation/reports/{report.pk}/resolve/", {"action": "suspend"},
                               format="json")
        self.assertEqual(res.status_code, 400)
        self.admin.refresh_from_db()
        self.assertTrue(self.admin.is_active)

    def test_dismiss_changes_nothing_and_restore_reverses_removal(self):
        self.report(self.alice)
        rid = ContentReport.objects.get().pk
        self.client.force_authenticate(self.admin)
        self.client.post(f"/api/admin/moderation/reports/{rid}/resolve/", {"action": "remove_suspend"}, format="json")
        res = self.client.post(f"/api/admin/moderation/reports/{rid}/resolve/", {"action": "restore"}, format="json")
        self.assertEqual(res.status_code, 200, res.content)
        self.review.refresh_from_db()
        self.bob.refresh_from_db()
        self.assertFalse(self.review.moderation_hidden)
        self.assertTrue(self.bob.is_active)

    def test_blocking_hides_that_users_reviews_only_for_the_blocker(self):
        self.client.force_authenticate(self.alice)
        res = self.client.post("/api/moderation/blocks/", {"user_id": self.bob.pk}, format="json")
        self.assertEqual(res.status_code, 201)
        mine = self.client.get(f"/api/items/{self.item.pk}/reviews/").json()
        self.assertEqual(len(mine.get("results", mine)), 0)
        self.client.force_authenticate(self.vendor_user)
        theirs = self.client.get(f"/api/items/{self.item.pk}/reviews/").json()
        self.assertEqual(len(theirs.get("results", theirs)), 1)
        self.client.force_authenticate(self.alice)
        self.assertEqual(len(self.client.get("/api/moderation/blocks/").json()), 1)
        self.assertEqual(self.client.delete(f"/api/moderation/blocks/{self.bob.pk}/").status_code, 204)
        back = self.client.get(f"/api/items/{self.item.pk}/reviews/").json()
        self.assertEqual(len(back.get("results", back)), 1)

    def test_cannot_block_self_or_staff(self):
        self.client.force_authenticate(self.alice)
        self.assertEqual(self.client.post("/api/moderation/blocks/", {"user_id": self.alice.pk}, format="json").status_code, 400)
        self.assertEqual(self.client.post("/api/moderation/blocks/", {"user_id": self.admin.pk}, format="json").status_code, 400)
        self.assertEqual(UserBlock.objects.count(), 0)

    def test_hidden_message_is_masked_in_conversation(self):
        convo = Conversation.objects.create(admin=self.admin, participant=self.bob)
        msg = DirectMessage.objects.create(conversation=convo, sender=self.bob, body="insult")
        self.client.force_authenticate(self.admin)
        res = self.client.post("/api/moderation/reports/", {"target_type": "message", "target_id": msg.pk,
                                                             "reason": "harassment"}, format="json")
        self.assertEqual(res.status_code, 201, res.content)
        rid = ContentReport.objects.get().pk
        self.client.post(f"/api/admin/moderation/reports/{rid}/resolve/", {"action": "remove"}, format="json")
        msg.refresh_from_db()
        self.assertTrue(msg.moderation_hidden)

    def test_account_deletion_cleans_blocks_and_report_identity(self):
        from core.account_deletion import anonymise_user
        UserBlock.objects.create(blocker=self.alice, blocked=self.bob)
        self.report(self.alice)
        anonymise_user(self.alice)
        self.assertEqual(UserBlock.objects.count(), 0)
        self.assertIsNone(ContentReport.objects.get().reporter)


class ModerationTasksTests(TestCase):
    def setUp(self):
        self.admin = User.objects.create_user("boss2", "b2@example.com", "pw", is_staff=True, is_superuser=True)

    def test_purge_removes_only_old_resolved_reports(self):
        from datetime import timedelta
        from django.utils import timezone
        from core.moderation_tasks import purge_old_reports

        old = ContentReport.objects.create(target_type="user", target_id=1, reason="spam", status="dismissed",
                                           resolved_at=timezone.now() - timedelta(days=400))
        recent = ContentReport.objects.create(target_type="user", target_id=2, reason="spam", status="dismissed",
                                              resolved_at=timezone.now() - timedelta(days=10))
        still_open = ContentReport.objects.create(target_type="user", target_id=3, reason="spam")
        purge_old_reports()
        remaining = set(ContentReport.objects.values_list("pk", flat=True))
        self.assertEqual(remaining, {recent.pk, still_open.pk})
        self.assertNotIn(old.pk, remaining)

    def test_overdue_reminder_notifies_admins(self):
        from datetime import timedelta
        from django.utils import timezone
        from core.moderation_tasks import remind_overdue_reports

        report = ContentReport.objects.create(target_type="user", target_id=1, reason="spam")
        ContentReport.objects.filter(pk=report.pk).update(created_at=timezone.now() - timedelta(hours=30))
        self.assertEqual(remind_overdue_reports(), 1)
        self.assertTrue(Notification.objects.filter(user=self.admin, title="Reports need review").exists())
