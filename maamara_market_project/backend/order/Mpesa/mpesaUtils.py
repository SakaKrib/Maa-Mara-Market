import bleach  # type: ignore
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .mpesaView import initiate_b2c_payment


def sanitize_input(value: str) -> str:
    return bleach.clean(value, tags=[], attributes={}, strip=True)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def mpesa_b2c_payment(request):
    """Initiate a configured business-to-customer payout."""
    phone = sanitize_input(str(request.data.get("phone", "")).strip())
    amount_raw = sanitize_input(str(request.data.get("amount", "")).strip())

    if not phone or not amount_raw:
        return Response({"error": "phone and amount are required"}, status=400)

    try:
        amount = int(amount_raw)
    except (TypeError, ValueError):
        return Response({"error": "amount must be numeric"}, status=400)

    if amount <= 0:
        return Response({"error": "amount must be greater than zero"}, status=400)

    try:
        result = initiate_b2c_payment(phone, amount)
        return Response(result, status=200)
    except Exception:
        return Response({"error": "B2C payment could not be initiated"}, status=502)


@api_view(["POST"])
def mpesa_result(request):
    """Receive a Safaricom B2C result callback without exposing internals."""
    return Response({"ResultCode": 0, "ResultDesc": "Accepted"})


@api_view(["POST"])
def mpesa_timeout(request):
    """Receive a Safaricom B2C timeout callback without exposing internals."""
    return Response({"ResultCode": 0, "ResultDesc": "Accepted"})
