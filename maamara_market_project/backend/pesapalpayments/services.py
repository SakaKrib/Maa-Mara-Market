import uuid
import logging
from decimal import Decimal

import requests
from django.conf import settings
from django.db import transaction
from django.utils import timezone

from .models import PesapalTransaction


logger = logging.getLogger(__name__)


class PesaPalService:
    @classmethod
    def _base_url(cls):
        return str(getattr(settings, "PESAPAL_BASE_URL", "")).rstrip("/")

    @classmethod
    def get_access_token(cls):
        base_url = cls._base_url()
        consumer_key = getattr(settings, "PESAPAL_CONSUMER_KEY", "")
        consumer_secret = getattr(settings, "PESAPAL_CONSUMER_SECRET", "")

        if not all((base_url, consumer_key, consumer_secret)):
            raise RuntimeError("Pesapal payment configuration is incomplete.")

        try:
            response = requests.post(
                f"{base_url}/api/Auth/RequestToken",
                json={
                    "consumer_key": consumer_key,
                    "consumer_secret": consumer_secret,
                },
                headers={
                    "Accept": "application/json",
                    "Content-Type": "application/json",
                },
                timeout=30,
            )
            response.raise_for_status()
            token = response.json().get("token")
            if not token:
                raise RuntimeError("Pesapal did not return an access token.")
            return token
        except requests.RequestException:
            logger.exception("Pesapal authentication request failed.")
            raise RuntimeError("Unable to connect to the payment provider.")

    @classmethod
    def initialize_payment(cls, checkout_session):
        from order.models import CheckoutSession

        if not isinstance(checkout_session, CheckoutSession):
            raise ValueError("Invalid checkout session.")

        notification_id = getattr(settings, "PESAPAL_NOTIFICATION_ID", "")
        callback_url = getattr(settings, "PESAPAL_CALLBACK_URL", "")
        if not notification_id or not callback_url:
            raise RuntimeError("Pesapal callback configuration is incomplete.")

        payload_data = checkout_session.payload or {}
        billing = payload_data.get("billing") or {}
        merchant_reference = f"MM-{uuid.uuid4().hex[:24].upper()}"
        amount = Decimal(str(checkout_session.amount))

        transaction_record = PesapalTransaction.objects.create(
            checkout_session=checkout_session,
            customer=checkout_session.user,
            merchant_reference=merchant_reference,
            amount=amount,
            currency=checkout_session.currency or "KES",
            status="initialized",
        )

        payload = {
            "id": merchant_reference,
            "currency": checkout_session.currency or "KES",
            "amount": float(amount),
            "description": f"Maa Mara Market checkout {checkout_session.id}",
            "callback_url": callback_url,
            "notification_id": notification_id,
            "billing_address": {
                "email_address": billing.get("email", ""),
                "phone_number": billing.get("phone", ""),
                "country_code": str(billing.get("country", "KE"))[:2].upper(),
                "first_name": billing.get("first_name", ""),
                "middle_name": "",
                "last_name": billing.get("last_name", ""),
                "line_1": billing.get("street_address", ""),
                "line_2": billing.get("appartment_address", ""),
                "city": billing.get("city", ""),
                "state": billing.get("state", ""),
                "postal_code": "",
                "zip_code": billing.get("zip", ""),
            },
        }

        try:
            token = cls.get_access_token()
            response = requests.post(
                f"{cls._base_url()}/api/Transactions/SubmitOrderRequest",
                json=payload,
                headers={
                    "Authorization": f"Bearer {token}",
                    "Accept": "application/json",
                    "Content-Type": "application/json",
                },
                timeout=30,
            )
            response.raise_for_status()
            data = response.json()
        except (requests.RequestException, ValueError):
            transaction_record.status = "failed"
            transaction_record.pesapal_response = {"status": "provider_error"}
            transaction_record.save(update_fields=["status", "pesapal_response", "updated_at"])
            logger.exception("Pesapal payment initialization failed.")
            raise RuntimeError("Unable to initialize Pesapal payment.")

        tracking_id = data.get("order_tracking_id")
        if not tracking_id or str(data.get("status")) != "200":
            transaction_record.status = "failed"
            transaction_record.pesapal_response = {
                "status": data.get("status"),
                "message": data.get("message"),
            }
            transaction_record.save(update_fields=["status", "pesapal_response", "updated_at"])
            raise RuntimeError("Pesapal did not accept the payment request.")

        transaction_record.order_tracking_id = tracking_id
        transaction_record.status = "pending"
        transaction_record.pesapal_response = {
            "status": data.get("status"),
            "merchant_reference": data.get("merchant_reference"),
            "order_tracking_id": tracking_id,
        }
        transaction_record.save(
            update_fields=[
                "order_tracking_id",
                "status",
                "pesapal_response",
                "updated_at",
            ]
        )

        return {
            "merchant_reference": merchant_reference,
            "order_tracking_id": tracking_id,
            "redirect_url": data.get("redirect_url"),
        }

    @classmethod
    @transaction.atomic
    def verify_payment(cls, order_tracking_id):
        from order.checkout_sessions import materialize_paid_checkout
        from order.models import CheckoutSession

        if not order_tracking_id:
            raise ValueError("Missing Pesapal order tracking ID.")

        record = (
            PesapalTransaction.objects
            .select_for_update()
            .select_related("order")
            .filter(order_tracking_id=order_tracking_id)
            .first()
        )
        if not record:
            raise ValueError("Pesapal transaction not found.")

        token = cls.get_access_token()
        try:
            response = requests.get(
                f"{cls._base_url()}/api/Transactions/GetTransactionStatus",
                params={"orderTrackingId": order_tracking_id},
                headers={
                    "Authorization": f"Bearer {token}",
                    "Accept": "application/json",
                },
                timeout=30,
            )
            response.raise_for_status()
            data = response.json()
        except (requests.RequestException, ValueError):
            logger.exception("Pesapal payment verification failed.")
            raise RuntimeError("Unable to verify payment with the provider.")

        status_text = str(data.get("payment_status_description") or "").strip().lower()
        provider_amount = data.get("amount")
        provider_currency = str(data.get("currency") or record.currency).upper()

        if status_text == "completed":
            if provider_amount is not None and Decimal(str(provider_amount)).quantize(Decimal("0.01")) != record.amount.quantize(Decimal("0.01")):
                raise ValueError("Pesapal payment amount does not match the checkout.")

            if provider_currency != record.currency.upper():
                raise ValueError("Pesapal payment currency does not match the checkout.")

            record.status = "completed"
            record.payment_method = data.get("payment_method")
            record.payment_account = data.get("payment_account")
            record.paid_at = timezone.now()
            record.pesapal_response = {
                "payment_status_description": data.get("payment_status_description"),
                "payment_method": data.get("payment_method"),
                "payment_account": data.get("payment_account"),
                "confirmation_code": data.get("confirmation_code"),
                "amount": data.get("amount"),
                "currency": data.get("currency"),
            }
            record.save(
                update_fields=[
                    "status",
                    "payment_method",
                    "payment_account",
                    "paid_at",
                    "pesapal_response",
                    "updated_at",
                ]
            )

            if record.order_id:
                return record.order

            session = CheckoutSession.objects.select_for_update().get(pk=record.checkout_session_id)
            if not session:
                raise ValueError("Checkout session for Pesapal transaction was not found.")

            order, _ = materialize_paid_checkout(
                session,
                transaction_id=data.get("confirmation_code") or order_tracking_id,
                provider_amount=provider_amount,
                provider_currency=provider_currency,
            )

            actual_method = str(data.get("payment_method") or "UNKNOWN").upper()
            if "MPESA" in actual_method or "M-PESA" in actual_method:
                payment_method = "MPESA"
            elif "CARD" in actual_method:
                payment_method = "CARD"
            else:
                payment_method = "UNKNOWN"

            payment = order.payment
            payment.payment_gateway = "PESAPAL"
            payment.payment_method = payment_method
            payment.merchant_reference = record.merchant_reference
            payment.order_tracking_id = order_tracking_id
            payment.paid_at = timezone.now()
            payment.provider_amount = provider_amount
            payment.provider_currency = provider_currency
            payment.transaction_id = data.get("confirmation_code") or order_tracking_id
            payment.callback_payload = data
            payment.save(
                update_fields=[
                    "payment_gateway",
                    "payment_method",
                    "merchant_reference",
                    "order_tracking_id",
                    "paid_at",
                    "provider_amount",
                    "provider_currency",
                    "transaction_id",
                    "callback_payload",
                    "updated_at",
                ]
            )

            from order.order_completion import complete_paid_order

            locked_order, _ = complete_paid_order(
                order,
                payment,
                transaction_id=data.get("confirmation_code") or order_tracking_id,
            )

            from order.models import Transaction

            vendor_items = (
                locked_order.order_items
                .select_related("item__vendor")
                .all()
            )
            vendor_totals = {}
            for order_item in vendor_items:
                vendor = getattr(order_item.item, "vendor", None)
                if not vendor:
                    continue
                vendor_totals[vendor.id] = vendor_totals.get(vendor.id, Decimal("0.00")) + order_item.get_final_price_for_vendor()

            for vendor_id, vendor_amount in vendor_totals.items():
                Transaction.objects.update_or_create(
                    account_reference=f"{record.merchant_reference}-{vendor_id}",
                    vendor_id=vendor_id,
                    defaults={
                        "transaction_type": "C2B",
                        "payment_method": "pesapal",
                        "order": locked_order,
                        "payment": payment,
                        "amount": vendor_amount,
                        "status": "completed",
                        "visitor_id": locked_order.visitor_id,
                        "raw_data": {
                            "provider": "PESAPAL",
                            "merchant_reference": record.merchant_reference,
                            "order_tracking_id": order_tracking_id,
                            "confirmation_code": data.get("confirmation_code"),
                            "currency": provider_currency,
                        },
                    },
                )

            record.order = locked_order
            record.save(update_fields=["order", "updated_at"])
            return locked_order

        if status_text in {"cancelled", "failed", "invalid"}:
            record.status = "cancelled" if status_text == "cancelled" else "failed"
        else:
            record.status = "pending"

        record.payment_method = data.get("payment_method")
        record.payment_account = data.get("payment_account")
        record.pesapal_response = {
            "payment_status_description": data.get("payment_status_description"),
            "payment_method": data.get("payment_method"),
            "payment_account": data.get("payment_account"),
        }
        record.save(update_fields=["status", "payment_method", "payment_account", "pesapal_response", "updated_at"])
        return None
