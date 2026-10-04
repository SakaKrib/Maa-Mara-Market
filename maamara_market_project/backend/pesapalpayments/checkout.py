from datetime import timedelta
from decimal import Decimal

from django.db import transaction
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from order.checkout_sessions import (
    get_owned_checkout_session,
    validate_checkout_items,
    validate_shipping,
)
from order.models import CheckoutSession
from order.paymentserializer import CheckoutSerializer
from order.views import IsAuthenticatedOrVisitor

from .services import PesaPalService


@api_view(["POST"])
@permission_classes([IsAuthenticatedOrVisitor])
@transaction.atomic
def checkout_view(request):
    serializer = CheckoutSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    data = serializer.validated_data
    user = request.user if request.user and request.user.is_authenticated else None
    visitor_id = request.COOKIES.get("visitorId") if not user else None

    if not user and not visitor_id:
        return Response(
            {"success": False, "error": "Checkout identity is required."},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    billing = {
        "first_name": data["first_name"],
        "last_name": data["last_name"],
        "phone": data["phone"],
        "email": data["email"],
        "street_address": data["street_address"],
        "appartment_address": data.get("appartment_address", ""),
        "city": data["city"],
        "state": data.get("state", ""),
        "country": data["country"],
        "zip": data["zip"],
    }

    try:
        item_snapshots, subtotal = validate_checkout_items(data.get("items", []))
        shipping = validate_shipping(data.get("shipping"), data.get("items", []), billing)
        grand_total = (subtotal + Decimal(shipping["amount_kes"])).quantize(Decimal("0.01"))

        if grand_total <= 0:
            raise ValueError("Order amount must be greater than zero.")

        payment_method = str(data.get("payment_method") or "").strip()
        if payment_method not in {"Pesapal", "M-Pesa"}:
            raise ValueError("Unsupported payment method.")

        CheckoutSession.objects.filter(
            user=user,
            visitor_id=None if user else visitor_id,
            status="draft",
        ).delete()

        checkout_session = CheckoutSession.objects.create(
            user=user,
            visitor_id=visitor_id,
            payload={
                "billing": billing,
                "items": item_snapshots,
                "shipping": shipping,
            },
            payment_method=payment_method,
            amount=grand_total,
            currency="KES",
            expires_at=timezone.now() + timedelta(minutes=30),
            status="draft",
        )

        if payment_method == "Pesapal":
            pesapal_response = PesaPalService.initialize_payment(checkout_session)

            checkout_session.payload["pesapal"] = {
                "merchant_reference": pesapal_response["merchant_reference"],
                "order_tracking_id": pesapal_response["order_tracking_id"],
            }
            checkout_session.status = "payment_pending"
            checkout_session.save(update_fields=["payload", "status", "updated_at"])

            return Response(
                {
                    "checkout_id": str(checkout_session.id),
                    "payment": {
                        "payment_method": "Pesapal",
                        "amount": str(grand_total),
                        "provider_amount": str(grand_total),
                        "provider_currency": "KES",
                    },
                    "pesapal": pesapal_response,
                    "redirect_url": pesapal_response["redirect_url"],
                },
                status=status.HTTP_201_CREATED,
            )

        checkout_session.status = "payment_pending"
        checkout_session.save(update_fields=["status", "updated_at"])

        return Response(
            {
                "checkout_id": str(checkout_session.id),
                "payment": {
                    "payment_method": "M-Pesa",
                    "amount": str(grand_total),
                    "provider_amount": str(grand_total),
                    "provider_currency": "KES",
                },
                "mpesa": {"status": "ready"},
            },
            status=status.HTTP_201_CREATED,
        )
    except (ValueError, TypeError, ArithmeticError) as exc:
        return Response(
            {"success": False, "error": str(exc)},
            status=status.HTTP_400_BAD_REQUEST,
        )
    except RuntimeError as exc:
        return Response(
            {"success": False, "error": str(exc)},
            status=status.HTTP_502_BAD_GATEWAY,
        )


@api_view(["GET"])
@permission_classes([IsAuthenticatedOrVisitor])
def checkout_status(request, checkout_id):
    checkout_session = get_owned_checkout_session(request, checkout_id)
    if not checkout_session:
        return Response({"error": "Checkout session not found."}, status=404)

    return Response(
        {
            "checkout_id": str(checkout_session.id),
            "status": checkout_session.status,
            "order_id": checkout_session.order_id,
            "amount": str(checkout_session.amount),
            "payment_method": checkout_session.payment_method,
        }
    )
