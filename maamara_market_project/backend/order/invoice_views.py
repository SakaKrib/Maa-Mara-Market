from django.db.models import Q
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from .invoice_models import Invoice


def _serialize(invoice):
    return {
        "id": invoice.id,
        "invoice_number": invoice.invoice_number,
        "invoice_type": invoice.invoice_type,
        "status": invoice.status,
        "amount": str(invoice.amount),
        "currency": invoice.currency,
        "provider": invoice.provider,
        "provider_reference": invoice.provider_reference,
        "payout_reference": invoice.payout_reference,
        "order_id": invoice.order_id,
        "payment_id": invoice.payment_id,
        "transaction_id": invoice.transaction_id,
        "issued_at": invoice.issued_at.isoformat(),
        "paid_at": invoice.paid_at.isoformat() if invoice.paid_at else None,
        "metadata": invoice.metadata or {},
    }


@api_view(["GET"])
@permission_classes([AllowAny])
def invoice_list(request):
    user = request.user if request.user and request.user.is_authenticated else None
    visitor_id = request.COOKIES.get("visitorId") if not user else None

    if user:
        queryset = Invoice.objects.filter(user=user)
    elif visitor_id:
        queryset = Invoice.objects.filter(visitor_id=visitor_id)
    else:
        queryset = Invoice.objects.none()

    queryset = queryset.select_related("order", "payment", "transaction")

    invoice_type = request.query_params.get("type")
    if invoice_type in {Invoice.TYPE_CUSTOMER, Invoice.TYPE_VENDOR}:
        queryset = queryset.filter(invoice_type=invoice_type)

    return Response({
        "success": True,
        "results": [_serialize(invoice) for invoice in queryset],
    })
