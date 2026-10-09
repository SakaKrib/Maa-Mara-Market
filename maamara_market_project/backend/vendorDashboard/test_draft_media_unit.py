"""Unit tests for vendorDashboard.draft_media (no database needed).

They exercise the real helper with in-memory fakes for the storage backend and
the ItemDraftMedia model, and prove the ordering guarantees:
validate-everything-first, store-new-before-touching-old, delete-old-after-commit.
"""
import io
import json
import unittest
from unittest import mock

from PIL import Image

from vendorDashboard import draft_media
from vendorDashboard.draft_media import (
    DraftMediaError,
    MediaChangeSet,
    parse_media_payload,
    plan_media_changes,
)


# ---------------------------------------------------------------- fakes ---
class FakeStorage:
    def __init__(self):
        self.files = {}

    def exists(self, name):
        return name in self.files

    def delete(self, name):
        self.files.pop(name, None)

    def save_unique(self, name, data):
        base, dot, ext = name.rpartition(".")
        candidate, counter = name, 0
        while candidate in self.files:
            counter += 1
            candidate = f"{base}_{counter}{dot}{ext}"
        self.files[candidate] = data
        return candidate


class FakeFieldFile:
    def __init__(self, storage, name=""):
        self.storage = storage
        self.name = name

    def __bool__(self):
        return bool(self.name)

    def save(self, name, content, save=False):
        self.name = self.storage.save_unique("item_drafts/" + name, b"x")


class FakeAsset:
    """Stands in for ItemDraftMedia."""

    storage = None  # set by the test
    rows = {}       # pk -> committed row state (simulates the database)
    fail_next_save = False
    _next_pk = 1

    def __init__(self, draft=None, slot_key="", **kwargs):
        self.draft = draft
        self.slot_key = slot_key
        self.pk = None
        self.kind = kwargs.get("kind", "")
        self.media_type = kwargs.get("media_type", "")
        self.variant_key = ""
        self.sort_order = 0
        self.file = FakeFieldFile(FakeAsset.storage, kwargs.get("name", ""))

    def save(self, update_fields=None):
        if FakeAsset.fail_next_save:
            FakeAsset.fail_next_save = False
            raise RuntimeError("database write failed")
        if self.pk is None:
            self.pk = FakeAsset._next_pk
            FakeAsset._next_pk += 1
        FakeAsset.rows[self.pk] = (self.slot_key, self.kind, self.file.name)

    def delete(self):
        FakeAsset.rows.pop(self.pk, None)


def png_upload(name="photo.png", size=(8, 8)):
    buffer = io.BytesIO()
    Image.new("RGB", size, "red").save(buffer, "PNG")
    buffer.seek(0)
    buffer.name = name
    buffer.size = len(buffer.getvalue())
    buffer.content_type = "image/png"
    return buffer


def video_upload(name="clip.webm", content_type="video/webm", size=1000):
    buffer = io.BytesIO(b"\x1aE\xdf\xa3" + b"0" * size)
    buffer.name = name
    buffer.size = len(buffer.getvalue())
    buffer.content_type = content_type
    return buffer


def entry(slot, kind="gallery", upload_key="", sort_order=0, variant_key=""):
    return {"slot_key": slot, "kind": kind, "upload_key": upload_key,
            "sort_order": sort_order, "variant_key": variant_key}


class CommitRecorder:
    """Collects transaction.on_commit callbacks so a test can commit or roll back."""

    def __init__(self):
        self.callbacks = []

    def __call__(self, func):
        self.callbacks.append(func)

    def commit(self):
        for callback in self.callbacks:
            callback()
        self.callbacks = []

    def rollback(self):
        self.callbacks = []


class Base(unittest.TestCase):
    def setUp(self):
        self.storage = FakeStorage()
        FakeAsset.storage = self.storage
        FakeAsset.rows = {}
        FakeAsset.fail_next_save = False
        self.commit = CommitRecorder()
        patcher = mock.patch.object(draft_media.transaction, "on_commit", self.commit)
        patcher.start()
        self.addCleanup(patcher.stop)

    def persisted(self, slot, kind="main", filename="item_drafts/old.png"):
        self.storage.files[filename] = b"old"
        asset = FakeAsset(slot_key=slot, kind=kind,
                          media_type="video" if kind == "video" else "image", name=filename)
        asset.save()
        return asset


# ------------------------------------------------------------- payload ---
class ParsePayloadTests(unittest.TestCase):
    def test_valid_payload(self):
        manifest, removed = parse_media_payload(
            json.dumps([entry("main", "main", "k", 0)]), json.dumps(["gallery:1"]))
        self.assertEqual(manifest[0]["slot_key"], "main")
        self.assertEqual(removed, {"gallery:1"})

    def test_invalid_json_and_shapes_are_rejected(self):
        for manifest, removed in [
            ("not json", "[]"), ("{}", "[]"), ("[]", "not json"), ("[]", "{}"),
            (json.dumps(["str"]), "[]"),
            (json.dumps([{"kind": "main"}]), "[]"),                       # no slot_key
            (json.dumps([{"slot_key": "a", "kind": "pdf"}]), "[]"),      # bad kind
            (json.dumps([entry("a"), entry("a")]), "[]"),                # duplicate slot
            (json.dumps([{"slot_key": "a", "kind": "main", "sort_order": "x"}]), "[]"),
        ]:
            with self.assertRaises(DraftMediaError, msg=(manifest, removed)):
                parse_media_payload(manifest, removed)


# ---------------------------------------------------------------- plan ---
class PlanTests(Base):
    def test_new_slot_without_file_is_rejected(self):
        manifest, removed = parse_media_payload(json.dumps([entry("main", "main", "up_main")]), "[]")
        with self.assertRaises(DraftMediaError):
            plan_media_changes({}, manifest, removed, {})

    def test_blank_upload_key_for_unknown_slot_is_ignored_when_allowed(self):
        manifest, removed = parse_media_payload(json.dumps([entry("main", "main", "")]), "[]")
        plan = plan_media_changes({}, manifest, removed, {}, ignore_blank_upload_for_new=True)
        self.assertEqual(plan.uploads, [])

    def test_existing_slot_without_file_is_kept(self):
        existing = {"main": self.persisted("main")}
        manifest, removed = parse_media_payload(json.dumps([entry("main", "main", "k")]), "[]")
        plan = plan_media_changes(existing, manifest, removed, {})
        self.assertEqual(plan.removed, set())
        self.assertEqual(len(plan.keep), 1)

    def test_prune_unlisted_removes_missing_slots_only_for_full_saves(self):
        existing = {"main": self.persisted("main"), "gallery:1": self.persisted("gallery:1", "gallery", "item_drafts/g.png")}
        manifest, removed = parse_media_payload(json.dumps([entry("main", "main", "k")]), "[]")
        self.assertEqual(plan_media_changes(existing, manifest, removed, {}).removed, set())
        self.assertEqual(
            plan_media_changes(existing, manifest, removed, {}, prune_unlisted=True).removed,
            {"gallery:1"})

    def test_listed_slot_beats_removal_entry(self):
        existing = {"main": self.persisted("main")}
        manifest, removed = parse_media_payload(json.dumps([entry("main", "main", "k")]), json.dumps(["main"]))
        self.assertEqual(plan_media_changes(existing, manifest, removed, {}).removed, set())

    def test_image_limit_counts_existing_plus_new_minus_removed(self):
        existing = {f"gallery:{i}": self.persisted(f"gallery:{i}", "gallery", f"item_drafts/{i}.png") for i in range(10)}
        manifest, removed = parse_media_payload(
            json.dumps([entry(f"gallery:{i}", "gallery", "k") for i in range(10)] + [entry("main", "main", "up")]), "[]")
        with self.assertRaises(DraftMediaError):
            plan_media_changes(existing, manifest, removed, {"up": png_upload()})
        # removing one makes room
        manifest, removed = parse_media_payload(
            json.dumps([entry(f"gallery:{i}", "gallery", "k") for i in range(10)] + [entry("main", "main", "up")]),
            json.dumps(["gallery:0"]))
        manifest = [m for m in manifest if m["slot_key"] != "gallery:0"]
        plan_media_changes(existing, manifest, removed, {"up": png_upload()})

    def test_second_video_is_rejected(self):
        existing = {"video": self.persisted("video", "video", "item_drafts/v.webm")}
        manifest, removed = parse_media_payload(
            json.dumps([entry("video", "video", "k"), entry("video2", "video", "up")]), "[]")
        with self.assertRaises(DraftMediaError):
            plan_media_changes(existing, manifest, removed, {"up": video_upload()})

    def test_invalid_image_bytes_are_rejected_before_anything_changes(self):
        bad = io.BytesIO(b"not an image"); bad.name = "x.png"; bad.size = 12; bad.content_type = "image/png"
        existing = {"main": self.persisted("main")}
        manifest, removed = parse_media_payload(json.dumps([entry("main", "main", "up")]), "[]")
        with self.assertRaises(DraftMediaError):
            plan_media_changes(existing, manifest, removed, {"up": bad})
        self.assertIn("item_drafts/old.png", self.storage.files)  # untouched

    def test_video_must_be_allowed_type_and_extension(self):
        for upload in (video_upload("clip.avi"), video_upload("clip.webm", "video/x-msvideo")):
            manifest, removed = parse_media_payload(json.dumps([entry("video", "video", "up")]), "[]")
            with self.assertRaises(DraftMediaError):
                plan_media_changes({}, manifest, removed, {"up": upload})


# --------------------------------------------------------------- apply ---
class ApplyTests(Base):
    def run_change(self, existing, entries, files, removed=(), prune=False):
        manifest, removed_slots = parse_media_payload(json.dumps(entries), json.dumps(list(removed)))
        plan = plan_media_changes(existing, manifest, removed_slots, files, prune_unlisted=prune)
        changes = MediaChangeSet(draft=object(), plan=plan, existing=existing, media_model=FakeAsset)
        changes.apply()
        return changes

    def test_main_image_upload_creates_row_and_file(self):
        existing = {}
        self.run_change(existing, [entry("main", "main", "up", 0)], {"up": png_upload("green_crop.jpeg")})
        self.assertEqual(len(FakeAsset.rows), 1)
        (slot, kind, name), = FakeAsset.rows.values()
        self.assertEqual((slot, kind), ("main", "main"))
        self.assertIn(name, self.storage.files)           # row never points at a missing file

    def test_multiple_gallery_images_append(self):
        existing = {}
        files = {f"u{i}": png_upload(f"g{i}.png") for i in range(5)}
        self.run_change(existing, [entry(f"gallery:{i}", "gallery", f"u{i}", i + 1) for i in range(5)], files)
        self.assertEqual(sorted(existing), [f"gallery:{i}" for i in range(5)])
        self.assertEqual(len(self.storage.files), 5)

    def test_variant_and_video_slots(self):
        existing = {}
        self.run_change(existing, [entry("variant:Red", "variant", "v", 20, "Red"), entry("video", "video", "m", 100)],
                        {"v": png_upload("red.png"), "m": video_upload()})
        self.assertEqual(existing["variant:Red"].variant_key, "Red")
        self.assertEqual(existing["video"].media_type, "video")

    def test_replacement_keeps_old_file_until_commit_then_deletes_it(self):
        old = self.persisted("main")
        existing = {"main": old}
        self.run_change(existing, [entry("main", "main", "up")], {"up": png_upload("new.png")})
        self.assertIn("item_drafts/old.png", self.storage.files)   # still there before commit
        new_name = existing["main"].file.name
        self.assertNotEqual(new_name, "item_drafts/old.png")
        self.commit.commit()
        self.assertNotIn("item_drafts/old.png", self.storage.files)
        self.assertIn(new_name, self.storage.files)

    def test_replacement_with_same_filename_never_overwrites_old_file(self):
        old = self.persisted("main", filename="item_drafts/green_crop.jpeg")
        existing = {"main": old}
        self.run_change(existing, [entry("main", "main", "up")], {"up": png_upload("green_crop.jpeg")})
        self.assertNotEqual(existing["main"].file.name, "item_drafts/green_crop.jpeg")
        self.assertIn("item_drafts/green_crop.jpeg", self.storage.files)

    def test_failed_replacement_preserves_old_file_and_removes_new_file(self):
        old = self.persisted("main")
        existing = {"main": old}
        FakeAsset.fail_next_save = True
        with self.assertRaises(RuntimeError):
            self.run_change(existing, [entry("main", "main", "up")], {"up": png_upload("new.png")})
        self.assertEqual(list(self.storage.files), ["item_drafts/old.png"])  # old kept, new cleaned up
        self.commit.rollback()  # the transaction rolled back: no deferred deletion ever runs
        self.assertIn("item_drafts/old.png", self.storage.files)

    def test_rollback_after_apply_never_deletes_superseded_files(self):
        old = self.persisted("main")
        existing = {"main": old}
        changes = self.run_change(existing, [entry("main", "main", "up")], {"up": png_upload("new.png")})
        changes.abort()          # something later in the request failed
        self.commit.rollback()   # transaction rolled back
        self.assertEqual(list(self.storage.files), ["item_drafts/old.png"])

    def test_removal_deletes_file_only_after_commit(self):
        existing = {"gallery:1": self.persisted("gallery:1", "gallery", "item_drafts/g1.png")}
        self.run_change(existing, [], {}, removed=["gallery:1"])
        self.assertNotIn("gallery:1", existing)
        self.assertEqual(FakeAsset.rows, {})
        self.assertIn("item_drafts/g1.png", self.storage.files)
        self.commit.commit()
        self.assertNotIn("item_drafts/g1.png", self.storage.files)

    def test_storage_failure_leaves_existing_media_intact(self):
        old = self.persisted("main")
        existing = {"main": old}
        manifest, removed = parse_media_payload(json.dumps([entry("main", "main", "up")]), "[]")
        plan = plan_media_changes(existing, manifest, removed, {"up": png_upload()})
        with mock.patch.object(FakeFieldFile, "save", side_effect=OSError("disk full")):
            with self.assertRaises(OSError):
                MediaChangeSet(object(), plan, existing, FakeAsset).apply()
        self.assertEqual(list(self.storage.files), ["item_drafts/old.png"])
        self.assertEqual(old.file.name, "item_drafts/old.png")


if __name__ == "__main__":
    unittest.main()