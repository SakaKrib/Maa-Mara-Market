from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from core.models import Profile
from .Serializers import AdminProfilePic


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
