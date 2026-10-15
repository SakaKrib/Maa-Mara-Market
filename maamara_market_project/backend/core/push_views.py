"""Authenticated device-token registration endpoints for Android and iOS."""
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import PushDevice


class PushDeviceRegistrationView(APIView):
    permission_classes = [IsAuthenticated]

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

        device, _ = PushDevice.objects.update_or_create(
            token=token.strip(),
            defaults={
                "user": request.user,
                "platform": platform,
                "active": True,
            },
        )
        return Response(
            {"registered": True, "platform": device.platform},
            status=status.HTTP_200_OK,
        )

    def delete(self, request):
        token = request.data.get("token")
        if not isinstance(token, str) or not token.strip():
            return Response(
                {"detail": "A push token is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        deleted, _ = PushDevice.objects.filter(
            user=request.user,
            token=token.strip(),
        ).delete()
        return Response({"unregistered": bool(deleted)}, status=status.HTTP_200_OK)
