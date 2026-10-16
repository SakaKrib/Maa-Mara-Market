"""Register native push tokens for authenticated users and identified visitors."""
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import PushDevice


class PushDeviceRegistrationView(APIView):
    # Visitors need push too. Ownership is limited to the authenticated account
    # or the visitorId cookie issued by the existing visitor-token endpoint.
    permission_classes = [AllowAny]

    def post(self, request):
        token = request.data.get("token")
        platform = str(request.data.get("platform") or "").strip().lower()
        if not isinstance(token, str) or not token.strip() or len(token) > 8192:
            return Response(
                {"detail": "A valid push token is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if platform not in {"android", "ios", "web"}:
            return Response(
                {"detail": "Platform must be android, ios, or web."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = request.user if request.user and request.user.is_authenticated else None
        visitor_id = None if user else str(request.COOKIES.get("visitorId") or "").strip()
        if not user and not visitor_id:
            return Response(
                {"detail": "Initialize the visitor session before registering push."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        device, _ = PushDevice.objects.update_or_create(
            token=token.strip(),
            defaults={
                "user": user,
                "visitor_id": visitor_id or None,
                "platform": platform,
                "active": True,
            },
        )
        return Response(
            {
                "registered": True,
                "platform": device.platform,
                "audience": "user" if device.user_id else "visitor",
            },
            status=status.HTTP_200_OK,
        )

    def delete(self, request):
        token = request.data.get("token")
        if not isinstance(token, str) or not token.strip():
            return Response(
                {"detail": "A push token is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = request.user if request.user and request.user.is_authenticated else None
        devices = PushDevice.objects.filter(token=token.strip())
        if user:
            devices = devices.filter(user=user)
        else:
            visitor_id = str(request.COOKIES.get("visitorId") or "").strip()
            if not visitor_id:
                return Response(
                    {"detail": "A visitor session is required to unregister push."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            devices = devices.filter(visitor_id=visitor_id)

        deleted, _ = devices.delete()
        return Response({"unregistered": bool(deleted)}, status=status.HTTP_200_OK)
