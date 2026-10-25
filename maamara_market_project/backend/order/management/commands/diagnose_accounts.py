from datetime import datetime

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db.models import Count, Sum
from django.utils import timezone
from rest_framework.test import APIRequestFactory, force_authenticate

from order.dashboardSummery import (
    DashboardSummaryView, channel_filter, orders_without_settled_payment, settled_payments,
)
from order.models import Order, Payment, Transaction


class Command(BaseCommand):
    help = "Read-only: show exactly what the Accounts page sees, step by step, and why a record is or is not counted."

    def handle(self, *args, **options):
        out = self.stdout.write
        today = timezone.localdate()
        start = timezone.make_aware(datetime.combine(today.replace(day=1), datetime.min.time()))
        end = timezone.now()
        out(self.style.MIGRATE_HEADING("Server"))
        out(f"time now: {end.isoformat()}  timezone: {timezone.get_current_timezone_name()}")
        out(f"period used (current month): {start.isoformat()} -> {end.isoformat()}")

        out(self.style.MIGRATE_HEADING("Payments (all time)"))
        total = Payment.objects.count()
        out(f"total payment rows: {total}")
        for row in Payment.objects.values("status", "payment_method", "payment_gateway").annotate(n=Count("id"), amt=Sum("amount")).order_by("status"):
            out(f"  status={row['status']:<10} method={row['payment_method']:<8} gateway={row['payment_gateway']:<8} count={row['n']} sum={row['amt']}")
        out(f"payments with no paid_at: {Payment.objects.filter(paid_at__isnull=True).count()}")

        out(self.style.MIGRATE_HEADING("How a payment reaches the income figure"))
        settled = settled_payments()
        in_period = settled.filter(settled_at__gte=start, settled_at__lte=end)
        out(f"1. all payments:                      {total}")
        out(f"2. paid/completed (settled):          {settled.count()}  sum={settled.aggregate(s=Sum('amount'))['s']}")
        out(f"3. ... settled in the current month:  {in_period.count()}  sum={in_period.aggregate(s=Sum('amount'))['s']}")
        for channel in ("mpesa", "paypal"):
            n = in_period.filter(channel_filter(channel)).count()
            out(f"   ... of which {channel}: {n}")
        for p in settled.order_by("-id")[:5]:
            out(f"   latest settled: payment#{p.pk} amount={p.amount} settled_at={p.settled_at} method={p.payment_method}")

        out(self.style.MIGRATE_HEADING("Orders"))
        for row in Order.objects.values("status").annotate(n=Count("id")).order_by("status"):
            out(f"  order status={row['status']:<22} count={row['n']}")
        out("orders (newest 10): id, status, ordered_date, updated_total_price, payment status/amount")
        for o in Order.objects.select_related("payment").order_by("-id")[:10]:
            pay = o.payment
            out(f"  #{o.pk} {o.status} {o.ordered_date:%Y-%m-%d %H:%M} total={o.updated_total_price} "
                f"payment={'NONE' if pay is None else f'{pay.status}/{pay.amount}'}")
        extra = list(orders_without_settled_payment(start, end))
        out(f"paid orders this month with no settled payment (added to income): {len(extra)}")

        out(self.style.MIGRATE_HEADING("Customer transactions"))
        for row in Transaction.objects.filter(transaction_type__in=["C2B", "PayPal"]).values("transaction_type", "payment_method", "status").annotate(n=Count("id"), amt=Sum("amount")):
            out(f"  {row['transaction_type']:<7} method={row['payment_method']:<8} status={row['status']:<10} count={row['n']} sum={row['amt']}")

        out(self.style.MIGRATE_HEADING("What the Accounts API returns right now"))
        admin = get_user_model().objects.filter(is_staff=True).first()
        if admin is None:
            out("no staff user found")
            return
        request = APIRequestFactory().get("/api/dashboard/summary/")
        force_authenticate(request, user=admin)
        data = DashboardSummaryView.as_view()(request).data
        out(f"calculation version: {data.get('calculation')}")
        out(f"income card: {data['summary_cards']['income']}")
        for name in ("paypal", "mpesa"):
            card = data["accounts"][name]
            out(f"{name} card: amount={card['amount']} payments={card.get('payments')} unmatched={card.get('unmatched')}")
