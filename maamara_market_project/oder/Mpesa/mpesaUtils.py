import bleach # type: ignore
from rest_framework.decorators import api_view
from rest_framework.response import Response
from .mpesaView import initiate_b2c_payment

def sanitize_input(value: str) -> str:
    """
    Sanitize input using bleach
    - strips scripts and unsafe HTML
    - only allows plain text
    """
    return bleach.clean(value, tags=[], attributes={}, strip=True)


@api_view(["POST"])
def mpesa_b2c_payment(request):
    """
    Trigger B2C payment (Business → Customer)
    """
    try:
        # ✅ Sanitize and validate inputs
        phone = sanitize_input(str(request.data.get("phone", "")).strip())
        amount = sanitize_input(str(request.data.get("amount", "")).strip())

        if not phone or not amount:
            return Response({"error": "phone and amount required"}, status=400)

        if not amount.isdigit():
            return Response({"error": "amount must be numeric"}, status=400)

        # ✅ Convert amount safely
        amount = int(amount)

        # ✅ Call payment initiator
        result = initiate_b2c_payment(phone, amount)

        return Response(result, status=200)

    except Exception as e:
        return Response({"error": f"B2C Payment failed: {str(e)}"}, status=500)


@api_view(["POST"])
def mpesa_result(request):
    """
    Safaricom will POST here with transaction result
    """
    sanitized_data = {
        k: sanitize_input(str(v)) for k, v in request.data.items()
    }
    print("✅ Result:", sanitized_data)
    return Response({"ResultCode": 0, "ResultDesc": "Success"})


@api_view(["POST"])
def mpesa_timeout(request):
    """
    Safaricom will POST here if request times out
    """
    sanitized_data = {
        k: sanitize_input(str(v)) for k, v in request.data.items()
    }
    print("⚠️ Timeout:", sanitized_data)
    return Response({"ResultCode": 1, "ResultDesc": "Timeout received"})
