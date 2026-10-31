from datetime import timedelta
from decimal import Decimal
from unittest.mock import patch
from uuid import uuid4

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from ReactSerializers.models import Item, ItemView, Offer
from ReactSerializers.offer_tasks import expire_finished_offers
from ReactSerializers.Serializers import OfferSerializer


def make_item(user, **kwargs):
    return Item.objects.create(
        name=f"Offer test {uuid4().hex[:8]}",
        description="Test item",
        created_by=user,
        price=Decimal("1000.00"),
        **kwargs,
    )


class OfferDurationTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(username=f"u-{uuid4().hex[:8]}", password="x")

    def test_duration_sets_end_date_from_start(self):
        item = make_item(self.user)
        start = timezone.now()
        offer = Offer.objects.create(item=item, discount_percentage=20, start_date=start, end_date=start, duration_days=30)
        self.assertEqual(offer.end_date, start + timedelta(days=30))

    def test_serializer_accepts_duration_without_end_date(self):
        start = timezone.now()
        serializer = OfferSerializer(data={"discount_percentage": 10, "start_date": start.isoformat(), "duration_days": 7})
        self.assertTrue(serializer.is_valid(), serializer.errors)
        self.assertEqual(serializer.validated_data["end_date"], serializer.validated_data["start_date"] + timedelta(days=7))

    def test_serializer_needs_duration_or_end_date(self):
        serializer = OfferSerializer(data={"discount_percentage": 10, "start_date": timezone.now().isoformat()})
        self.assertFalse(serializer.is_valid())
        self.assertIn("end_date", serializer.errors)

    def test_expired_offer_returns_item_to_original_price(self):
        item = make_item(self.user)
        start = timezone.now() - timedelta(days=10)
        Offer.objects.create(item=item, discount_percentage=50, start_date=start, end_date=start + timedelta(days=5))
        item.refresh_from_db()
        self.assertEqual(item.in_offer, True)
        # Even before the clean-up job runs, the effective price is the normal one.
        self.assertEqual(item.get_current_price(), Decimal("1000.00"))

        self.assertEqual(expire_finished_offers(), 1)
        item.refresh_from_db()
        self.assertFalse(item.in_offer)
        self.assertIsNone(item.discount_price)
        self.assertFalse(Offer.objects.filter(item=item).exists())
        self.assertEqual(item.get_current_price(), Decimal("1000.00"))

    def test_expiry_restores_the_items_own_earlier_discount(self):
        item = make_item(self.user, discount_price=Decimal("900.00"))
        start = timezone.now() - timedelta(days=3)
        Offer.objects.create(item=item, discount_percentage=50, start_date=start, end_date=start + timedelta(days=1))
        expire_finished_offers()
        item.refresh_from_db()
        self.assertEqual(item.discount_price, Decimal("900.00"))
        self.assertFalse(item.in_offer)

    def test_running_offer_is_not_ended(self):
        item = make_item(self.user)
        start = timezone.now() - timedelta(days=1)
        Offer.objects.create(item=item, discount_percentage=20, start_date=start, end_date=start, duration_days=30)
        self.assertEqual(expire_finished_offers(), 0)
        item.refresh_from_db()
        self.assertTrue(item.in_offer)
        self.assertEqual(item.get_current_price(), Decimal("800.00"))


class ItemInsightsTests(TestCase):
    def setUp(self):
        cache.clear()
        self.staff = get_user_model().objects.create_user(username=f"s-{uuid4().hex[:8]}", password="x", is_staff=True)
        self.other = get_user_model().objects.create_user(username=f"o-{uuid4().hex[:8]}", password="x")
        self.item = make_item(self.staff)
        self.client = APIClient()

    def test_requires_login(self):
        self.assertEqual(self.client.get(f"/api/items/{self.item.id}/insights/").status_code, 401)

    def test_other_users_cannot_see_the_item_numbers(self):
        self.client.force_authenticate(self.other)
        self.assertEqual(self.client.get(f"/api/items/{self.item.id}/insights/").status_code, 403)

    def test_report_for_item_with_views_but_no_sales(self):
        for _ in range(3):
            ItemView.objects.create(item=self.item, visitor_id=uuid4().hex)
        self.client.force_authenticate(self.staff)
        response = self.client.get(f"/api/items/{self.item.id}/insights/?days=30")
        self.assertEqual(response.status_code, 200, response.content)
        body = response.json()
        self.assertEqual(len(body["series"]), 30)
        self.assertEqual(body["metrics"]["status"], "not_moving")
        self.assertEqual(body["metrics"]["views"], 3)

    @override_settings(GEMINI_API_KEY="")
    def test_ai_reports_not_configured_cleanly(self):
        self.client.force_authenticate(self.staff)
        self.assertEqual(self.client.post(f"/api/items/{self.item.id}/insights/ai/", {}, format="json").status_code, 503)

    @override_settings(GEMINI_API_KEY="test-key")
    @patch("ReactSerializers.item_insights._call_gemini")
    def test_ai_suggestions_are_cleaned_and_cached(self, call):
        call.return_value = (
            {
                "verdict": "Slow",
                "why": ["Few views"],
                "recommendations": [
                    {"type": "offer", "title": "Run a discount", "detail": "x", "impact": "high",
                     "suggested_discount_percent": 15, "suggested_offer_days": 14},
                    {"type": "price", "title": "Absurd", "detail": "y", "suggested_price": 999999},
                ],
                "market_notes": [],
            },
            [{"title": "Shop", "url": "https://example.com/a"}],
        )
        self.client.force_authenticate(self.staff)
        url = f"/api/items/{self.item.id}/insights/ai/"
        first = self.client.post(url, {}, format="json")
        self.assertEqual(first.status_code, 200, first.content)
        recs = first.json()["recommendations"]
        self.assertEqual(recs[0]["suggested_offer_days"], 14)
        self.assertNotIn("suggested_price", recs[1])  # implausible price dropped
        second = self.client.post(url, {}, format="json")
        self.assertTrue(second.json()["cached"])
        self.assertEqual(call.call_count, 1)


class ItemCreateWithOfferTests(TestCase):
    """Regression: the create view used to remove the offer before the serializer saw it."""

    def setUp(self):
        from rest_framework.test import APIClient
        from vendorDashboard.models import Vendor

        User = get_user_model()
        self.admin = User.objects.create_user(username=f"a-{uuid4().hex[:8]}", password="x", is_staff=True)
        self.vendor_user = User.objects.create_user(username=f"v-{uuid4().hex[:8]}", password="x")
        self.vendor = Vendor.objects.create(user=self.vendor_user)
        self.client = APIClient()
        self.client.force_authenticate(self.admin)
        from ReactSerializers.models import Category, Department, Section, SubCategory

        section, _ = Section.objects.get_or_create(name="inorganic")
        department = Department.objects.create(name="Offer Test Dept", section=section)
        category = Category.objects.create(name="Offer Test Cat", department=department)
        SubCategory.objects.create(name="Offer Test Sub", category=category)

    def test_item_marked_on_offer_is_created_with_its_offer(self):
        import json
        from datetime import date

        res = self.client.post(
            "/api/item-post/update/",
            {
                "vendor_id": str(self.vendor.pk),
                "name": f"Offer item {uuid4().hex[:6]}",
                "description": "Created on offer",
                "price": "1000",
                "in_stock": "4",
                "section": "inorganic",
                "department": "Offer Test Dept",
                "category": "Offer Test Cat",
                "subcategory": "Offer Test Sub",
                "in_offer": "true",
                "offer": json.dumps({
                    "discount_percentage": 20,
                    "start_date": date.today().isoformat(),
                    "duration_days": 7,
                }),
            },
            format="multipart",
        )
        self.assertNotIn("offer", res.data if isinstance(res.data, dict) else {}, res.data)
        self.assertEqual(res.status_code, 201, res.data)
        item = Item.objects.get(pk=res.data["id"])
        self.assertTrue(item.in_offer)
        self.assertEqual(item.offer.discount_percentage, Decimal("20"))
        self.assertEqual(item.discount_price, Decimal("800.00"))
