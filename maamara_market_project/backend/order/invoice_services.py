from django.db import transaction
from django.utils import timezone

from .invoice_models import Invoice


@transaction.atomic
def create_customer_invoice(order, payment, *, transaction_record=None):
    """Create exactly one invoice for a successfully completed customer payment."""
    invoice, created = Invoice.objects.get_or_create(
        payment=payment,
        defaults={
            "invoice_type": Invoice.TYPE_CUSTOMER,
            "user": order.user,
            "visitor_id": order.visitor_id,
            "order": order,
            "amount": payment.amount,
            "currency": (payment.provider_currency or "KES").upper(),
            "provider": payment.payment_method,
            "provider_reference": payment.transaction_id,
            "paid_at": timezone.now(),
            "metadata": {
                "order_id": order.id,
                "payment_id": payment.id,
                "transaction_id": payment.transaction_id,
            },
        },
    )

    changed = False
    if transaction_record and invoice.transaction_id != transaction_record.id:
        invoice.transaction = transaction_record
        changed = True
    if not invoice.order_id:
        invoice.order = order
        changed = True
    if not invoice.user_id and order.user_id:
        invoice.user = order.user
        changed = True
    if changed:
        invoice.save(update_fields=["transaction", "order", "user"])

    return invoice, created


@transaction.atomic
def create_vendor_payout_invoice(payout, *, transaction_record=None):
    """Create exactly one invoice when a vendor payout is provider-confirmed."""
    invoice, created = Invoice.objects.get_or_create(
        invoice_type=Invoice.TYPE_VENDOR,
        payout_reference=payout.reference,
        defaults={
            "user": payout.vendor.user,
            "amount": payout.amount,
            "currency": (
                getattr(payout, "paypal_currency", None)
                or getattr(payout.vendor, "bank_currency", None)
                or "KES"
            ).upper(),
            "provider": payout.vendor.payment_method,
            "provider_reference": (
                getattr(payout, "mpesa_transaction_id", None)
                or getattr(payout, "paypal_transaction_id", None)
                or getattr(payout, "kcb_provider_reference", None)
            ),
            "paid_at": payout.paid_at or timezone.now(),
            "metadata": {
                "payout_reference": payout.reference,
                "vendor_id": payout.vendor_id,
                "vendor_company": payout.vendor.company_name,
            },
        },
    )

    provider_reference = (
        getattr(payout, "mpesa_transaction_id", None)
        or getattr(payout, "paypal_transaction_id", None)
        or getattr(payout, "kcb_provider_reference", None)
    )
    if provider_reference != invoice.provider_reference:
        invoice.provider_reference = provider_reference
        invoice.paid_at = payout.paid_at or invoice.paid_at
        invoice.save(update_fields=["provider_reference", "paid_at"])

    return invoice, created
