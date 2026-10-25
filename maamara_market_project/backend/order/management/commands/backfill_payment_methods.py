from django.core.management.base import BaseCommand
from django.utils import timezone

from order.models import Payment, Transaction


class Command(BaseCommand):
    help = (
        "Set the payment method (and paid time) on older payments that were saved "
        "as UNKNOWN, using the customer transaction recorded for them."
    )

    def handle(self, *args, **options):
        fixed = 0
        for payment in Payment.objects.filter(payment_method="UNKNOWN"):
            transaction = (
                Transaction.objects.filter(
                    payment=payment, transaction_type__in=["C2B", "PayPal"], payout__isnull=True
                )
                .order_by("id")
                .first()
            )
            channel = (transaction.payment_method or "").lower() if transaction else ""
            if channel not in {"mpesa", "paypal"}:
                continue
            payment.payment_method = channel.upper()
            payment.payment_gateway = channel.upper()
            fields = ["payment_method", "payment_gateway"]
            if not payment.paid_at and str(payment.status).upper() in {"PAID", "COMPLETED"}:
                payment.paid_at = transaction.created_at or timezone.now()
                fields.append("paid_at")
            payment.save(update_fields=fields)
            fixed += 1
        self.stdout.write(self.style.SUCCESS(f"Updated {fixed} payment(s)."))
