from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase

from ReactSerializers.category_taxonomy import resolve_item_taxonomy
from ReactSerializers.models import Department, Item, Section


class ProductFilterEndpointTests(TestCase):
    def test_discovery_collection_endpoint_is_registered_and_paginated(self):
        response = self.client.get(
            "/api/discovery-collection/",
            {"section": "trending", "page": 1, "page_size": 12},
        )

        self.assertEqual(
            response.status_code,
            200,
            response.content.decode("utf-8", errors="replace"),
        )
        payload = response.json()
        self.assertIn("count", payload)
        self.assertIn("results", payload)
        self.assertIsInstance(payload["results"], list)

    def test_filters_endpoint_supports_free_text_item_attributes(self):
        response = self.client.get("/filters/")

        self.assertEqual(
            response.status_code,
            200,
            response.content.decode("utf-8", errors="replace"),
        )
        payload = response.json()
        self.assertIn("attributes", payload)
        self.assertIsInstance(payload["attributes"], list)


class DatabaseBackedTaxonomyTests(TestCase):
    def setUp(self):
        user_model = get_user_model()
        self.user = user_model.objects.create_user(
            username="taxonomy-test-user",
            password="test-password",
        )
        self.section, _ = Section.objects.get_or_create(name="inorganic")
        self.department = Department.objects.create(
            name="Taxonomy Test Department",
            section=self.section,
        )

    def test_custom_category_and_subcategory_are_created_and_reused_by_parent(self):
        first = resolve_item_taxonomy(
            section_value="inorganic",
            department_value=self.department.name,
            category_value="Handmade Organizers",
            subcategory_value="Woven Storage",
        )
        second = resolve_item_taxonomy(
            section_value="inorganic",
            department_value=self.department.name,
            category_value=" handmade organizers ",
            subcategory_value="woven storage",
        )

        self.assertEqual(first["category"].pk, second["category"].pk)
        self.assertEqual(first["subcategory"].pk, second["subcategory"].pk)
        self.assertEqual(first["category"].department_id, self.department.pk)
        self.assertEqual(first["subcategory"].category_id, first["category"].pk)

    def test_item_serializer_creates_missing_custom_taxonomy_with_item(self):
        from rest_framework.test import APIRequestFactory
        from ReactSerializers.Serializers import ItemSerializers

        payload = {
            "name": "Serializer-created custom product",
            "description": "Verifies custom taxonomy is created with a submitted item.",
            "price": "990.00",
            "in_stock": "4",
            "available": "true",
            "section": "inorganic",
            "department": self.department.name,
            "category": "Serializer Custom Category",
            "subcategory": "Made to Order",
            "item_attribute": "Custom Finish",
        }
        request = APIRequestFactory().post("/api/item-post/update/", payload, format="multipart")
        request.user = self.user

        serializer = ItemSerializers(data=payload, context={"request": request})
        self.assertTrue(serializer.is_valid(), serializer.errors)
        item = serializer.save(created_by=self.user)
        item.refresh_from_db()

        self.assertEqual(item.category.name, "Serializer Custom Category")
        self.assertEqual(item.category.department_id, self.department.pk)
        self.assertEqual(item.subcategory.name, "Made to Order")
        self.assertEqual(item.subcategory.category_id, item.category_id)
        self.assertEqual(item.section.name, "inorganic")

    def test_same_category_label_can_be_created_under_another_department(self):
        another_department = Department.objects.create(
            name="Second Taxonomy Department",
            section=self.section,
        )

        first = resolve_item_taxonomy(
            section_value="inorganic",
            department_value=self.department.name,
            category_value="Accessories",
        )
        second = resolve_item_taxonomy(
            section_value="inorganic",
            department_value=another_department.name,
            category_value="Accessories",
        )

        self.assertNotEqual(first["category"].pk, second["category"].pk)
        self.assertEqual(first["category"].department_id, self.department.pk)
        self.assertEqual(second["category"].department_id, another_department.pk)

    def test_custom_taxonomy_is_returned_by_filters_and_finds_its_item(self):
        taxonomy = resolve_item_taxonomy(
            section_value="inorganic",
            department_value=self.department.name,
            category_value="Handmade Organizers",
            subcategory_value="Woven Storage",
        )
        item = Item.objects.create(
            section=taxonomy["section"],
            department=taxonomy["department"],
            category=taxonomy["category"],
            subcategory=taxonomy["subcategory"],
            name="Handmade Storage Basket",
            description="A custom-taxonomy regression test item.",
            price=Decimal("1250.00"),
            in_stock=3,
            available=True,
            item_attribute="Hand-carved",
            created_by=self.user,
            slug="taxonomy-test-storage-basket",
        )

        filters_response = self.client.get("/filters/")
        self.assertEqual(filters_response.status_code, 200)
        filters_payload = filters_response.json()

        section_data = next(
            entry for entry in filters_payload["sections"]
            if entry["id"] == taxonomy["section"].pk
        )
        department_data = next(
            entry for entry in section_data["departments"]
            if entry["id"] == self.department.pk
        )
        category_data = next(
            entry for entry in department_data["categories"]
            if entry["id"] == taxonomy["category"].pk
        )
        self.assertEqual(category_data["name"], "Handmade Organizers")
        self.assertEqual(category_data["count"], 1)
        subcategory_data = next(
            entry for entry in category_data["subcategories"]
            if entry["id"] == taxonomy["subcategory"].pk
        )
        self.assertEqual(subcategory_data["count"], 1)
        self.assertIn(
            "Woven Storage",
            [entry["name"] for entry in category_data["subcategories"]],
        )
        self.assertIn("Hand-carved", filters_payload["attributes"])

        products_response = self.client.get(
            "/filter-products/",
            {
                "categories": taxonomy["category"].pk,
                "subcategories": taxonomy["subcategory"].pk,
                "attribute": "Hand-carved",
            },
        )
        self.assertEqual(
            products_response.status_code,
            200,
            products_response.content.decode("utf-8", errors="replace"),
        )
        filtered_ids = [entry["id"] for entry in products_response.json()["results"]]
        self.assertIn(item.pk, filtered_ids)


class HomepageOffersTests(TestCase):
    def setUp(self):
        from django.contrib.auth import get_user_model

        self.user = get_user_model().objects.create_user(username="offers-user", password="x")

    def make(self, name, start_offset, length_days):
        from datetime import timedelta
        from decimal import Decimal

        from django.utils import timezone

        from ReactSerializers.models import Item, Offer

        item = Item.objects.create(
            name=name, description="d", created_by=self.user, price=Decimal("500.00"),
            available=True, in_stock=5,
        )
        start = timezone.now() + timedelta(days=start_offset)
        Offer.objects.create(item=item, discount_percentage=10, start_date=start, end_date=start + timedelta(days=length_days))
        return item

    def fetch(self, **params):
        from rest_framework.test import APIClient

        return APIClient().get("/api/homepage-offers/", params).json()

    def test_items_are_grouped_by_vendor_duration_and_listed_once(self):
        weekly = self.make("weekly item", -1, 7)
        monthly = self.make("monthly item", -1, 30)
        long_one = self.make("long item", -1, 90)
        soon = self.make("soon item", -6, 7)  # ends in about one day
        data = self.fetch()
        groups = {g["key"]: [i["id"] for i in g["items"]] for g in data["groups"]}
        self.assertEqual(groups["ending_soon"], [soon.id])
        self.assertEqual(groups["weekly"], [weekly.id])
        self.assertEqual(groups["monthly"], [monthly.id])
        self.assertEqual(groups["long"], [long_one.id])
        all_ids = [i for ids in groups.values() for i in ids]
        self.assertEqual(len(all_ids), len(set(all_ids)))

    def test_ended_and_future_offers_are_not_shown(self):
        self.make("ended", -10, 5)
        self.make("future", 3, 5)
        self.assertEqual(self.fetch()["groups"], [])

    def test_view_more_pages_a_single_group(self):
        for n in range(5):
            self.make(f"monthly {n}", -1, 20)
        first = self.fetch(group="monthly", limit=2, page=1)["groups"][0]
        second = self.fetch(group="monthly", limit=2, page=2)["groups"][0]
        self.assertEqual((first["total"], len(first["items"]), first["has_more"]), (5, 2, True))
        self.assertFalse({i["id"] for i in first["items"]} & {i["id"] for i in second["items"]})

    def test_unknown_group_is_rejected(self):
        from rest_framework.test import APIClient

        self.assertEqual(APIClient().get("/api/homepage-offers/", {"group": "nope"}).status_code, 400)


class ProductFilterOrganicAndSearchTests(TestCase):
    def setUp(self):
        from django.contrib.auth import get_user_model
        from decimal import Decimal
        from ReactSerializers.models import Category, Department, Item, Section, SubCategory

        user = get_user_model().objects.create_user(username="filter-user", password="x")
        self.organic_section, _ = Section.objects.get_or_create(name="organic")
        self.plain_section, _ = Section.objects.get_or_create(name="inorganic")
        dept = Department.objects.create(name="Fresh Dept", section=self.organic_section)
        self.fresh_cat = Category.objects.create(name="Fresh Fruit", department=dept)
        self.fresh_sub = SubCategory.objects.create(name="Mangoes", category=self.fresh_cat)
        dept2 = Department.objects.create(name="Home Dept", section=self.plain_section)
        self.home_cat = Category.objects.create(name="Buckets", department=dept2)
        make = lambda name, section, category, **kw: Item.objects.create(
            name=name, description="d", created_by=user, price=Decimal("100.00"),
            available=True, in_stock=3, section=section, category=category, **kw,
        )
        self.organic = make("Fresh mangoes", self.organic_section, self.fresh_cat, subcategory=self.fresh_sub)
        self.plain = make("Plastic bucket", self.plain_section, self.home_cat)
        self.other_organic = make("Organic honey", self.organic_section, self.fresh_cat)

    def get(self, **params):
        from rest_framework.test import APIClient

        res = APIClient().get("/filter-products/", params)
        self.assertEqual(res.status_code, 200)
        return {row["id"] for row in res.json()["results"]}

    def test_section_name_filters_organic_section(self):
        self.assertEqual(self.get(section_name="organic"), {self.organic.id, self.other_organic.id})
        self.assertEqual(self.get(sections=str(self.organic_section.id)), {self.organic.id, self.other_organic.id})
        self.assertEqual(len(self.get()), 3)

    def test_search_term_combines_with_section(self):
        self.assertEqual(self.get(q="mangoes"), {self.organic.id})
        self.assertEqual(self.get(q="bucket", section_name="organic"), set())

    def test_results_expose_offer_fields(self):
        from rest_framework.test import APIClient

        row = APIClient().get("/filter-products/").json()["results"][0]
        self.assertIn("in_offer", row)
        self.assertIn("offer", row)

    def test_homepage_organic_lists_only_organic_categories(self):
        from rest_framework.test import APIClient

        data = APIClient().get("/api/homepage-organic/").json()
        self.assertEqual(data["department"], "Organic")
        self.assertEqual([c["id"] for c in data["categories"]], [self.fresh_cat.id])
        self.assertEqual(data["categories"][0]["subcategories"], ["Mangoes"])
        self.assertEqual(data["total_items"], 2)

    def test_homepage_collections_exclude_organic_items(self):
        from rest_framework.test import APIClient

        rows = APIClient().get("/api/homepage-collections/").json()
        ids = {i["id"] for c in rows for i in c["items"]}
        self.assertIn(self.plain.id, ids)
        self.assertFalse(ids & {self.organic.id, self.other_organic.id})
        home = next(c for c in rows if c["id"] == self.home_cat.id)
        self.assertEqual(home["section_id"], self.plain_section.id)
        self.assertEqual(home["department_id"], self.home_cat.department_id)
