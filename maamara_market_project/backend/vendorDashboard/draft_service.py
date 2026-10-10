import os
from datetime import timedelta
from urllib.parse import urlparse

from django.core.files import File
from django.db import transaction

from ReactSerializers.models import Item, ItemAdditionalImage, ColorVariant
from .models import ItemDraft


def _copy_draft_file(source_field, target_field):
    if not source_field:
        return
    source_field.open("rb")
    try:
        target_field.save(os.path.basename(source_field.name), File(source_field.file), save=False)
    finally:
        source_field.close()


@transaction.atomic
def finalize_item_draft(draft, item):
    """
    Move a submitted draft's media into the canonical Item media fields.

    The draft stays in the database for auditability, but its status becomes
    COMPLETED so it is no longer returned by the active-draft endpoint.
    """
    media = list(draft.media.all().order_by("sort_order", "id"))

    main = next((m for m in media if m.kind == "main"), None)
    video = next((m for m in media if m.kind == "video"), None)

    if main:
        _copy_draft_file(main.file, item.image)

    if video:
        _copy_draft_file(video.file, item.video)

    item.save()

    ItemAdditionalImage.objects.filter(item=item).delete()
    for gallery in (m for m in media if m.kind == "gallery"):
        gallery.file.open("rb")
        try:
            ItemAdditionalImage.objects.create(
                item=item,
                image=File(gallery.file.file, name=os.path.basename(gallery.file.name)),
            )
        finally:
            gallery.file.close()

    variant_media = [m for m in media if m.kind == "variant" and m.variant_key]
    for media_obj in variant_media:
        variant = item.variants.filter(color=media_obj.variant_key).first()
        if not variant:
            continue
        _copy_draft_file(media_obj.file, variant.image)
        variant.save(update_fields=["image"])

    draft.status = "COMPLETED"
    draft.created_item = item
    draft.save(update_fields=["status", "created_item", "updated_at"])

    return item


def submit_item_draft(draft, created_request=None):
    draft.status = "SUBMITTED"
    if created_request is not None:
        draft.created_request = created_request
    draft.save(update_fields=["status", "created_request", "updated_at"])


def mark_item_draft_abandoned(draft):
    draft.status = "ABANDONED"
    draft.save(update_fields=["status", "updated_at"])

def _relation_or_none(value):
    if value in (None, ""):
        return None
    if isinstance(value, dict):
        return value.get("id") or value.get("pk") or value.get("value") or None
    return value


def build_item_draft_update_payload(draft_data):
    """Normalize the saved form snapshot for ItemSerializers."""
    data = dict(draft_data or {})
    payload = {}
    primitive_fields = (
        "section", "name", "description", "price", "discount_price",
        "in_stock", "available", "returnable", "department", "category",
        "subcategory", "item_attribute", "percentage_discount",
        "gender_based", "children_size_based_age", "is_organic",
        "is_fresh_food", "roast_type", "coffee_state", "manufactured_date",
        "expiry_date", "in_offer", "brand", "occasions",
    )

    for key in primitive_fields:
        if key not in data:
            continue
        value = data[key]
        if key in {"department", "category", "subcategory", "section"} and value in (None, ""):
            continue
        if key in {"manufactured_date", "expiry_date", "discount_price", "percentage_discount"} and value == "":
            value = None
        if key == "brand":
            value = _relation_or_none(value)
        payload[key] = value

    # Media URLs are display state, not uploaded file objects. Media is applied
    # from ItemDraftMedia after the model fields have been updated.
    if "color_variants" in data:
        variants = []
        for variant in (data.get("color_variants") or []):
            if not isinstance(variant, dict):
                continue
            sizes = []
            for size in (variant.get("sizes") or []):
                if not isinstance(size, dict):
                    continue
                size_row = {
                    "size": size.get("size", ""),
                    "quantity_in_stock": size.get("quantity_in_stock", size.get("stock", 0)),
                }
                if size.get("id") not in (None, ""):
                    size_row["id"] = size["id"]
                sizes.append(size_row)
            variant_row = {"color": variant.get("color", ""), "sizes": sizes}
            if variant.get("id") not in (None, ""):
                variant_row["id"] = variant["id"]
            variants.append(variant_row)
        payload["variants"] = variants
    elif "variants" in data:
        payload["variants"] = [
            {k: v for k, v in variant.items() if k not in {"image", "color_image", "image_field"}}
            for variant in (data.get("variants") or [])
            if isinstance(variant, dict)
        ]

    if "size_variant" in data:
        payload["size_only_icon"] = [
            {
                **({"id": size["id"]} if size.get("id") not in (None, "") else {}),
                "size": size.get("size", ""),
                "quantity_in_stock": size.get("quantity_in_stock", size.get("stock", 0)),
            }
            for size in (data.get("size_variant") or [])
            if isinstance(size, dict)
        ]
    elif "size_only_icon" in data:
        payload["size_only_icon"] = data.get("size_only_icon") or []

    if "kids_sizes" in data:
        payload["kids_sizes"] = [
            {
                **({"id": size["id"]} if size.get("id") not in (None, "") else {}),
                "age_group": size.get("age_group", size.get("size", "")),
                "quantity_in_stock": size.get("quantity_in_stock", size.get("stock", 0)),
            }
            for size in (data.get("kids_sizes") or [])
            if isinstance(size, dict)
        ]

    # The latest values are held in the individual shoe controls, not in the
    # duplicate shoe_input value copied from the original Item.
    if any(key in data for key in ("shoe_type", "shoe_gender", "shoe_size")):
        shoe_size = data.get("shoe_size") or []
        if not isinstance(shoe_size, list):
            shoe_size = [shoe_size] if shoe_size else []
        shoe_type = data.get("shoe_type") or ""
        shoe_gender = data.get("shoe_gender") or ""
        if shoe_type or shoe_gender or shoe_size:
            payload["shoe_input"] = [{
                "shoe_type": shoe_type,
                "shoe_gender": shoe_gender,
                "shoe_size": shoe_size,
            }]
        else:
            payload["shoe_input"] = data.get("shoe_input") or []
    elif "shoe_input" in data:
        payload["shoe_input"] = data.get("shoe_input") or []

    for key in ("weight", "length", "shipping_dimension_data"):
        if key in data and data[key] is not None:
            payload[key] = data[key]

    if "in_offer" in data and not data.get("in_offer"):
        payload["offer"] = None
    elif data.get("offer") is not None:
        payload["offer"] = data["offer"]

    # The draft's gallery entries define which existing gallery rows remain.
    if "gallery_images" in data:
        keep_ids = set()
        for asset in (data.get("gallery_images") or []):
            if not isinstance(asset, dict):
                continue
            slot = str(asset.get("slot_key") or asset.get("slotKey") or "")
            if slot.startswith("additional:"):
                raw_id = slot.split(":", 1)[1]
                if raw_id.isdigit():
                    keep_ids.add(int(raw_id))
            elif asset.get("id") not in (None, ""):
                try:
                    keep_ids.add(int(asset["id"]))
                except (TypeError, ValueError):
                    pass
        payload["gallery_keep_ids"] = sorted(keep_ids)

    return payload


def _url_path(value):
    if not value:
        return ""
    try:
        return urlparse(str(value)).path.rstrip("/")
    except (TypeError, ValueError):
        return str(value).rstrip("/")


def _media_is_current(draft, media_row, current_value):
    if current_value:
        return _url_path(current_value) == _url_path(media_row.file.url)
    # stripFiles() replaces an uploaded File in the JSON snapshot with null.
    # Its media row is timestamped alongside the most recent draft save.
    return media_row.updated_at >= draft.updated_at - timedelta(seconds=5)


def _copy_media_to_field(source_field, target_field):
    if not source_field:
        return
    source_field.open("rb")
    try:
        target_field.save(
            os.path.basename(source_field.name),
            File(source_field.file),
            save=False,
        )
    finally:
        source_field.close()


@transaction.atomic
def sync_item_draft_media(draft, item):
    """Apply current draft media to an existing Item without rebuilding its media."""
    from ReactSerializers.models import ItemAdditionalImage

    data = dict(draft.data or {})
    media_rows = list(draft.media.all().order_by("sort_order", "id"))
    changed_item_fields = []

    main_row = next((row for row in media_rows if row.kind == "main"), None)
    if main_row and "image" in data and _media_is_current(draft, main_row, data.get("image")):
        _copy_media_to_field(main_row.file, item.image)
        changed_item_fields.append("image")
    elif "image" in data and data.get("image") in (None, "") and item.image:
        item.image.delete(save=False)
        changed_item_fields.append("image")

    video_row = next((row for row in media_rows if row.kind == "video"), None)
    if video_row and "video" in data and _media_is_current(draft, video_row, data.get("video")):
        _copy_media_to_field(video_row.file, item.video)
        changed_item_fields.append("video")
    elif "video" in data and data.get("video") in (None, "") and item.video:
        item.video.delete(save=False)
        changed_item_fields.append("video")

    if changed_item_fields:
        item.save(update_fields=list(dict.fromkeys(changed_item_fields)))

    gallery_entries = {
        str(asset.get("slot_key") or asset.get("slotKey") or ""): asset
        for asset in (data.get("gallery_images") or [])
        if isinstance(asset, dict)
    }
    for row in media_rows:
        if row.kind != "gallery" or row.slot_key not in gallery_entries:
            continue
        entry = gallery_entries[row.slot_key]
        current_value = entry.get("image") or entry.get("url") or entry.get("value")
        if not _media_is_current(draft, row, current_value):
            continue

        target = None
        if row.slot_key.startswith("additional:"):
            image_id = row.slot_key.split(":", 1)[1]
            if image_id.isdigit():
                target = ItemAdditionalImage.objects.filter(item=item, pk=int(image_id)).first()

        if target is None:
            if row.slot_key.startswith("additional:"):
                continue
            target = ItemAdditionalImage(item=item)
            _copy_media_to_field(row.file, target.image)
            target.save()
        else:
            _copy_media_to_field(row.file, target.image)
            target.save(update_fields=["image"])

    variant_values = data.get("color_variants")
    if isinstance(variant_values, list):
        variants_by_color = {
            str(variant.get("color") or "").strip().lower(): variant
            for variant in variant_values
            if isinstance(variant, dict)
        }
        for row in media_rows:
            if row.kind != "variant" or not row.variant_key:
                continue
            variant_data = variants_by_color.get(str(row.variant_key).strip().lower())
            if variant_data is None:
                continue
            variant = item.variants.filter(color__iexact=row.variant_key).first()
            if variant is None:
                continue
            current_value = variant_data.get("color_image") or variant_data.get("image")
            if current_value and not _media_is_current(draft, row, current_value):
                continue
            if not current_value and not _media_is_current(draft, row, current_value):
                continue
            _copy_media_to_field(row.file, variant.image)
            variant.save(update_fields=["image"])

        # Clear a variant image only when the latest draft says the slot is
        # empty and no current media row supplies a replacement for that slot.
        for color, variant_data in variants_by_color.items():
            current_value = variant_data.get("color_image") or variant_data.get("image")
            if current_value:
                continue
            matching_row = next(
                (row for row in media_rows
                 if row.kind == "variant" and str(row.variant_key).strip().lower() == color),
                None,
            )
            if matching_row and _media_is_current(draft, matching_row, current_value):
                continue
            variant = item.variants.filter(color__iexact=color).first()
            if variant and variant.image:
                variant.image.delete(save=False)
                variant.save(update_fields=["image"])

    item.refresh_from_db()
    return item
