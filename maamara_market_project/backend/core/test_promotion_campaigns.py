from datetime import timedelta
from decimal import Decimal
from unittest import mock
from uuid import uuid4

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from django.utils import timezone

from core import email_tasks
from core.models import EmailCampaign
from ReactSerializers.models import Item
from shop.models import Banner
from shop.tasks import delete_expired_banners
from vendorDashboard.models import Vendor


def make_item(user, **kwargs):
    return Item.objects.create(
        name=f"Promo {uuid4().hex[:8]}", description="d", created_by=user,
        price=Decimal("1000.00"), in_stock=5, **kwargs,
    )


@override_settings(AUTO_SEND_PROMOTION_CAMPAIGNS=True)
class SaleCampaignTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(username=f"u-{uuid4().hex[:8]}", password="x")

    def test_no_discounts_means_no_campaign(self):
        make_item(self.user)
        self.assertEqual(email_tasks.prepare_daily_sale_campaigns()["drafts_created"], 0)
        self.assertFalse(EmailCampaign.objects.filter(campaign_type="sale").exists())

    def test_all_discounted_items_listed_with_customer_prices_and_sent(self):
        make_item(self.user, discount_price=Decimal("800.00"))
        make_item(self.user, discount_price=Decimal("500.00"))
        make_item(self.user)  # not discounted
        with mock.patch.object(email_tasks.send_email_campaign, "delay") as delay:
            result = email_tasks.prepare_daily_sale_campaigns()
        self.assertEqual(result["items"], 2)
        campaign = EmailCampaign.objects.get(campaign_type="sale")
        self.assertEqual(campaign.status, "approved")
        delay.assert_called_once_with(campaign.pk)
        prices = {i["discount_price"] for i in campaign.content_payload["items"]}
        self.assertEqual(prices, {"1,360", "850"})  # base price x 1.7 markup
        self.assertEqual(campaign.content_payload["items"][0]["percent_off"], 50)

    def test_same_selection_is_not_sent_twice(self):
        make_item(self.user, discount_price=Decimal("800.00"))
        with mock.patch.object(email_tasks.send_email_campaign, "delay"):
            email_tasks.prepare_daily_sale_campaigns()
            EmailCampaign.objects.update(prepared_for_date=timezone.localdate() - timedelta(days=10),
                                         created_at=timezone.now() - timedelta(days=10))
            second = email_tasks.prepare_daily_sale_campaigns()
        self.assertEqual(second["drafts_created"], 0)

    @override_settings(AUTO_SEND_PROMOTION_CAMPAIGNS=False)
    def test_auto_send_can_be_disabled(self):
        make_item(self.user, discount_price=Decimal("800.00"))
        with mock.patch.object(email_tasks.send_email_campaign, "delay") as delay:
            email_tasks.prepare_daily_sale_campaigns()
        delay.assert_not_called()
        self.assertEqual(EmailCampaign.objects.get(campaign_type="sale").status, "draft")


class BannerExpiryTests(TestCase):
    def setUp(self):
        user = get_user_model().objects.create_user(username=f"v-{uuid4().hex[:8]}", password="x")
        self.vendor = Vendor.objects.create(user=user)

    def _banner(self, days, approved=True):
        now = timezone.now()
        banner = Banner.objects.create(
            vendor=self.vendor, title=f"b{days}", background_color="#f5f4f1",
            is_approved=approved, start_date=now - timedelta(days=40),
            end_date=now + timedelta(days=days),
        )
        return banner

    def test_cleanup_deletes_only_expired_banners(self):
        old, live = self._banner(-1), self._banner(5)
        delete_expired_banners()
        self.assertFalse(Banner.objects.filter(pk=old.pk).exists())
        self.assertTrue(Banner.objects.filter(pk=live.pk).exists())

    def test_cleanup_is_scheduled(self):
        from django.conf import settings
        tasks = {v["task"] for v in settings.CELERY_BEAT_SCHEDULE.values()}
        self.assertIn("shop.tasks.delete_expired_banners", tasks)

    def test_expired_banner_never_gets_campaign(self):
        self._banner(-1)
        live = self._banner(5)
        with mock.patch.object(email_tasks.send_email_campaign, "delay"):
            email_tasks.prepare_daily_banner_campaigns()
            email_tasks.prepare_daily_banner_campaigns()
        keys = list(EmailCampaign.objects.filter(campaign_type="banner").values_list("source_key", flat=True))
        self.assertEqual(keys, [f"banner:{live.pk}"])  # once, live banner only

    def test_duration_days_sets_end_date(self):
        from shop.Serializers import BannerSerializer
        ser = BannerSerializer(data={"title": "t", "duration_days": 7})
        ser.is_valid()
        self.assertNotIn("end_date", ser.errors)
        end = ser.validated_data["end_date"]
        self.assertAlmostEqual((end - timezone.now()).total_seconds(), 7 * 86400, delta=60)

    def test_past_end_date_rejected(self):
        from shop.Serializers import BannerSerializer
        ser = BannerSerializer(data={"title": "t", "end_date": (timezone.now() - timedelta(days=1)).isoformat()})
        self.assertFalse(ser.is_valid())
        self.assertIn("end_date", ser.errors)
