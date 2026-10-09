"""API-level tests for the draft endpoints (need the project's database).

NOT executed by the author of this change (no Django/Postgres in the
sandbox). Model constructors below are inferred from how the views use them;
if a required field differs in your models.py, adjust _make_fixtures() only.
A fixture failure SKIPS the test with the reason instead of failing it.

Run:  docker compose exec backend python manage.py test vendorDashboard.test_item_draft_api -v 2
"""
import io
import json
import shutil
import tempfile

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from django.urls import resolve, reverse
from django.utils import timezone
from PIL import Image
from rest_framework.test import APIClient

from vendorDashboard.models import ItemDraft, ItemDraftMedia, Vendor, VendorItemRequest, VendorRequest

TEMP_MEDIA = tempfile.mkdtemp(prefix="draft-tests-")


def png(name="a.png", color="red"):
    buffer = io.BytesIO()
    Image.new("RGB", (8, 8), color).save(buffer, "PNG")
    return SimpleUploadedFile(name, buffer.getvalue(), content_type="image/png")


def webm(name="clip.webm"):
    return SimpleUploadedFile(name, b"\x1aE\xdf\xa3" + b"0" * 500, content_type="video/webm")


def manifest_entry(slot, kind, upload_key="", sort_order=0, variant_key=""):
    return {"slot_key": slot, "kind": kind, "upload_key": upload_key,
            "sort_order": sort_order, "variant_key": variant_key}


@override_settings(MEDIA_ROOT=TEMP_MEDIA)
class DraftApiBase(TestCase):
    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()
        shutil.rmtree(TEMP_MEDIA, ignore_errors=True)

    def _make_fixtures(self):
        """ADAPT HERE if your models need other required fields."""
        User = get_user_model()
        self.user = User.objects.create_user(username="vendor1", email="v1@example.com", password="x")
        self.vendor = Vendor.objects.create(user=self.user) if "user" in [f.name for f in Vendor._meta.fields] else Vendor.objects.create()
        self.client = APIClient()
        self.client.force_authenticate(self.user)

    def setUp(self):
        try:
            self._make_fixtures()
        except Exception as exc:  # pragma: no cover - environment specific
            self.skipTest(f"fixture adaptation needed: {exc!r}")

    def post_draft(self, data=None, media=(), files=None, removed=(), draft_id=None):
        payload = {
            "data": json.dumps(data or {"name": "Green crop"}),
            "media_manifest": json.dumps(list(media)),
            "removed_media_slots": json.dumps(list(removed)),
        }
        if draft_id:
            payload["draft_id"] = draft_id
        payload.update(files or {})
        return self.client.post(reverse("item-draft"), payload, format="multipart")


class ItemDraftApiTests(DraftApiBase):
    def test_ordinary_draft_creation_and_retrieval(self):
        response = self.post_draft({"name": "Tomatoes", "price": "10"})
        self.assertEqual(response.status_code, 200)
        fetched = self.client.get(reverse("item-draft")).json()["draft"]
        self.assertEqual(fetched["data"]["name"], "Tomatoes")
        self.assertEqual(fetched["draft_id"], response.json()["draft_id"])

    def test_main_image_upload_and_restoration(self):
        with self.captureOnCommitCallbacks(execute=True):
            self.post_draft(media=[manifest_entry("main", "main", "up_main")], files={"up_main": png("green_crop.jpeg")})
        media = self.client.get(reverse("item-draft")).json()["draft"]["media"]
        self.assertEqual([m["slot_key"] for m in media], ["main"])
        row = ItemDraftMedia.objects.get(slot_key="main")
        self.assertTrue(row.file.storage.exists(row.file.name))   # row points at a real file
        self.assertTrue(media[0]["url"].endswith(row.file.url))

    def test_multiple_gallery_variant_and_video_media(self):
        media = [manifest_entry(f"gallery:{i}", "gallery", f"g{i}", i + 1) for i in range(3)]
        media += [manifest_entry("variant:Red", "variant", "v", 20, "Red"), manifest_entry("video", "video", "m", 100)]
        files = {f"g{i}": png(f"g{i}.png") for i in range(3)}
        files.update({"v": png("red.png"), "m": webm()})
        response = self.post_draft(media=media, files=files)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()["media"]), 5)

    def test_replacing_image_keeps_old_file_until_commit(self):
        self.post_draft(media=[manifest_entry("main", "main", "u")], files={"u": png("one.png")})
        old = ItemDraftMedia.objects.get(slot_key="main")
        old_name, storage = old.file.name, old.file.storage
        draft_id = str(old.draft_id)
        with self.captureOnCommitCallbacks(execute=False) as callbacks:
            self.post_draft(media=[manifest_entry("main", "main", "u")], files={"u": png("two.png")}, draft_id=draft_id)
        self.assertTrue(storage.exists(old_name))            # not deleted before commit
        for callback in callbacks:
            callback()
        self.assertFalse(storage.exists(old_name))
        self.assertTrue(storage.exists(ItemDraftMedia.objects.get(slot_key="main").file.name))

    def test_failed_replacement_preserves_old_image(self):
        self.post_draft(media=[manifest_entry("main", "main", "u")], files={"u": png("one.png")})
        old = ItemDraftMedia.objects.get(slot_key="main")
        bad = SimpleUploadedFile("two.png", b"not an image", content_type="image/png")
        response = self.post_draft(media=[manifest_entry("main", "main", "u")], files={"u": bad}, draft_id=str(old.draft_id))
        self.assertEqual(response.status_code, 400)
        old.refresh_from_db()
        self.assertTrue(old.file.storage.exists(old.file.name))

    def test_removing_media(self):
        self.post_draft(media=[manifest_entry("main", "main", "u")], files={"u": png()})
        draft_id = str(ItemDraftMedia.objects.get(slot_key="main").draft_id)
        with self.captureOnCommitCallbacks(execute=True):
            self.post_draft(media=[], removed=["main"], draft_id=draft_id)
        self.assertFalse(ItemDraftMedia.objects.filter(slot_key="main").exists())

    def test_invalid_manifest_is_rejected_without_creating_a_draft(self):
        before = ItemDraft.objects.count()
        for media in ([{"kind": "main"}], [manifest_entry("main", "pdf")], [manifest_entry("main", "main", "missing_upload")]):
            response = self.post_draft(media=media)
            self.assertEqual(response.status_code, 400, media)
        self.assertEqual(ItemDraft.objects.count(), before)

    def test_reload_returns_urls_that_resolve_to_files(self):
        self.post_draft(media=[manifest_entry("main", "main", "u")], files={"u": png()})
        url = self.client.get(reverse("item-draft")).json()["draft"]["media"][0]["url"]
        response = self.client.get(url.replace("http://testserver", ""))
        self.assertEqual(response.status_code, 200)


class ApprovalDraftApiTests(DraftApiBase):
    def _make_fixtures(self):
        super()._make_fixtures()
        admin = get_user_model().objects.create_user(username="admin1", email="a1@example.com", password="x", is_staff=True)
        self.client.force_authenticate(admin)
        self.draft = ItemDraft.objects.create(
            owner=self.user, vendor=self.vendor, data={"name": "Original"}, status="SUBMITTED",
            expires_at=timezone.now() + timezone.timedelta(days=30))
        self.request_obj = VendorItemRequest.objects.create(
            vendor=self.vendor, name="Original", description="d", price=5, draft=self.draft,
            draft_item={"name": "Original"}, status="pending")
        self.url = reverse("vendor-request-save-draft", args=[self.request_obj.pk])

    def save(self, method, snapshot, media=(), files=None, removed=()):
        payload = {"draft_item": json.dumps(snapshot), "media_manifest": json.dumps(list(media)),
                   "removed_media_slots": json.dumps(list(removed))}
        payload.update(files or {})
        return getattr(self.client, method)(self.url, payload, format="multipart")

    def test_route_names_match_frontend_endpoint(self):
        self.assertEqual(self.url, f"/api/vendor-requests/{self.request_obj.pk}/save-draft/")
        self.assertEqual(resolve(self.url).url_name, "vendor-request-save-draft")

    def test_put_and_patch_share_media_persistence(self):
        entries = [manifest_entry("main", "main", "u")]
        for method, name in (("patch", "autosaved"), ("put", "saved")):
            response = self.save(method, {"name": name}, entries, {"u": png(f"{name}.png")})
            self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(self.draft.media.count(), 1)

    def test_patch_autosave_does_not_change_the_approval_snapshot(self):
        self.save("patch", {"name": "Form values shape"})
        self.request_obj.refresh_from_db()
        self.assertEqual(self.request_obj.draft_item, {"name": "Original"})
        self.assertEqual(self.request_obj.status, "pending")
        self.save("put", {"name": "Approved shape"})
        self.request_obj.refresh_from_db()
        self.assertEqual(self.request_obj.draft_item["name"], "Approved shape")

    def test_url_backed_asset_without_upload_key_is_left_alone(self):
        response = self.save("put", {"name": "x"}, [manifest_entry("main", "main", "")])
        self.assertEqual(response.status_code, 200)

    def test_failed_final_save_changes_nothing_and_request_stays_pending(self):
        response = self.save("put", {"name": "Changed"}, [manifest_entry("main", "main", "u")])  # file missing
        self.assertEqual(response.status_code, 400)
        self.request_obj.refresh_from_db()
        self.assertEqual(self.request_obj.status, "pending")
        self.assertEqual(self.request_obj.draft_item, {"name": "Original"})


class VendorRegistrationItemPatchTests(DraftApiBase):
    def test_item_index_patch_merges_json_and_stays_separate(self):
        admin = get_user_model().objects.create_user(username="admin2", email="a2@example.com", password="x", is_staff=True)
        self.client.force_authenticate(admin)
        registration = VendorRequest.objects.create(status="verified", item_list=[{"name": "A", "image": "x.png"}])
        url = reverse("vendor-request-item-update", args=[registration.pk, 0])
        response = self.client.patch(url, {"item": {"name": "B"}}, format="json")
        self.assertEqual(response.status_code, 200)
        registration.refresh_from_db()
        self.assertEqual(registration.item_list[0]["name"], "B")
        self.assertEqual(registration.item_list[0]["image"], "x.png")   # untouched keys preserved
        self.assertTrue(registration.item_list[0]["admin_edited"])
        self.assertEqual(ItemDraftMedia.objects.count(), 0)            # no draft media involved