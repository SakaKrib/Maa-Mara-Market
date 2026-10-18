import io
import shutil
import tempfile

from django.contrib.auth.models import User
from django.core.files.storage import default_storage
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from PIL import Image
from rest_framework.test import APIRequestFactory, force_authenticate

from vendorDashboard.models import Vendor, VendorRequest
from .models import Brand, Department, Item, Section
from .vendors import approve_vendor


VENDOR_APPROVAL_BRAND_MEDIA_ROOT = tempfile.mkdtemp(
    prefix="vendor-approval-brand-tests-"
)


def _approval_test_png(name="company-logo.png"):
    buffer = io.BytesIO()
    Image.new("RGB", (8, 8), "green").save(buffer, format="PNG")
    return SimpleUploadedFile(
        name,
        buffer.getvalue(),
        content_type="image/png",
    )


@override_settings(MEDIA_ROOT=VENDOR_APPROVAL_BRAND_MEDIA_ROOT)
class VendorApprovalBrandRegressionTests(TestCase):
    def setUp(self):
        self.admin = User.objects.create_superuser(
            username="brand-approval-admin",
            email="brand-approval-admin@example.com",
            password="test-password",
        )
        self.applicant = User.objects.create_user(
            username="brand-approval-applicant",
            email="brand-approval-applicant@example.com",
            password="test-password",
        )
        self.factory = APIRequestFactory()
        self.section = Section.objects.create(name="inorganic")
        Department.objects.create(
            name="Approval Test Department",
            section=self.section,
        )

    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()
        shutil.rmtree(VENDOR_APPROVAL_BRAND_MEDIA_ROOT, ignore_errors=True)

    def _vendor_data(self, brand_name, logo_url=None):
        data = {
            "surname_name": "Approval",
            "first_name": "Applicant",
            "phone_number": "+254700000001",
            "username": "brandapplicant",
            "email": "brand-approval-applicant@example.com",
            "id_number": "123456789012",
            "product_type": "both",
            "is_food": "no",
            "product_description": "Approval test vendor",
            "company_name": "Approval Test Company",
            "workshop_location": "Nairobi",
            "brand": {
                "name": brand_name,
                "description": "Approval test brand",
            },
        }
        if logo_url:
            data["vendor_company_logo"] = logo_url
        return data

    def _item_list(self, submitted_brand_id=None):
        item = {
            "name": "Approval test product",
            "description": "Product submitted with vendor registration",
            "price": "100.00",
            "in_stock": 5,
            "available": True,
            "returnable": True,
            "section": "inorganic",
            "department": "Approval Test Department",
            "category": "Approval Test Category",
            "subcategory": "Approval Test Subcategory",
        }
        if submitted_brand_id is not None:
            # Deliberately submit a different brand. Approval must ignore it.
            item["brand"] = submitted_brand_id
        return [item]

    def _approve(self, vendor_request):
        request = self.factory.post(
            f"/api/vendor-requests/{vendor_request.pk}/approve/",
            {},
            format="multipart",
        )
        force_authenticate(request, user=self.admin)
        return approve_vendor(request, vendor_request.pk)

    def test_approval_assigns_vendor_brand_and_copies_existing_company_logo(self):
        unrelated_brand = Brand.objects.create(name="Unrelated item brand")
        logo_path = default_storage.save(
            "vendor_logos/company-logo.png",
            _approval_test_png(),
        )
        logo_url = default_storage.url(logo_path)
        vendor_request = VendorRequest.objects.create(
            user=self.applicant,
            vendor_data=self._vendor_data("Applicant's Brand", logo_url),
            item_list=self._item_list(unrelated_brand.pk),
            status="verified",
        )

        response = self._approve(vendor_request)

        self.assertEqual(response.status_code, 200, getattr(response, "data", None))
        vendor = Vendor.objects.get(user=self.applicant)
        brand = Brand.objects.get(name="Applicant's Brand")
        item = Item.objects.get(name="Approval test product")

        self.assertEqual(vendor.brand_id, brand.pk)
        self.assertEqual(item.vendor_id, vendor.pk)
        self.assertEqual(item.brand_id, brand.pk)
        self.assertNotEqual(item.brand_id, unrelated_brand.pk)
        self.assertTrue(brand.logo)
        self.assertTrue(default_storage.exists(brand.logo.name))

    def test_approval_does_not_require_a_company_logo(self):
        vendor_request = VendorRequest.objects.create(
            user=self.applicant,
            vendor_data=self._vendor_data("Brand Without Logo"),
            item_list=self._item_list(),
            status="verified",
        )

        response = self._approve(vendor_request)

        self.assertEqual(response.status_code, 200, getattr(response, "data", None))
        brand = Brand.objects.get(name="Brand Without Logo")
        item = Item.objects.get(name="Approval test product")
        self.assertFalse(brand.logo)
        self.assertEqual(item.brand_id, brand.pk)

    def test_approval_rejects_a_brand_owned_by_another_vendor(self):
        existing_brand = Brand.objects.create(name="Already Owned Brand")
        existing_owner_user = User.objects.create_user(
            username="existing-brand-owner",
            email="existing-brand-owner@example.com",
            password="test-password",
        )
        Vendor.objects.create(
            user=existing_owner_user,
            surname_name="Existing",
            first_name="Owner",
            phone_number="+254700000002",
            username="existingowner",
            email="existing-brand-owner@example.com",
            id_number="223456789012",
            product_type="both",
            is_food="no",
            product_description="Existing vendor",
            company_name="Existing Company",
            workshop_location="Nairobi",
            brand=existing_brand,
        )
        vendor_request = VendorRequest.objects.create(
            user=self.applicant,
            vendor_data=self._vendor_data("Already Owned Brand"),
            item_list=self._item_list(),
            status="verified",
        )

        response = self._approve(vendor_request)

        self.assertEqual(response.status_code, 400, getattr(response, "data", None))
        self.assertFalse(Vendor.objects.filter(user=self.applicant).exists())
        self.assertFalse(Item.objects.filter(created_by=self.applicant).exists())
        self.assertEqual(existing_brand.vendor.user_id, existing_owner_user.pk)
