from django.contrib.auth.models import User
from django.test import TestCase, override_settings
from django.utils import timezone
from datetime import timedelta
from rest_framework.test import APIClient

from core.models import EmailCampaign, NewsletterSubscriber


class NewsletterConsentTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_subscription_requires_explicit_boolean_consent(self):
        response = self.client.post(
            "/api/newsletter/subscribe/",
            {"email": "no-consent@example.com", "consent": "true"},
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertFalse(NewsletterSubscriber.objects.filter(email="no-consent@example.com").exists())

    def test_subscription_normalizes_email_and_records_consent(self):
        response = self.client.post(
            "/api/newsletter/subscribe/",
            {"email": "  Shopper@Example.com ", "consent": True, "source": "test"},
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        subscriber = NewsletterSubscriber.objects.get(email="shopper@example.com")
        self.assertTrue(subscriber.is_subscribed)
        self.assertIsNotNone(subscriber.consented_at)
        self.assertEqual(subscriber.consent_source, "test")

    def test_unsubscribe_requires_confirmation_post_and_revokes_consent(self):
        subscriber = NewsletterSubscriber.objects.create(
            email="leave@example.com",
            consent_given=True,
            consented_at=timezone.now(),
        )
        url = f"/api/newsletter/unsubscribe/{subscriber.unsubscribe_token}/"
        preview = self.client.get(url)
        self.assertEqual(preview.status_code, 200)
        subscriber.refresh_from_db()
        self.assertTrue(subscriber.is_subscribed)

        response = self.client.post(url, {}, format="json")
        self.assertEqual(response.status_code, 200)
        subscriber.refresh_from_db()
        self.assertFalse(subscriber.is_subscribed)
        self.assertIsNotNone(subscriber.unsubscribed_at)

    def test_invalid_unsubscribe_token_returns_404(self):
        response = self.client.get("/api/newsletter/unsubscribe/00000000-0000-0000-0000-000000000000/")
        self.assertEqual(response.status_code, 404)


class EmailCampaignAuthorizationTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.campaign = EmailCampaign.objects.create(
            title="Test campaign",
            subject="Test subject",
            status="draft",
        )
        self.admin = User.objects.create_user(
            username="campaign-admin",
            email="campaign-admin@example.com",
            password="test-password",
            is_staff=True,
        )
        self.regular_user = User.objects.create_user(
            username="campaign-customer",
            email="campaign-customer@example.com",
            password="test-password",
        )

    def test_campaign_management_requires_admin(self):
        response = self.client.get("/api/admin/email-campaigns/")
        self.assertIn(response.status_code, (401, 403))

        self.client.force_authenticate(user=self.regular_user)
        response = self.client.get("/api/admin/email-campaigns/")
        self.assertEqual(response.status_code, 403)

    def test_admin_can_approve_draft_campaign(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.post(
            f"/api/admin/email-campaigns/{self.campaign.pk}/actions/approve/",
            {},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.campaign.refresh_from_db()
        self.assertEqual(self.campaign.status, "approved")
        self.assertEqual(self.campaign.approved_by, self.admin)

    @override_settings(FRONTEND_URL="https://shop.example.test/")
    def test_admin_can_save_campaign_and_item_destination_is_persisted(self):
        self.client.force_authenticate(user=self.admin)
        payload = {
            "title": "Featured items",
            "subject": "Shop these items",
            "campaign_type": "custom",
            "body_text": "A message for subscribers",
            "cta_label": "Shop now",
            "cta_url": "",
            "content_payload": {
                "items": [
                    {"id": 314, "name": "Featured item", "price": "1200", "image_url": "https://api.example.test/media/item.jpg"}
                ],
                "banner": None,
            },
        }
        response = self.client.post("/api/admin/email-campaigns/", payload, format="json")
        self.assertEqual(response.status_code, 201, response.data)
        saved = EmailCampaign.objects.get(pk=response.data["id"])
        self.assertEqual(saved.status, "draft")
        self.assertEqual(saved.title, "Featured items")
        self.assertEqual(saved.body_text, "A message for subscribers")
        self.assertEqual(saved.cta_url, "https://shop.example.test/item/314")
        self.assertEqual(saved.content_payload["items"][0]["product_url"], "https://shop.example.test/item/314")

    @override_settings(FRONTEND_URL="https://shop.example.test/")
    def test_updating_campaign_persists_content_and_refreshes_item_destination(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.patch(
            f"/api/admin/email-campaigns/{self.campaign.pk}/",
            {
                "title": "Updated campaign",
                "subject": "Updated subject",
                "content_payload": {"items": [{"id": 902, "name": "Second item"}], "banner": None},
                "cta_url": "",
            },
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.data)
        self.campaign.refresh_from_db()
        self.assertEqual(self.campaign.title, "Updated campaign")
        self.assertEqual(self.campaign.content_payload["items"][0]["product_url"], "https://shop.example.test/item/902")
        self.assertEqual(self.campaign.cta_url, "https://shop.example.test/item/902")

    @override_settings(USE_TZ=True)
    def test_approved_campaign_persists_recurring_schedule_settings(self):
        self.client.force_authenticate(user=self.admin)
        self.campaign.status = "approved"
        self.campaign.save(update_fields=["status"])
        future = (timezone.now() + timedelta(days=1)).isoformat()
        response = self.client.post(
            f"/api/admin/email-campaigns/{self.campaign.pk}/actions/schedule/",
            {
                "scheduled_at": future,
                "recurrence": {"frequency": "weekly", "interval": 1, "until": "2027-12-31"},
            },
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.data)
        self.campaign.refresh_from_db()
        self.assertEqual(self.campaign.status, "scheduled")
        self.assertEqual(self.campaign.content_payload["recurrence"]["frequency"], "weekly")
        self.assertEqual(self.campaign.content_payload["recurrence"]["until"], "2027-12-31")

    def test_campaign_cannot_be_scheduled_without_approval(self):
        self.client.force_authenticate(user=self.admin)
        future = (timezone.now() + timedelta(days=1)).isoformat()
        response = self.client.post(
            f"/api/admin/email-campaigns/{self.campaign.pk}/actions/schedule/",
            {"scheduled_at": future},
            format="json",
        )
        self.assertEqual(response.status_code, 409)
        self.campaign.refresh_from_db()
        self.assertEqual(self.campaign.status, "draft")
