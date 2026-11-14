from datetime import timedelta

from django.contrib.auth.models import User
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from core.models import SiteContactSettings
from ReactSerializers.models import Category, Department, Item, Section, SubCategory
from vendorDashboard.models import Vendor


class SiteContactTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_user("boss", "b@example.com", "pw", is_staff=True)
        self.user = User.objects.create_user("shopper", "s@example.com", "pw")

    def test_public_get_returns_defaults(self):
        data = self.client.get("/api/site-contact/").json()
        self.assertEqual(data["email"], "maamaramarket@gmail.com")
        self.assertTrue(data["phone"])

    def test_only_admin_can_change(self):
        self.assertIn(self.client.patch("/api/site-contact/", {"email": "x@y.com"}, format="json").status_code, (401, 403))
        self.client.force_authenticate(self.user)
        self.assertEqual(self.client.patch("/api/site-contact/", {"email": "x@y.com"}, format="json").status_code, 403)

    def test_admin_updates_and_validation(self):
        self.client.force_authenticate(self.admin)
        ok = self.client.patch("/api/site-contact/", {"email": "hello@maamara.co.ke", "phone": "+254 700 111 222",
                                                      "location": "Nairobi"}, format="json")
        self.assertEqual(ok.status_code, 200, ok.content)
        self.assertEqual(SiteContactSettings.objects.get().contact_email, "hello@maamara.co.ke")
        self.assertEqual(self.client.get("/api/site-contact/").json()["phone"], "+254 700 111 222")
        self.assertEqual(self.client.patch("/api/site-contact/", {"email": "nope"}, format="json").status_code, 400)
        self.assertEqual(self.client.patch("/api/site-contact/", {"phone": "call me"}, format="json").status_code, 400)


class CollectionsTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        section = Section.objects.create(name="inorganic")
        fashion = Department.objects.create(name="Fashion", section=section)
        sports = Department.objects.create(name="Sports", section=section)
        self.women = Category.objects.create(name="Women", department=fashion)
        self.men = Category.objects.create(name="Men", department=fashion)
        self.dresses = SubCategory.objects.create(name="Dresses", category=self.women)
        SubCategory.objects.create(name="Shirts", category=self.men)
        Category.objects.create(name="Football", department=sports)
        user = User.objects.create_user("v", "v@example.com", "pw")
        self.vendor = Vendor.objects.create(
            user=user, surname_name="V", first_name="One", phone_number="0700000000",
            username="vendone", email="v@example.com", id_number="123456789012", vendor_code="2001",
            country="Kenya", city="Nairobi", address="Market", address_2="", product_type="Handmade",
            is_food="no", product_description="x", company_name="Vend Shop", workshop_location="Nairobi",
        )
        self.user = user

    def make_item(self, category, sub, days_old=0, in_stock=3, available=True):
        item = Item.objects.create(name="Thing", description="d", price=100, in_stock=in_stock, available=available,
                                   category=category, subcategory=sub, vendor=self.vendor, created_by=self.user)
        Item.objects.filter(pk=item.pk).update(created_at=timezone.now() - timedelta(days=days_old))
        return item

    def by_key(self):
        data = self.client.get("/api/collections/").json()
        return {c["key"]: c for c in data["collections"]}

    def test_no_items_means_no_badge(self):
        cols = self.by_key()
        self.assertEqual(set(cols), {"women", "men", "sports"})
        self.assertFalse(any(c["is_new"] for c in cols.values()))

    def test_recent_item_flags_only_its_collection(self):
        self.make_item(self.women, self.dresses, days_old=2)
        cols = self.by_key()
        self.assertTrue(cols["women"]["is_new"])
        self.assertFalse(cols["men"]["is_new"])
        sub = cols["women"]["categories"][0]["subcategories"][0]
        self.assertEqual(sub["new_count"], 1)

    def test_old_unavailable_or_out_of_stock_items_do_not_count(self):
        self.make_item(self.women, self.dresses, days_old=40)
        self.make_item(self.women, self.dresses, days_old=1, in_stock=0)
        self.make_item(self.women, self.dresses, days_old=1, available=False)
        self.assertFalse(self.by_key()["women"]["is_new"])
