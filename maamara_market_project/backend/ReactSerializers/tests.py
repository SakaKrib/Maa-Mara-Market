import io
import json
import shutil
import tempfile
from datetime import timedelta

from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from django.utils import timezone
from PIL import Image
from rest_framework.test import APIClient, APIRequestFactory

from vendorDashboard.models import ItemDraft, ItemDraftMedia, Vendor
from .models import (
    Category,
    ColorVariant,
    Department,
    Item,
    ItemAdditionalImage,
    Section,
    SizeStock,
    SubCategory,
)
from .vendors import VendorItemViewSet


class VendorVariantImagePreservationTests(TestCase):
    def test_updating_size_quantity_preserves_existing_variant_image(self):
        user = User.objects.create_user(
            username="variant-test-user",
            password="test-password",
        )
        item = Item.objects.create(
            name="Variant preservation test",
            description="Test item",
            price="100.00",
            in_stock=10,
            created_by=user,
        )
        variant = ColorVariant.objects.create(
            item=item,
            color="Black",
            image="variant_images/existing-black.jpg",
        )
        size = SizeStock.objects.create(
            variant=variant,
            size="M",
            quantity_in_stock=3,
        )

        view = VendorItemViewSet()
        view.request = APIRequestFactory().patch("/api/vendor-items/1/")
        view._current_item = item

        view._update_nested(
            [
                {
                    "id": variant.id,
                    "color": "Black",
                    "sizes": [
                        {
                            "id": size.id,
                            "size": "M",
                            "quantity_in_stock": 9,
                        }
                    ],
                }
            ],
            item.variants.all(),
            ColorVariant,
            parent_field="item",
            nested_field="sizes",
        )

        variant.refresh_from_db()
        size.refresh_from_db()

        self.assertEqual(variant.image.name, "variant_images/existing-black.jpg")
        self.assertEqual(size.quantity_in_stock, 9)


# Keep uploads isolated from the developer's normal media directory.
VENDOR_ITEM_TEST_MEDIA_ROOT = tempfile.mkdtemp(prefix="vendor-item-update-tests-")


def _test_png(name="gallery.png"):
    buffer = io.BytesIO()
    Image.new("RGB", (8, 8), "blue").save(buffer, format="PNG")
    return SimpleUploadedFile(name, buffer.getvalue(), content_type="image/png")


def _test_webm(name="replacement.webm"):
    # The Item video field stores supported uploads; duration validation belongs
    # to the frontend workflow.
    return SimpleUploadedFile(
        name,
        b"test-video-bytes" * 20,
        content_type="video/webm",
    )


@override_settings(MEDIA_ROOT=VENDOR_ITEM_TEST_MEDIA_ROOT)
class VendorItemUpdateRegressionTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="vendor-update-user",
            password="test-password",
        )
        self.vendor = Vendor.objects.create(
            user=self.user,
            surname_name="Update",
            first_name="Test",
            phone_number="+254700000001",
            username="updvendor",
            email="vendor-update@example.com",
            id_number="123456789012",
            vendor_code="VENDOR-UPDATE-TEST",
            product_type="both",
            is_food="no",
            product_description="Test vendor",
            company_name="Update test company",
            workshop_location="Nairobi",
        )

        # Existing departmental items are normalized to "inorganic" in the form.
        self.section = Section.objects.create(name="inorganic")
        self.department = Department.objects.create(
            name="Update Test Department",
            section=self.section,
        )
        self.category = Category.objects.create(
            name="Update Test Category",
            department=self.department,
        )
        self.subcategory = SubCategory.objects.create(
            name="Update Test Subcategory",
            category=self.category,
        )
        self.item = Item.objects.create(
            created_by=self.user,
            vendor=self.vendor,
            section=self.section,
            department=self.department,
            category=self.category,
            subcategory=self.subcategory,
            name="Original item",
            description="Original description",
            price="100.00",
            in_stock=10,
            video="item_videos/original.webm",
        )
        self.variant = ColorVariant.objects.create(
            item=self.item,
            color="Black",
            image="variant_images/existing-black.jpg",
        )
        self.size = SizeStock.objects.create(
            variant=self.variant,
            size="M",
            quantity_in_stock=3,
        )
        self.client = APIClient()
        self.client.force_authenticate(self.user)

    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()
        shutil.rmtree(VENDOR_ITEM_TEST_MEDIA_ROOT, ignore_errors=True)

    def _base_payload(self):
        return {
            "name": "Updated item",
            "description": "Updated description",
            "price": "100.00",
            "in_stock": "12",
            "available": "true",
            "returnable": "true",
            "section": self.section.name,
            "department": self.department.name,
            "category": self.category.name,
            "subcategory": self.subcategory.name,
        }

    def _put_item(self, payload):
        return self.client.put(
            f"/api/item-post/update/{self.item.pk}/",
            payload,
            format="multipart",
        )

    def _existing_variant_payload(self, sizes=None):
        if sizes is None:
            sizes = [{
                "id": self.size.id,
                "size": "M",
                "quantity_in_stock": 3,
            }]
        return json.dumps([{
            "id": self.variant.id,
            "color": "Black",
            "sizes": sizes,
            "image_field": "variant_image_0",
        }])

    def test_omitted_nested_collections_preserve_existing_records(self):
        response = self._put_item(self._base_payload())
        self.assertEqual(response.status_code, 200, response.data)

        self.item.refresh_from_db()
        self.variant.refresh_from_db()
        self.size.refresh_from_db()
        self.assertEqual(self.item.name, "Updated item")
        self.assertTrue(ColorVariant.objects.filter(pk=self.variant.pk).exists())
        self.assertTrue(SizeStock.objects.filter(pk=self.size.pk).exists())
        self.assertEqual(self.variant.image.name, "variant_images/existing-black.jpg")
        self.assertEqual(self.size.quantity_in_stock, 3)

    def test_submitted_variant_update_preserves_variant_and_size_ids(self):
        payload = self._base_payload()
        payload.update({
            "variants": self._existing_variant_payload(sizes=[{
                "id": self.size.id,
                "size": "M",
                "quantity_in_stock": 9,
            }]),
            "size_only_icon": json.dumps([]),
            "kids_sizes": json.dumps([]),
        })

        response = self._put_item(payload)
        self.assertEqual(response.status_code, 200, response.data)

        self.item.refresh_from_db()
        self.variant.refresh_from_db()
        self.size.refresh_from_db()
        self.assertTrue(ColorVariant.objects.filter(pk=self.variant.pk).exists())
        self.assertTrue(SizeStock.objects.filter(pk=self.size.pk).exists())
        self.assertEqual(self.variant.image.name, "variant_images/existing-black.jpg")
        self.assertEqual(self.size.quantity_in_stock, 9)

    def test_explicitly_empty_variant_sizes_removes_size_rows(self):
        payload = self._base_payload()
        payload.update({
            "variants": self._existing_variant_payload(sizes=[]),
            "size_only_icon": json.dumps([]),
            "kids_sizes": json.dumps([]),
        })

        response = self._put_item(payload)
        self.assertEqual(response.status_code, 200, response.data)
        self.assertTrue(ColorVariant.objects.filter(pk=self.variant.pk).exists())
        self.assertFalse(SizeStock.objects.filter(variant=self.variant).exists())

    def test_gallery_and_replacement_video_persist_and_fresh_get_returns_them(self):
        payload = self._base_payload()
        payload.update({
            "variants": self._existing_variant_payload(),
            "size_only_icon": json.dumps([]),
            "kids_sizes": json.dumps([]),
            "gallery_keep_ids": json.dumps([]),
            "gallery_images": _test_png(),
            "video": _test_webm(),
        })

        response = self._put_item(payload)
        self.assertEqual(response.status_code, 200, response.data)

        self.item.refresh_from_db()
        self.variant.refresh_from_db()
        self.size.refresh_from_db()
        gallery = ItemAdditionalImage.objects.get(item=self.item)
        self.assertEqual(self.item.video.name, "item_videos/replacement.webm")
        self.assertTrue(gallery.image.storage.exists(gallery.image.name))
        self.assertEqual(self.variant.image.name, "variant_images/existing-black.jpg")
        self.assertTrue(SizeStock.objects.filter(pk=self.size.pk).exists())

        fresh_response = self.client.get(
            f"/api/item-post/update/{self.item.pk}/"
        )
        self.assertEqual(fresh_response.status_code, 200, fresh_response.data)
        self.assertTrue(
            fresh_response.data["video"].endswith("/media/item_videos/replacement.webm")
        )
        self.assertEqual(len(fresh_response.data["additional_images"]), 1)
        self.assertTrue(
            fresh_response.data["additional_images"][0]["image"].endswith(gallery.image.name)
        )

        # The same current media must be available through both customer-facing
        # data sources: the product detail and homepage listing serializers.
        public_detail = self.client.get(f"/api/items/{self.item.pk}/")
        self.assertEqual(public_detail.status_code, 200, public_detail.data)
        self.assertTrue(
            public_detail.data["video"].endswith("/media/item_videos/replacement.webm")
        )
        self.assertEqual(len(public_detail.data["additional_images"]), 1)

        homepage_response = self.client.get("/api/filtered-items/")
        self.assertEqual(homepage_response.status_code, 200, homepage_response.data)
        homepage_item = next(
            (entry for entry in homepage_response.data["results"] if entry["id"] == self.item.pk),
            None,
        )
        self.assertIsNotNone(homepage_item)
        self.assertTrue(
            homepage_item["video"].endswith("/media/item_videos/replacement.webm")
        )
        self.assertEqual(len(homepage_item["additional_images"]), 1)

    def test_vendor_submit_uses_latest_saved_draft_values_and_media(self):
        draft = ItemDraft.objects.create(
            owner=self.user,
            vendor=self.vendor,
            created_item=self.item,
            expires_at=timezone.now() + timedelta(days=30),
            data={
                "name": "Name from draft",
                "description": "Description from draft",
                "price": "100.00",
                "in_stock": 24,
                "available": True,
                "returnable": False,
                "section": self.section.name,
                "department": self.department.name,
                "category": self.category.name,
                "subcategory": self.subcategory.name,
                "in_offer": False,
                "occasions": [],
                "color_variants": [{
                    "id": self.variant.id,
                    "color": "Black",
                    "color_image": None,
                    "sizes": [{
                        "id": self.size.id,
                        "size": "M",
                        "quantity_in_stock": 17,
                    }],
                }],
                "size_variant": [],
                "kids_sizes": [],
                "shoe_type": "",
                "shoe_gender": "",
                "shoe_size": [],
                "image": None,
                "video": None,
                "gallery_images": [{
                    "slot_key": "gallery:draft",
                    "image": None,
                    "name": "Draft gallery image",
                }],
            },
        )
        media = [
            ("image", "main", "main", _test_png("draft-main.png"), ""),
            ("video", "video", "video", _test_webm("draft-video.webm"), ""),
            ("image", "gallery", "gallery:draft", _test_png("draft-gallery.png"), ""),
            ("image", "variant", "variant:Black", _test_png("draft-variant.png"), "Black"),
        ]
        for index, (media_type, kind, slot_key, upload, variant_key) in enumerate(media):
            ItemDraftMedia.objects.create(
                draft=draft, media_type=media_type, kind=kind, slot_key=slot_key,
                variant_key=variant_key, sort_order=index, file=upload,
            )

        payload = self._base_payload()
        payload.update({
            "name": "Stale request name",
            "description": "Stale request description",
            "in_stock": "2",
            "returnable": "true",
            "variants": self._existing_variant_payload(sizes=[{
                "id": self.size.id, "size": "M", "quantity_in_stock": 3,
            }]),
            "size_only_icon": json.dumps([]),
            "kids_sizes": json.dumps([]),
        })
        response = self._put_item(payload)
        self.assertEqual(response.status_code, 200, response.data)

        self.item.refresh_from_db()
        self.variant.refresh_from_db()
        self.size.refresh_from_db()
        self.assertEqual(self.item.name, "Name from draft")
        self.assertEqual(self.item.description, "Description from draft")
        self.assertEqual(self.item.in_stock, 24)
        self.assertFalse(self.item.returnable)
        self.assertEqual(self.size.quantity_in_stock, 17)
        self.assertTrue(self.item.image.name.endswith("draft-main.png"))
        self.assertTrue(self.item.video.name.endswith("draft-video.webm"))
        self.assertTrue(self.variant.image.name.endswith("draft-variant.png"))
        gallery = ItemAdditionalImage.objects.get(item=self.item)
        self.assertTrue(gallery.image.name.endswith("draft-gallery.png"))

