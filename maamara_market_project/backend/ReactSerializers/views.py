from rest_framework import permissions, viewsets
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from core.models import Profile
from .Serializers import AdminProfilePic, VendorPublicSerializer
from vendorDashboard.models import Vendor


class ProfileView(APIView):
    """Return the authenticated user's profile and vendor picture."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        profile, _ = Profile.objects.get_or_create(user=request.user)
        serializer = AdminProfilePic(profile)

        vendor_picture = None
        vendor = getattr(request.user, "vendor", None)
        if vendor and getattr(vendor, "profile_picture", None):
            vendor_picture = vendor.profile_picture.url

        return Response({
            **serializer.data,
            "vendor_profile_picture": vendor_picture,
        })


class VendorAdminViewSet(viewsets.ModelViewSet):
    """
    Admin-facing vendor directory.

    The existing vendor data shape is preserved through VendorPublicSerializer;
    the endpoint is explicitly restricted to staff users because it exposes
    vendor contact and business information.
    """

    queryset = Vendor.objects.all().order_by("-date_created")
    serializer_class = VendorPublicSerializer
    permission_classes = [permissions.IsAdminUser]
