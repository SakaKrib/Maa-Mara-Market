from datetime import date, datetime
from django.apps import apps
from django.core.exceptions import FieldError
from django.db.models import Q
from django.utils.dateparse import parse_date, parse_datetime
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated


SYSTEM_APPS = {"admin", "contenttypes", "sessions", "staticfiles"}
EXCLUDED_APPS = set()
TEXT_FIELD_TYPES = {
    "CharField",
    "TextField",
    "EmailField",
    "SlugField",
    "GenericIPAddressField",
    "URLField",
    "UUIDField",
}
NUMERIC_FIELD_TYPES = {
    "IntegerField",
    "BigIntegerField",
    "PositiveIntegerField",
    "PositiveBigIntegerField",
    "SmallIntegerField",
    "PositiveSmallIntegerField",
    "DecimalField",
    "FloatField",
}
SENSITIVE_FIELD_NAMES = {
    "password",
    "password_hash",
    "token",
    "access_token",
    "refresh_token",
    "secret",
    "otp",
    "otp_secret",
    "api_key",
    "jti",
}

# Authentication/session records are never workspace-searchable. In
# particular, SimpleJWT's OutstandingToken model contains token/session
# metadata and must not become visible through the dynamic model discovery.
SECURITY_MODEL_NAMES = {
    "token",
    "outstandingtoken",
    "blacklistedtoken",
    "accesstoken",
    "refreshtoken",
    "emailotp",
}


def _model_search_fields(model):
    return [
        field
        for field in model._meta.get_fields()
        if getattr(field, "concrete", False)
        and not getattr(field, "many_to_many", False)
        and field.name not in SENSITIVE_FIELD_NAMES
        and (
            field.__class__.__name__ in TEXT_FIELD_TYPES
            or field.__class__.__name__ in NUMERIC_FIELD_TYPES
            or field.__class__.__name__ in {"DateField", "DateTimeField", "BooleanField"}
        )
    ]


def _vendor_scope(model, vendor):
    """
    Scope a vendor search to records that belong to this vendor.

    Unknown ownership paths are deliberately excluded. This is safer than
    returning shared/admin records merely because their text matches.
    """
    candidate_paths = (
        # Direct ownership.
        "vendor",
        "user__vendor",
        "created_by__vendor",
        "requested_by__vendor",
        "approved_by__vendor",
        "changed_by__vendor",
        "sender__vendor",
        "participant__vendor",
        "admin__vendor",

        # Product ownership.
        "item__vendor",
        "item__item__vendor",
        "order_item__item__vendor",
        "order__order_items__item__vendor",
        "order_items__item__vendor",

        # Returns/refunds and related financial records.
        "return_request__item__item__vendor",
        "vendor_adjustment__vendor",
        "payout__vendor",
        "transaction__vendor",

        # Vendor/customer/support relations.
        "customer__vendor__vendor",
        "order_set__order_items__item__vendor",
        "order_set__customer__vendor__vendor",
        "conversation__participant__vendor",
        "conversation__admin__vendor",
        "vendor_request__user__vendor",
        "draft__user__vendor",
        "post__vendor",
        "post__item__vendor",
        "vendor__user__vendor",
    )

    scope = Q(pk__in=[])
    found_scope = False

    for path in candidate_paths:
        try:
            model.objects.filter(**{path: vendor}).exists()
        except (FieldError, ValueError, TypeError):
            continue
        scope |= Q(**{path: vendor})
        found_scope = True

    if not found_scope:
        return model.objects.none()

    return model.objects.filter(scope).distinct()


def _search_queryset_from_queryset(queryset, model, query):
    fields = _model_search_fields(model)
    search_q = Q()

    for field in fields:
        field_type = field.__class__.__name__

        if field_type in TEXT_FIELD_TYPES:
            search_q |= Q(**{f"{field.name}__icontains": query})
            continue

        if field_type in NUMERIC_FIELD_TYPES:
            # Numeric fields must only be queried with a value Django can
            # prepare for that field. Building Q(field=value) itself can
            # raise ValueError before queryset.filter() is reached.
            try:
                if field_type in {"DecimalField", "FloatField"}:
                    numeric_value = float(query)
                else:
                    numeric_value = int(query)
            except (ValueError, TypeError):
                continue

            search_q |= Q(**{field.name: numeric_value})
            continue

        if field_type == "BooleanField":
            normalized = query.lower()
            if normalized in {"true", "yes", "1"}:
                search_q |= Q(**{field.name: True})
            elif normalized in {"false", "no", "0"}:
                search_q |= Q(**{field.name: False})
            continue

        if field_type == "DateField":
            parsed = parse_date(query)
            if parsed:
                search_q |= Q(**{field.name: parsed})
            continue

        if field_type == "DateTimeField":
            parsed = parse_datetime(query)
            if parsed:
                search_q |= Q(**{field.name: parsed})
            elif len(query) == 10:
                parsed_date = parse_date(query)
                if parsed_date:
                    search_q |= Q(**{f"{field.name}__date": parsed_date})

    # Numeric primary keys are useful for orders, payouts, transactions, etc.
    if query.isdigit():
        try:
            search_q |= Q(pk=int(query))
        except (ValueError, TypeError):
            pass

    return queryset.filter(search_q).distinct() if search_q else queryset.none()


def _display_value(obj):
    for field_name in (
        "name",
        "title",
        "company_name",
        "full_name",
        "question",
        "subject",
        "invoice_number",
        "reference",
        "vendor_code",
        "email",
        "key",
        "action",
    ):
        value = getattr(obj, field_name, None)
        if value not in (None, ""):
            return str(value)

    return str(obj)


def _search_relevance(obj, model, query):
    """
    Give exact/near-exact matches priority over incidental matches such as
    activity descriptions. This score is applied after the database filter.
    """
    query = query.casefold().strip()
    values = []

    for field_name in ("name", "title", "company_name", "full_name", "subject",
                       "invoice_number", "reference", "vendor_code", "email",
                       "key", "action", "description", "message"):
        if hasattr(obj, field_name):
            value = getattr(obj, field_name, None)
            if value not in (None, ""):
                values.append((field_name, str(value).casefold()))

    score = 0
    for field_name, value in values:
        if value == query:
            score = max(score, 1000)
        elif value.startswith(query):
            score = max(score, 800)
        elif query in value:
            score = max(score, 500)

        if field_name in {"name", "title", "company_name", "full_name", "subject",
                          "invoice_number", "reference", "vendor_code"}:
            if value == query:
                score = max(score, 1200)
            elif value.startswith(query):
                score = max(score, 1000)
            elif query in value:
                score = max(score, 700)

    # Activity/notification text is useful context, but should rank below the
    # actual object being searched for.
    if model.__name__.lower() in {"activitylog", "notification"}:
        score = min(score, 250)

    return score


def _serialize_object(obj, model):
    display = _display_value(obj)
    return {
        "id": str(obj.pk),
        "name": getattr(obj, "name", None) or display,
        "title": getattr(obj, "title", None),
        "company_name": getattr(obj, "company_name", None),
        "display_name": display,
        "type": model.__name__,
        "model": model._meta.model_name,
        "app_label": model._meta.app_label,
    }


def _searchable_models():
    for model in apps.get_models():
        if model._meta.app_label in SYSTEM_APPS | EXCLUDED_APPS:
            continue
        if model._meta.model_name.lower() in SECURITY_MODEL_NAMES:
            continue
        if model._meta.proxy or not _model_search_fields(model):
            continue
        yield model


class GlobalSearchView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        query = " ".join((request.GET.get("q") or "").split())
        if not query:
            return Response({"query": "", "results": {}})

        user = request.user
        is_admin = bool(user.is_staff or user.is_superuser)
        vendor = getattr(user, "vendor", None)
        is_vendor = vendor is not None and not is_admin

        if not is_admin and not is_vendor:
            return Response(
                {"detail": "Global workspace search is available to administrators and vendors only."},
                status=403,
            )

        results = {}

        for model in _searchable_models():
            queryset = (
                model.objects.all()
                if is_admin
                else _vendor_scope(model, vendor)
            )

            queryset = _search_queryset_from_queryset(queryset, model, query)
            objects = list(queryset.order_by("-pk")[:50])
            objects.sort(
                key=lambda obj: (_search_relevance(obj, model, query), obj.pk),
                reverse=True,
            )
            objects = objects[:10]

            if not objects:
                continue

            results[model.__name__] = [
                _serialize_object(obj, model) for obj in objects
            ]

        return Response({"query": query, "results": results})
