"""Vendor Terms & Conditions acceptance (version + required acknowledgements)."""
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import VendorTermsAcceptance

# Bump this whenever the Vendor Terms change in a way vendors must re-accept.
# Keep it equal to VENDOR_TERMS_VERSION in the frontend Terms&Conditions.jsx.
CURRENT_VERSION = "2026-11-09"

REQUIRED_ACKNOWLEDGEMENTS = ("pricing", "payouts", "returns", "quality", "conduct")


def has_accepted_current(user):
    return VendorTermsAcceptance.objects.filter(user=user, version=CURRENT_VERSION).exists()


class VendorTermsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        record = VendorTermsAcceptance.objects.filter(user=request.user, version=CURRENT_VERSION).first()
        return Response({
            "version": CURRENT_VERSION,
            "accepted": bool(record),
            "accepted_at": record.accepted_at if record else None,
            "required_acknowledgements": list(REQUIRED_ACKNOWLEDGEMENTS),
        })

    def post(self, request):
        if str(request.data.get("version") or "") != CURRENT_VERSION:
            return Response(
                {"detail": "These terms have been updated. Please reload the page and read the latest version."},
                status=status.HTTP_409_CONFLICT,
            )
        given = request.data.get("acknowledgements")
        given = {str(item) for item in given} if isinstance(given, list) else set()
        missing = [key for key in REQUIRED_ACKNOWLEDGEMENTS if key not in given]
        if missing:
            return Response(
                {"detail": "Please confirm every statement before accepting.", "missing": missing},
                status=status.HTTP_400_BAD_REQUEST,
            )
        record, created = VendorTermsAcceptance.objects.get_or_create(
            user=request.user, version=CURRENT_VERSION,
            defaults={"acknowledgements": sorted(given & set(REQUIRED_ACKNOWLEDGEMENTS))},
        )
        return Response(
            {"version": CURRENT_VERSION, "accepted": True, "accepted_at": record.accepted_at},
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )
