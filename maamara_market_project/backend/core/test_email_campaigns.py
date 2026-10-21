from django.contrib.auth.models import User
from django.test import TestCase
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
