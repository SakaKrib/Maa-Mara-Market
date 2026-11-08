from datetime import timedelta

from django.conf import settings
from django.contrib.auth import get_user_model
from django.db.models import Count
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAdminUser, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from . import moderation as svc
from .models import ContentReport, UserBlock
from .permissions import IsAuthenticatedOrVisitor
from .ratelimit import client_ip, hit

User = get_user_model()


def _limited(request, scope, limit, window=3600):
    if getattr(settings, "RATE_LIMITS_ENABLED", True) and hit(scope, client_ip(request), limit, window):
        return Response({"detail": "Too many requests. Please try again later."}, status=status.HTTP_429_TOO_MANY_REQUESTS)
    return None


class ReportContentView(APIView):
    """POST /api/moderation/reports/ — any signed-in user or cookie-bound visitor."""
    permission_classes = [IsAuthenticatedOrVisitor]

    def get(self, request):
        return Response({
            "reasons": [{"value": v, "label": l} for v, l in ContentReport.REASON_CHOICES],
            "target_types": [v for v, _ in ContentReport.TARGET_CHOICES],
        })

    def post(self, request):
        limited = _limited(request, "content-report", 20)
        if limited:
            return limited
        user = request.user if request.user.is_authenticated else None
        try:
            target_id = int(request.data.get("target_id"))
        except (TypeError, ValueError):
            return Response({"detail": "Missing content to report."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            report, created = svc.create_report(
                reporter=user,
                visitor_id=request.COOKIES.get("visitorId"),
                target_type=str(request.data.get("target_type") or ""),
                target_id=target_id,
                reason=str(request.data.get("reason") or ""),
                details=str(request.data.get("details") or ""),
            )
        except svc.ReportError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(
            {"detail": "Thank you. Our team will review this report within 24 hours.", "id": report.pk},
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


class BlockedUsersView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        rows = UserBlock.objects.filter(blocker=request.user).select_related("blocked").order_by("-created_at")
        return Response([
            {"user_id": b.blocked_id, "username": b.blocked.username, "blocked_at": b.created_at}
            for b in rows
        ])

    def post(self, request):
        limited = _limited(request, "user-block", 60)
        if limited:
            return limited
        try:
            user_id = int(request.data.get("user_id"))
        except (TypeError, ValueError):
            return Response({"detail": "Choose a user to block."}, status=status.HTTP_400_BAD_REQUEST)
        target = User.objects.filter(pk=user_id).first()
        if not target:
            return Response({"detail": "User not found."}, status=status.HTTP_404_NOT_FOUND)
        if target.pk == request.user.pk:
            return Response({"detail": "You cannot block yourself."}, status=status.HTTP_400_BAD_REQUEST)
        if target.is_staff or target.is_superuser:
            return Response(
                {"detail": "Support accounts cannot be blocked. Use Report if there is a problem."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        UserBlock.objects.get_or_create(blocker=request.user, blocked=target)
        return Response({"detail": f"{target.username} is blocked. You will no longer see their posts."},
                        status=status.HTTP_201_CREATED)


class UnblockUserView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, user_id):
        UserBlock.objects.filter(blocker=request.user, blocked_id=user_id).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ---------------------------------------------------------------- admin
def _report_row(r):
    return {
        "id": r.pk,
        "target_type": r.target_type,
        "target_type_label": r.get_target_type_display(),
        "target_id": r.target_id,
        "reason": r.reason,
        "reason_label": r.get_reason_display(),
        "details": r.details,
        "snapshot": r.snapshot,
        "status": r.status,
        "action": r.action,
        "action_label": r.get_action_display(),
        "moderator_note": r.moderator_note,
        "reporter": r.reporter.username if r.reporter else ("visitor" if r.reporter_visitor_id else "deleted user"),
        "owner_id": r.target_owner_id,
        "owner": r.target_owner.username if r.target_owner else None,
        "owner_active": bool(r.target_owner and r.target_owner.is_active),
        "created_at": r.created_at,
        "resolved_at": r.resolved_at,
        "resolved_by": r.resolved_by.username if r.resolved_by else None,
        "overdue": r.status == ContentReport.STATUS_OPEN
                   and r.created_at <= timezone.now() - timedelta(hours=svc.SLA_HOURS),
        "other_reports_on_target": getattr(r, "same_target", 1) - 1,
    }


class AdminReportListView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        state = request.query_params.get("status", "open")
        qs = ContentReport.objects.select_related("reporter", "target_owner", "resolved_by")
        if state in {"open", "actioned", "dismissed"}:
            qs = qs.filter(status=state)
        counts = {
            row["target_type"] + ":" + str(row["target_id"]): row["n"]
            for row in ContentReport.objects.values("target_type", "target_id").annotate(n=Count("id"))
        }
        rows = list(qs[:200])
        for r in rows:
            r.same_target = counts.get(f"{r.target_type}:{r.target_id}", 1)
        return Response({
            "results": [_report_row(r) for r in rows],
            "open_count": ContentReport.objects.filter(status="open").count(),
            "overdue_count": svc.overdue_count(),
            "sla_hours": svc.SLA_HOURS,
        })


class AdminReportResolveView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request, pk):
        report = ContentReport.objects.filter(pk=pk).first()
        if not report:
            return Response({"detail": "Report not found."}, status=status.HTTP_404_NOT_FOUND)
        try:
            svc.resolve_report(
                report, request.user,
                action=str(request.data.get("action") or ""),
                note=str(request.data.get("note") or ""),
            )
        except svc.ReportError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(_report_row(ContentReport.objects.select_related("reporter", "target_owner", "resolved_by").get(pk=pk)))
