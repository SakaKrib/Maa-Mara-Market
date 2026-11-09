from django.contrib.auth.models import User
from django.core.cache import cache
from django.test import SimpleTestCase, TestCase, override_settings
from rest_framework.test import APIClient

from core.content_filter import check_text
from core.models import Conversation
from ReactSerializers.models import Item
from shop.models import Review
from vendorDashboard.models import Vendor


class FilterRuleTests(SimpleTestCase):
    def test_normal_text_passes(self):
        for text in ("Lovely basket, arrived quickly!", "Great quality, 5 stars", "Beautiful beadwork from Nairobi"):
            self.assertTrue(check_text(text)[0], text)

    def test_abusive_phrases_blocked_even_when_disguised(self):
        for text in ("go KILL yourself", "k1ll   y0urself", "kiiiill yourself please", "send nudes", "D0UBLE your m0ney"):
            self.assertFalse(check_text(text, allow_contact=True)[0], text)

    def test_contact_details_and_links_blocked_in_public_text_only(self):
        self.assertFalse(check_text("call me 0712 345 678")[0])
        self.assertFalse(check_text("mail me at a@b.com")[0])
        self.assertFalse(check_text("see www.shop-example.com")[0])
        self.assertTrue(check_text("call me 0712 345 678", allow_contact=True)[0])
        self.assertFalse(check_text("http://a.com and http://b.com", allow_contact=True)[0])

    @override_settings(CONTENT_FILTER_EXTRA_TERMS="badword, other thing")
    def test_owner_terms_extend_the_list(self):
        self.assertFalse(check_text("this is a BADWORD")[0])
        self.assertFalse(check_text("some other thing here")[0])

    @override_settings(CONTENT_FILTER_ENABLED=False)
    def test_can_be_switched_off(self):
        self.assertTrue(check_text("go kill yourself")[0])


@override_settings(RATE_LIMITS_ENABLED=False)
class FilterEndpointTests(TestCase):
    def setUp(self):
        cache.clear()
        self.admin = User.objects.create_user("boss", "boss@example.com", "pw", is_staff=True, is_superuser=True)
        self.bob = User.objects.create_user("bob", "bob@example.com", "pw")
        vu = User.objects.create_user("vend", "vend@example.com", "pw")
        vendor = Vendor.objects.create(
            user=vu, surname_name="V", first_name="One", phone_number="0700000000", username="vendone",
            email="vend@example.com", id_number="123456789012", vendor_code="2002", country="Kenya", city="Nairobi",
            address="Market", address_2="", product_type="Handmade", is_food="no", product_description="x",
            company_name="Vend Shop", workshop_location="Nairobi",
        )
        self.item = Item.objects.create(name="Basket", description="d", price=100, in_stock=3, vendor=vendor,
                                        created_by=vu)
        self.client = APIClient()
        self.client.force_authenticate(self.bob)

    def test_review_with_abuse_is_rejected_and_clean_review_saved(self):
        url = f"/api/items/{self.item.pk}/reviews/"
        bad = self.client.post(url, {"rating": 1, "review_text": "go kill yourself seller"}, format="json")
        self.assertEqual(bad.status_code, 400, bad.content)
        self.assertEqual(Review.objects.count(), 0)
        good = self.client.post(url, {"rating": 5, "review_text": "Lovely basket"}, format="json")
        self.assertEqual(good.status_code, 201, good.content)

    def test_support_message_filtered_for_customers_not_for_staff(self):
        convo = Conversation.objects.create(admin=self.admin, participant=self.bob)
        res = self.client.post(f"/api/messaging/conversations/{convo.pk}/messages/", {"body": "send nudes"}, format="multipart")
        self.assertEqual(res.status_code, 400, res.content)
