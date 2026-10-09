"""Safe, shared persistence of ItemDraftMedia.

Used by ItemDraftView (vendor / admin-create drafts) and
VendorItemRequestDraftUpdateView (admin approval drafts) so both follow the
same ordering rules:

1. Parse and validate the WHOLE payload (manifest, removals, every upload,
   image/video counts) before anything is stored or deleted.
2. Store every new file first, under a fresh unique name. A replacement never
   overwrites or deletes the file it supersedes.
3. Swap the database rows.
4. Delete superseded / removed files only AFTER the transaction commits
   (transaction.on_commit). A rollback therefore never leaves a row that
   points at a file that was already deleted, and a failed replacement keeps
   the previous valid file.
5. If anything fails after new files were stored, those new files are deleted
   (they are not referenced by any committed row).

Database transactions do not roll back filesystem operations, so the order
above is what keeps rows and files consistent.
"""
import json
import os

from django.db import transaction

VALID_KINDS = {"main", "gallery", "variant", "video"}
MAX_IMAGES = 10
MAX_IMAGE_BYTES = 10 * 1024 * 1024
MAX_VIDEO_BYTES = 100 * 1024 * 1024
MAX_MEGAPIXELS = 25_000_000
ALLOWED_VIDEO_EXTENSIONS = {".mp4", ".mov", ".webm"}
ALLOWED_VIDEO_TYPES = {"video/mp4", "video/quicktime", "video/webm"}


class DraftMediaError(Exception):
    """A client-correctable problem with the submitted media payload."""

    def __init__(self, message, status=400):
        super().__init__(message)
        self.message = message
        self.status = status


def validate_upload(uploaded, kind):
    """Validate one uploaded file. Raises ValueError with a user message."""
    if kind in {"main", "gallery", "variant"}:
        if uploaded.size > MAX_IMAGE_BYTES:
            raise ValueError("Each image must be 10 MB or smaller.")
        from PIL import Image  # local import keeps the pure helpers importable

        try:
            uploaded.seek(0)
            with Image.open(uploaded) as image:
                image.verify()
            uploaded.seek(0)
            with Image.open(uploaded) as image:
                if image.width * image.height > MAX_MEGAPIXELS:
                    raise ValueError("Images must not exceed 25 megapixels.")
        except ValueError:
            uploaded.seek(0)
            raise
        except Exception:
            uploaded.seek(0)
            raise ValueError("The uploaded file is not a valid image.")
        uploaded.seek(0)
        return

    if kind == "video":
        if uploaded.size > MAX_VIDEO_BYTES:
            raise ValueError("The product video must be 100 MB or smaller.")
        extension = os.path.splitext(uploaded.name or "")[1].lower()
        if extension not in ALLOWED_VIDEO_EXTENSIONS:
            raise ValueError("Video must be MP4, MOV, or WEBM.")
        if uploaded.content_type and uploaded.content_type not in ALLOWED_VIDEO_TYPES:
            raise ValueError("The uploaded video type is not supported.")
        return

    raise ValueError("Unsupported draft media type.")


def _load_json_list(raw, label):
    if isinstance(raw, (bytes, bytearray)):
        raw = raw.decode("utf-8", errors="replace")
    if isinstance(raw, str):
        try:
            raw = json.loads(raw)
        except (TypeError, ValueError):
            raise DraftMediaError(f"{label} must contain valid JSON.")
    if not isinstance(raw, list):
        raise DraftMediaError(f"{label} must be a list.")
    return raw


def parse_media_payload(raw_manifest, raw_removed):
    """Return (manifest, removed_slots) with every entry validated.

    Invalid entries are rejected instead of being silently skipped, so a
    malformed manifest can never be mistaken for "nothing to keep" and cause
    stored media to be pruned.
    """
    entries = _load_json_list(raw_manifest if raw_manifest is not None else "[]",
                              "media_manifest")
    removed_raw = _load_json_list(raw_removed if raw_removed is not None else "[]",
                                  "removed_media_slots")

    manifest = []
    seen = set()
    for index, entry in enumerate(entries):
        if not isinstance(entry, dict):
            raise DraftMediaError(f"media_manifest[{index}] must be an object.")
        slot_key = str(entry.get("slot_key") or "").strip()
        kind = str(entry.get("kind") or "").strip()
        if not slot_key:
            raise DraftMediaError(f"media_manifest[{index}] is missing slot_key.")
        if kind not in VALID_KINDS:
            raise DraftMediaError(
                f"media_manifest[{index}] has an unsupported kind '{kind}'."
            )
        if slot_key in seen:
            raise DraftMediaError(f"media_manifest lists slot '{slot_key}' twice.")
        seen.add(slot_key)
        try:
            sort_order = int(entry.get("sort_order") or 0)
        except (TypeError, ValueError):
            raise DraftMediaError(
                f"media_manifest[{index}] has a non-numeric sort_order."
            )
        manifest.append({
            "slot_key": slot_key,
            "kind": kind,
            "variant_key": str(entry.get("variant_key") or ""),
            "sort_order": sort_order,
            "upload_key": str(entry.get("upload_key") or "").strip(),
        })

    removed = {str(slot).strip() for slot in removed_raw if str(slot).strip()}
    return manifest, removed


class MediaPlan:
    def __init__(self, removed, uploads, keep, projected):
        self.removed = removed      # slot keys whose rows/files go away
        self.uploads = uploads      # [(entry, uploaded_file)]
        self.keep = keep            # entries for existing slots (metadata only)
        self.projected = projected  # slot -> (kind, media_type) after the save


def plan_media_changes(existing, manifest, removed, files, *,
                       prune_unlisted=False, ignore_blank_upload_for_new=False):
    """Validate everything and decide what will change. Mutates nothing.

    existing: {slot_key: obj with .kind and .media_type}
    files:    request.FILES (mapping of upload_key -> uploaded file)
    prune_unlisted: a full save - persisted media missing from the manifest
        is removed (the manifest is the complete current media set).
    ignore_blank_upload_for_new: an entry for an unknown slot with no
        upload_key is an asset that exists only as a URL inside the JSON
        snapshot (not a draft media row); it is left alone instead of being
        rejected.
    """
    listed = {entry["slot_key"] for entry in manifest}
    # A slot that is listed is kept or replaced; the manifest wins over a
    # simultaneous removal entry for the same slot.
    removed_final = set(removed) - listed
    if prune_unlisted:
        removed_final |= set(existing) - listed
    removed_final &= set(existing)

    uploads = []
    keep = []
    for entry in manifest:
        slot_key = entry["slot_key"]
        upload_key = entry["upload_key"]
        uploaded = files.get(upload_key) if upload_key else None

        if uploaded is None:
            if slot_key in existing:
                keep.append(entry)
                continue
            if ignore_blank_upload_for_new and not upload_key:
                continue
            raise DraftMediaError(
                f"Missing uploaded file for new media slot '{slot_key}'."
            )

        try:
            validate_upload(uploaded, entry["kind"])
        except ValueError as exc:
            raise DraftMediaError(str(exc))
        uploads.append((entry, uploaded))

    projected = {
        slot: (asset.kind, asset.media_type)
        for slot, asset in existing.items()
        if slot not in removed_final
    }
    for entry, _ in uploads:
        projected[entry["slot_key"]] = (
            entry["kind"], "video" if entry["kind"] == "video" else "image"
        )

    if sum(1 for _, media_type in projected.values() if media_type == "image") > MAX_IMAGES:
        raise DraftMediaError(
            f"An item can contain at most {MAX_IMAGES} images, including the "
            "main and variant images."
        )
    if sum(1 for kind, _ in projected.values() if kind == "video") > 1:
        raise DraftMediaError("An item can contain only one product video.")

    return MediaPlan(removed_final, uploads, keep, projected)


def _delete_files(storage, names):
    for name in names:
        try:
            if name and storage.exists(name):
                storage.delete(name)
        except Exception:  # cleanup must never turn a saved draft into an error
            pass


class MediaChangeSet:
    """Applies a MediaPlan with the ordering described in the module docstring.

    Call apply() inside the request's transaction. If anything after apply()
    can still fail, call abort() so newly stored files are not left orphaned.
    """

    def __init__(self, draft, plan, existing, media_model):
        self.draft = draft
        self.plan = plan
        self.existing = existing
        self.media_model = media_model
        self.new_names = []
        self.storage = None

    def apply(self):
        superseded = []
        try:
            # 1. Store new files (nothing existing is touched yet).
            staged = []
            for entry, uploaded in self.plan.uploads:
                asset = self.existing.get(entry["slot_key"])
                if asset is None:
                    asset = self.media_model(draft=self.draft, slot_key=entry["slot_key"])
                elif asset.file:
                    superseded.append((asset.file.storage, asset.file.name))
                asset.kind = entry["kind"]
                asset.media_type = "video" if entry["kind"] == "video" else "image"
                asset.variant_key = entry["variant_key"]
                asset.sort_order = entry["sort_order"]
                asset.file.save(os.path.basename(uploaded.name), uploaded, save=False)
                self.storage = asset.file.storage
                self.new_names.append(asset.file.name)
                staged.append(asset)

            # 2. Swap database rows.
            for asset in staged:
                asset.save()
                self.existing[asset.slot_key] = asset

            for entry in self.plan.keep:
                asset = self.existing[entry["slot_key"]]
                if (asset.sort_order, asset.variant_key) != (entry["sort_order"], entry["variant_key"]):
                    asset.sort_order = entry["sort_order"]
                    asset.variant_key = entry["variant_key"]
                    asset.save(update_fields=["sort_order", "variant_key"])

            for slot in self.plan.removed:
                asset = self.existing.pop(slot, None)
                if asset is None:
                    continue
                if asset.file:
                    superseded.append((asset.file.storage, asset.file.name))
                asset.delete()
        except Exception:
            self.abort()
            raise

        # 3. Old files go only after the new state is committed.
        def _cleanup(items=tuple(superseded)):
            for storage, name in items:
                _delete_files(storage, [name])

        if superseded:
            transaction.on_commit(_cleanup)

    def abort(self):
        """Delete files stored by apply() that no committed row references."""
        if self.storage is not None:
            _delete_files(self.storage, self.new_names)
        self.new_names = []


def serialize_media_rows(request, draft):
    """Media rows in the shape the frontend hook expects."""
    rows = []
    for asset in draft.media.all().order_by("sort_order", "id"):
        has_file = bool(asset.file)
        rows.append({
            "id": asset.id,
            "kind": asset.kind,
            "media_type": asset.media_type,
            "slot_key": asset.slot_key,
            "variant_key": asset.variant_key,
            "sort_order": asset.sort_order,
            "url": request.build_absolute_uri(asset.file.url) if has_file else "",
            "name": os.path.basename(asset.file.name) if has_file else "",
        })
    return rows


def delete_draft_media_after_commit(draft):
    """Delete a draft's media rows now and its files after the commit."""
    storages = [(asset.file.storage, asset.file.name) for asset in draft.media.all() if asset.file]
    draft.media.all().delete()

    def _cleanup(items=tuple(storages)):
        for storage, name in items:
            _delete_files(storage, [name])

    if storages:
        transaction.on_commit(_cleanup)