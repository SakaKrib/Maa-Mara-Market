from django.apps import apps
from django.core.exceptions import FieldError
from django.db.models import Q
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated


SYSTEM_APPS = {"admin", "contenttypes", "sessions", "staticfiles"}
SEARCHABLE_FIELD_TYPES = {
    "CharField",
    "TextField",
    "EmailField",
    "SlugField",
    "GenericIPAddressField",
    "URLField",
}


def _model_search_fields(model):
    return [
        field.name
        for field in model._meta.get_fields()
        if getattr(field, "concrete", False)
        and not getattr(field, "many_to_many", False)
        and field.__class__.__name__ in SEARCHABLE_FIELD_TYPES
    ]


def _vendor_scope(model, vendor):
    """
    Return only objects belonging to the authenticated vendor.

    The scope deliberately follows only known ownership relationships. If a
    model has no safe vendor relationship, it is excluded from vendor search
    rather than exposing another store's or an administrator's data.
    """
    candidate_paths = (
        "vendor",
        "item__vendor",
        "order_item__item__vendor",
        "order__order_items__item__vendor",
        "order_items__item__vendor",
        "customer__vendor",
        "user__vendor",
        "created_by__vendor",
        "requested_by__vendor",
        "approved_by__vendor",
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

    return model.objects.filter(scope).distinct() if found_scope else model.objects.none()


def _search_queryset(model, query):
    queryset = model.objects.all()
    fields = _model_search_fields(model)

    search_q = Q()
    for field in fields:
        search_q |= Q(**{f"{field}__icontains": query})

    # Numeric primary keys are useful for orders, payouts, transactions, etc.
    if query.isdigit():
        try:
            queryset = queryset.filter(search_q | Q(pk=int(query)))
        except (ValueError, TypeError):
            queryset = queryset.filter(search_q)
    else:
        queryset = queryset.filter(search_q)

    return queryset.distinct()


def _display_value(obj):
    for field_name in (
        "name",
        "title",
        "company_name",
        "invoice_number",
        "reference",
        "username",
        "email",
        "key",
        "action",
    ):
        value = getattr(obj, field_name, None)
        if value not in (None, ""):
            return str(value)

    return str(obj)


def _serialize_object(obj, model):
    display = _display_value(obj)
    return {
        "id": obj.pk,
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
        if model._meta.app_label in SYSTEM_APPS:
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

        results = {}

        for model in _searchable_models():
            if is_admin:
                queryset = model.objects.all()
            elif is_vendor:
                queryset = _vendor_scope(model, vendor)
            else:
                # Non-admin/non-vendor authenticated users should not use the
                # internal global search endpoint.
                continue

            queryset = _search_queryset_from_queryset(queryset, model, query)
            objects = queryset.order_by("-pk")[:10]
            if not objects:
                continue

            key = model.__name__
            results[key] = [_serialize_object(obj, model) for obj in objects]

        return Response({"query": query, "results": results})


def _search_queryset_from_queryset(queryset, model, query):
    fields = _model_search_fields(model)
    search_q = Q()

    for field in fields:
        search_q |= Q(**{f"{field}__icontains": query})

    if query.isdigit():
        try:
            search_q |= Q(pk=int(query))
        except (ValueError, TypeError):
            pass

    return queryset.filter(search_q).distinct()
