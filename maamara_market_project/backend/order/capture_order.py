import requests
from decimal import Decimal

from django.conf import settings
from django.db import transaction
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework import status

from .Payment import get_paypal_access_token
from .checkout_sessions import get_owned_checkout_session, materialize_paid_checkout
from .models import CheckoutSession, Transaction
from .views import IsAuthenticatedOrVisitor


def get_capture_details(capture_id):
    paypal = settings.PAYMENT_GATEWAYS["paypal"]
    token = get_paypal_access_token()
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {token}",
    }

    response = requests.get(
        f"{paypal['base_url'].rstrip('/')}/v2/payments/captures/{capture_id}",
        headers=headers,
        timeout=10,
    )
    if response.status_code != 200:
        raise ValueError("Failed to fetch PayPal capture details.")

    data = response.json()
    amount = data.get("amount", {})
    return {
        "capture_id": capture_id,
        "status": (data.get("status") or "").capitalize(),
        "amount": amount.get("value", "0.00"),
        "currency": amount.get("currency_code", "USD"),
        "raw_data": data,
    }


@api_view(["POST"])
@permission_classes([IsAuthenticatedOrVisitor])
def capture_paypal_order(request, order_id):
    """
    Capture a PayPal provider order and only then materialize the local
    BillingAddress, Payment, Order and OrderItem records.
    """
    try:
        checkout_session = get_owned_checkout_session(
            request,
            order_id if order_id else request.data.get("checkout_id"),
        )
        if not checkout_session:
            checkout_session = CheckoutSession.objects.filter(paypal_order_id=order_id).first()
            if not checkout_session or not (
                checkout_session.status in {"payment_pending", "completed"}
                and (
                    checkout_session.user_id == getattr(request.user, "id", None)
                    if request.user and request.user.is_authenticated
                    else checkout_session.user_id is None
                    and checkout_session.visitor_id == request.COOKIES.get("visitorId")
                )
            ):
                return Response({"status": "error", "message": "PayPal checkout not found."}, status=404)

        if checkout_session.status == "completed" and checkout_session.order_id:
            return Response({
                "status": "ok",
                "message": "Payment already completed.",
                "order": {
                    "id": checkout_session.order_id,
                    "status": "completed",
                    "paypal_order_id": checkout_session.paypal_order_id,
                },
            })

        paypal = settings.PAYMENT_GATEWAYS["paypal"]
        token = get_paypal_access_token()
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {token}",
        }

        response = requests.post(
            f"{paypal['base_url'].rstrip('/')}/v2/checkout/orders/{checkout_session.paypal_order_id}/capture",
            headers=headers,
            timeout=15,
        )

        try:
            capture_response = response.json()
        except ValueError:
            capture_response = {}

        if response.status_code == 422:
            details = capture_response.get("details", [])
            already_captured = any(
                detail.get("issue") == "ORDER_ALREADY_CAPTURED"
                for detail in details
            )
            if already_captured:
                order_response = requests.get(
                    f"{paypal['base_url'].rstrip('/')}/v2/checkout/orders/{checkout_session.paypal_order_id}",
                    headers=headers,
                    timeout=10,
                )
                if order_response.status_code != 200:
                    return Response(
                        {"status": "error", "message": "Unable to verify the existing PayPal capture."},
                        status=502,
                    )
                capture_response = order_response.json()
            else:
                return Response(
                    {"status": "error", "message": "PayPal capture request failed."},
                    status=422,
                )
        elif response.status_code not in (200, 201):
            return Response(
                {"status": "error", "message": "PayPal capture request failed."},
                status=response.status_code,
            )

        purchase_units = capture_response.get("purchase_units") or []
        captures = (
            purchase_units[0].get("payments", {}).get("captures", [])
            if purchase_units
            else []
        )
        capture = captures[0] if captures else None

        if not capture:
            return Response(
                {"status": "error", "message": "PayPal capture did not return a capture record."},
                status=502,
            )

        capture_id = capture.get("id")
        provider_amount = Decimal(str(capture.get("amount", {}).get("value", "0.00")))
        provider_currency = str(
            capture.get("amount", {}).get("currency_code", "USD")
        ).upper()

        expected_amount = None
        if checkout_session.payment_method == "PayPal":
            expected_amount = (
                Decimal(str(capture_response.get("purchase_units", [{}])[0]
                    .get("amount", {})
                    .get("value", provider_amount)))
            )
        expected_provider_amount = Decimal(str(
            checkout_session.payload.get("paypal", {}).get("provider_amount", provider_amount)
        ))

        if (
            not capture_id
            or provider_amount != expected_provider_amount
            or provider_currency != "USD"
            or str(capture.get("status", "")).upper() != "COMPLETED"
        ):
            return Response(
                {"status": "error", "message": "PayPal payment validation failed."},
                status=400,
            )

        with transaction.atomic():
            order, created = materialize_paid_checkout(
                checkout_session,
                transaction_id=capture_id,
                provider_amount=provider_amount,
                provider_currency=provider_currency,
            )
            from .order_completion import complete_paid_order
            locked_order, completed = complete_paid_order(
                order,
                order.payment,
                transaction_id=capture_id,
            )

            Transaction.objects.update_or_create(
                paypal_transaction_id=capture_id,
                order=locked_order,
                defaults={
                    "transaction_type": "PayPal",
                    "payment_method": "paypal",
                    "amount": provider_amount,
                    "status": "completed",
                    "payment": locked_order.payment,
                    "visitor_id": locked_order.visitor_id,
                    "raw_data": capture_response,
                },
            )

        return Response({
            "status": "ok",
            "message": "Payment completed",
            "order": {
                "id": locked_order.id,
                "status": locked_order.status,
                "paypal_order_id": locked_order.paypal_order_id,
            },
        })

    except (ValueError, KeyError, TypeError, ArithmeticError):
        return Response(
            {"status": "error", "message": "PayPal payment validation failed."},
            status=400,
        )
    except requests.exceptions.RequestException:
        return Response(
            {"status": "error", "message": "PayPal payment provider request failed."},
            status=502,
        )
    except Exception:
        return Response(
            {"status": "error", "message": "Payment capture failed."},
            status=500,
        )
