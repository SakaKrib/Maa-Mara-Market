from django.db.models import Q
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from .registermodels import SEARCH_REGISTRY  # adjust path


class GlobalSearchView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        query = request.GET.get("q", "").strip()
        user = request.user

        if not query:
            return Response({"results": []})

        is_vendor = hasattr(user, "vendor")
        is_admin = user.is_staff

        results = {}

        for config in SEARCH_REGISTRY:
            model = config["model"]
            field = config["field"]
            serializer_class = config["serializer"]
            vendor_field = config.get("vendor_field")

            qs = model.objects.all()

            # ===============================
            # ROLE-BASED FILTERING
            # ===============================
            if is_vendor and not is_admin:
                if vendor_field:
                    qs = qs.filter(**{vendor_field: user.vendor})
                else:
                    # vendor should not see global admin-only data
                    qs = qs.none()

            # ===============================
            # SEARCH FILTER
            # ===============================
            if field:
                qs = qs.filter(**{f"{field}__icontains": query})

            qs = qs[:10]  # limit per model

            # ===============================
            # SERIALIZE
            # ===============================
            if serializer_class:
                serializer = serializer_class(qs, many=True, context={"request": request})
                results[config["name"]] = serializer.data
            else:
                # fallback if no serializer
                results[config["name"]] = list(qs.values()[:10])

        return Response({
            "query": query,
            "results": results
        })