"""Backend duplicate protection for canonical marketplace items.

Only product-defining fields participate in the identity check. Mutable stock,
availability, media, and popularity values are intentionally excluded so they
do not define a second product listing.
"""
from decimal import Decimal, InvalidOperation
import unicodedata

from django.contrib.auth import get_user_model
from django.db.models import Q
from django.utils.text import slugify

from .models import Item


_TEXT_FIELDS = (
    "description",
    "item_attribute",
    "gender_based",
    "children_size_based_age",
    "roast_type",
    "coffee_state",
)


def _read_value(source, field, default=None):
    if isinstance(source, dict):
        return source.get(field, default)
    return getattr(source, field, default)


def _related_id(source, field):
    if isinstance(source, dict):
        value = source.get(field)
    else:
        value = getattr(source, f"{field}_id", None)
        if value is None:
            value = getattr(source, field, None)

    if value is None:
        return None
    if isinstance(value, dict):
        return value.get("id") or value.get("pk") or value.get("value")
    return getattr(value, "pk", value)


def _normalized_text(value):
    if value is None:
        return ""
    value = unicodedata.normalize("NFKC", str(value))
    return " ".join(value.split()).casefold()


def _normalized_decimal(value, *, default=None):
    if value in (None, ""):
        value = default
    if value in (None, ""):
        return None
    try:
        return Decimal(str(value)).quantize(Decimal("0.01"))
    except (InvalidOperation, TypeError, ValueError):
        return str(value).strip()


def _normalized_date(value):
    return value.isoformat() if hasattr(value, "isoformat") else str(value or "").strip()


def _item_identity(source):
    """Return a stable signature for fields that identify the product itself."""
    raw_name = _read_value(source, "name", "")
    normalized_name = slugify(_normalized_text(raw_name))
    if not normalized_name:
        return None

    identity = [
        normalized_name,
        _normalized_text(_read_value(source, "description", "")),
        _normalized_decimal(_read_value(source, "price", Decimal("0.00")), default=Decimal("0.00")),
        _normalized_decimal(_read_value(source, "discount_price")),
    ]

    for field in ("section", "department", "category", "subcategory", "brand"):
        identity.append(_related_id(source, field))

    for field in _TEXT_FIELDS:
        default = "none" if field in {"gender_based", "children_size_based_age"} else ""
        identity.append(_normalized_text(_read_value(source, field, default)))

    identity.extend([
        bool(_read_value(source, "is_organic", False)),
        bool(_read_value(source, "is_fresh_food", False)),
        _normalized_date(_read_value(source, "manufactured_date")),
        _normalized_date(_read_value(source, "expiry_date")),
        _normalized_decimal(_read_value(source, "percentage_discount")),
        bool(_read_value(source, "in_offer", False)),
    ])
    return tuple(identity)


def find_duplicate_item(data, *, owner_user, exclude_item_id=None):
    """Find an equivalent item owned by the same seller.

    The owner row is locked to serialize competing creation requests for that
    seller on databases that support SELECT FOR UPDATE. Callers should run
    this inside transaction.atomic().
    """
    if owner_user is None:
        return None

    user_model = get_user_model()
    user_model.objects.select_for_update().filter(pk=owner_user.pk).first()

    requested_identity = _item_identity(data)
    if requested_identity is None:
        return None

    candidates = (
        Item.objects.filter(
            Q(created_by_id=owner_user.pk) | Q(vendor__user_id=owner_user.pk)
        )
        .select_related(
            "section", "department", "category", "subcategory", "brand", "vendor"
        )
        .order_by("pk")
    )
    if exclude_item_id is not None:
        candidates = candidates.exclude(pk=exclude_item_id)

    for candidate in candidates.iterator():
        if _item_identity(candidate) == requested_identity:
            return candidate
    return None
