from django.core.management.base import BaseCommand

from order.dashboardSummery import channel_filter, settled_payments
from order.models import Transaction


class Command(BaseCommand):
    help = (
        "Read-only: list customer PayPal/M-Pesa transactions that have no confirmed "
        "payment behind them, with the order and payment details to review."
    )

    def handle(self, *args, **options):
        total = 0
        for channel in ("paypal", "mpesa"):
            covered = settled_payments().filter(channel_filter(channel)).values("pk")
            rows = (
                Transaction.objects.filter(
                    transaction_type__in=["C2B", "PayPal"], payment_method__iexact=channel,
                    payout__isnull=True, status__iexact="completed",
                )
                .exclude(payment__in=covered)
                .select_related("order", "payment")
                .order_by("id")
            )
            self.stdout.write(self.style.MIGRATE_HEADING(f"{channel.upper()}: {rows.count()} unmatched"))
            for tx in rows:
                total += 1
                self.stdout.write(
                    f"  tx#{tx.pk} ref={tx.paypal_transaction_id or tx.mpesa_receipt_number or '-'} "
                    f"amount={tx.amount} created={tx.created_at:%Y-%m-%d %H:%M} "
                    f"order={tx.order_id or '-'} order_status={getattr(tx.order, 'status', '-')} "
                    f"payment={tx.payment_id or 'NONE'} payment_status={getattr(tx.payment, 'status', '-')}"
                )
        self.stdout.write(f"Total unmatched: {total}")
