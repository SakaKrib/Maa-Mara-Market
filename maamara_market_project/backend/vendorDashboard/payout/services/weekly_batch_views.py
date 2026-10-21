"""Admin API for weekly payout batches. Read-only except the three explicit steps."""
from datetime import date

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response

from vendorDashboard.models import PayoutBatch
from vendorDashboard.payout.services import weekly_payouts as weekly


def _error(exc):
    return Response({"error": str(exc)}, status=exc.status)


def _get(batch_id):
    return PayoutBatch.objects.select_related("created_by", "audited_by", "approved_by").filter(pk=batch_id).first()


@api_view(["GET"])
@permission_classes([IsAdminUser])
def weekly_batch_list(request):
    return Response({
        "enabled": weekly.weekly_enabled(),
        "batches": [weekly.batch_summary(b) for b in PayoutBatch.objects.all()[:26]],
    })


@api_view(["POST"])
@permission_classes([IsAdminUser])
def weekly_batch_create(request):
    raw = request.data.get("week_start")
    week_start = None
    if raw:
        try:
            week_start = date.fromisoformat(str(raw))
        except ValueError:
            return Response({"error": "week_start must be a date (YYYY-MM-DD)."}, status=400)
    try:
        batch, created = weekly.create_batch(request.user, week_start)
    except weekly.WeeklyPayoutError as exc:
        return _error(exc)
    return Response({"created": created, "batch": weekly.batch_summary(_get(batch.pk))}, status=201 if created else 200)


@api_view(["GET"])
@permission_classes([IsAdminUser])
def weekly_batch_detail(request, batch_id):
    batch = _get(batch_id)
    if batch is None:
        return Response({"error": "Batch not found."}, status=404)
    return Response(weekly.batch_summary(batch))


@api_view(["POST"])
@permission_classes([IsAdminUser])
def weekly_batch_audit(request, batch_id):
    if _get(batch_id) is None:
        return Response({"error": "Batch not found."}, status=404)
    try:
        weekly.audit_batch(batch_id, request.user)
    except weekly.WeeklyPayoutError as exc:
        return _error(exc)
    return Response(weekly.batch_summary(_get(batch_id)))


@api_view(["POST"])
@permission_classes([IsAdminUser])
def weekly_batch_approve(request, batch_id):
    if _get(batch_id) is None:
        return Response({"error": "Batch not found."}, status=404)
    try:
        weekly.approve_batch(batch_id, request.user)
    except weekly.WeeklyPayoutError as exc:
        return _error(exc)
    return Response(weekly.batch_summary(_get(batch_id)))
