from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework.test import APIRequestFactory

from .models import ColorVariant, Item, SizeStock
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
