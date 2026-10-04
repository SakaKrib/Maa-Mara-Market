from django.conf import settings
from django.http import HttpResponseRedirect
from rest_framework.decorators import api_view
from rest_framework.response import Response
from .services import PesaPalService


@api_view(["GET", "POST"])
def pesapal_ipn(request):
    payload = request.data if request.method == "POST" else request.query_params
    tracking_id = payload.get("OrderTrackingId") or payload.get("order_tracking_id")
    merchant_reference = payload.get("OrderMerchantReference") or payload.get("merchant_reference")
    notification_type = payload.get("OrderNotificationType") or payload.get("notification_type") or "IPNCHANGE"

    if not tracking_id:
        return Response({"detail": "Missing Pesapal order tracking ID."}, status=400)

    try:
        PesaPalService.verify_payment(tracking_id)
    except Exception:
        return Response({"detail": "Payment verification failed."}, status=502)

    return Response({
        "orderNotificationType": notification_type,
        "orderTrackingId": tracking_id,
        "orderMerchantReference": merchant_reference,
        "status": 200,
    }, status=200)


@api_view(["GET"])
def pesapal_callback(request):
    tracking_id = request.query_params.get("OrderTrackingId")
    if not tracking_id:
        return HttpResponseRedirect(
            f"{settings.FRONTEND_URL.rstrip('/')}/payment-pesapal-callback?status=failed"
        )

    try:
        order = PesaPalService.verify_payment(tracking_id)
    except Exception:
        order = None

    if order:
        destination = (
            f"{settings.FRONTEND_URL.rstrip('/')}/payment-pesapal-callback"
            f"?status=success&order_id={order.id}"
        )
    else:
        destination = (
            f"{settings.FRONTEND_URL.rstrip('/')}/payment-pesapal-callback"
            f"?status=pending"
        )

    return HttpResponseRedirect(destination)
