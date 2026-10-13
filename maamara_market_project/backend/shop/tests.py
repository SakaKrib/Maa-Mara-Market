from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase

from ReactSerializers.category_taxonomy import resolve_item_taxonomy
from ReactSerializers.models import Department, Item, Section


class ProductFilterEndpointTests(TestCase):
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
