import os

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

    item.save(update_fields=["image", "video", "updated"])

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
