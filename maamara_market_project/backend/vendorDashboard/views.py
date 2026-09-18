from datetime import date
from decimal import Decimal
import uuid

from dateutil.relativedelta import relativedelta
from django.db.models import Count, ExpressionWrapper, F, FloatField, Sum
from django.db.models.functions import TruncMonth, TruncYear
from django.utils.timezone import now
from rest_framework import permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from ReactSerializers.Serializers import VendorPayoutSerializer
from ReactSerializers.models import Item
from oder.models import OderItem, Order
from .models import SoldItem, VendorAdjustment, VendorPayout

from django.http import HttpResponse

def dashboard(request):
    return HttpResponse("Welcome to the Vendor Dashboard!")


# mangin refund when the customer returns the ordered item
#payment logic to handle refunds payout culculation logic


# ==============================================================
# 💰 FUNCTION: get_month_range
# --------------------------------------------------------------


def get_month_range(months_back=6, include_current=False):
    today = date.today().replace(day=1)  # ✅ start of current month as date
    month_ranges = []

    # Add current month first if requested
    if include_current:
        start = today
        end = (today + relativedelta(months=1)) - relativedelta(days=1)  # last day of current month
        month_ranges.append((start, end))

    # Add previous months
    for i in range(1, months_back + 1):
        start = (today - relativedelta(months=i)).replace(day=1)
        end = (today - relativedelta(months=i - 1)) - relativedelta(days=1)
        month_ranges.append((start, end))

    return list(reversed(month_ranges))



# ==============================================================
# 💰 FUNCTION: get_vendor_earnings @@Adm
# --------------------------------------------------------------


def get_vendor_earnings(vendor, start_date, end_date):
    """
    🧾 Calculate a vendor's payout for a given date range,
    including difference from previous month payout.

    - Includes all completed, valid (non-refunded, non-returned, non-exchanged) orders.
    - Uses the vendor's actual price (excluding markup).
    - Applies any pending vendor adjustments for returns/exchanges.
    - Updates or creates a VendorPayout record for the period.
    """

    user = vendor.user
    vendor_items = Item.objects.filter(created_by=user)

    # Get all completed orders within date range
    completed_orders = Order.objects.filter(
        status="completed",
        ordered_date__range=(start_date, end_date)
    )
    completed_order_ids = completed_orders.values_list('id', flat=True)

    # Get all valid order items linked to those orders for this vendor
    order_items = OderItem.objects.filter(
        order_id__in=completed_order_ids,
        item__in=vendor_items,
        refunded=False,
        is_returned=False,
        is_exchanged=False,
    ).distinct()

    # Calculate gross sales using vendor-side pricing (excludes markup)
    gross_sales = Decimal("0.00")
    for oi in order_items:
        try:
            gross_sales += Decimal(str(oi.get_final_price_for_vendor()))
        except AttributeError:
            base_vendor_price = getattr(oi.item, "vendor_price", None) or getattr(oi.item, "price", 0)
            gross_sales += Decimal(str(base_vendor_price)) * oi.quantity

    # Fetch unapplied vendor adjustments in this period
    adjustments = VendorAdjustment.objects.filter(
        vendor=vendor,
        created_at__range=(start_date, end_date),
        applied=False
    )

    adjustment_total = Decimal("0.00")
    applied_adjustments = []

    # Process applicable adjustments (returns / exchanges)
    for adj in adjustments:
        if adj.order_item and (adj.order_item.is_returned or adj.order_item.is_exchanged):
            adjustment_total += adj.amount or Decimal("0.00")
            adj.applied = True
            adj.save()
            applied_adjustments.append(adj)

    # Compute vendor's final net payout for the month (without markup)
    net_total = gross_sales + adjustment_total

    # Customer-side income must be limited to this vendor's order items.
    customer_order_items = OderItem.objects.filter(
        order_id__in=completed_order_ids,
        item__in=vendor_items,
        refunded=False,
        is_returned=False,
        is_exchanged=False,
    )
    total_income = sum(
        (oi.get_final_price() for oi in customer_order_items),
        Decimal("0.00"),
    )

    # Calculate profit from this vendor's own sales only.
    profit = total_income - net_total

    # Create or update the VendorPayout record
    payout, created = VendorPayout.objects.get_or_create(
        vendor=vendor,
        payout_period_start=start_date,
        payout_period_end=end_date,
        defaults={
            "amount": net_total,
            "gross_sales": gross_sales,
            "adjustment_amount": adjustment_total,
            "income": total_income,
            "profit": profit,
            "reference": str(uuid.uuid4())[:8],  # Generate a short unique reference
        },
    )

    # Update payout fields to latest calculated values
    payout.gross_sales = gross_sales
    payout.adjustment_amount = adjustment_total
    payout.amount = net_total
    payout.income = total_income
    payout.profit = profit

    # Ensure payout has a reference (in case it was created before reference was added)
    if not payout.reference:
        payout.reference = str(uuid.uuid4())[:8]

    payout.save()

    # Attach any newly applied adjustments
    if applied_adjustments:
        payout.adjustments.set(applied_adjustments)

    # Calculate previous month range for difference calculation
    prev_start_date = (start_date - relativedelta(months=1)).replace(day=1)
    prev_end_date = (start_date - relativedelta(days=1)).replace(day=(start_date - relativedelta(days=1)).day)

    # Try to get previous payout
    previous_payout = VendorPayout.objects.filter(
        vendor=vendor,
        payout_period_start=prev_start_date,
        payout_period_end=prev_end_date,
    ).first()

    difference = None
    if previous_payout:
        difference = {
            "amount_diff": payout.amount - previous_payout.amount,
            "gross_sales_diff": payout.gross_sales - previous_payout.gross_sales,
            "adjustment_amount_diff": payout.adjustment_amount - previous_payout.adjustment_amount,
            "income_diff": payout.income - previous_payout.income,
            "profit_diff": payout.profit - previous_payout.profit,
            'reference' : payout.reference
        }

    return {
        "payout": payout,
        "difference": difference,
    }






# ==============================================================
# 💰 FUNCTION: get_monthly_vendor_report
# --------------------------------------------------------------

def get_monthly_vendor_report(vendor, months_back=6):
    reports = []

    # Generate month ranges
    for start, end in get_month_range(months_back):
        result = get_vendor_earnings(vendor, start, end)
        payout = result["payout"]

        reports.append({
            "month": start.strftime("%B %Y"),
            "gross_sales": payout.gross_sales or 0,
            "adjustments": payout.adjustment_amount or 0,
            "net_payout": payout.amount or 0,
            "paid": payout.paid,
        })

    return reports





# fetch for admin payouts
class AdminPayoutAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated, permissions.IsAdminUser]

    def get(self, request, format=None):
        payouts = VendorPayout.objects.all().order_by('-created_at')
        serializer = VendorPayoutSerializer(payouts, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)



# ==============================================================
# 💰 FUNCTION: get_monthly sale report
# --------------------------------------------------------------
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def monthly_sales_report(request):
    year = int(request.query_params.get('year', now().year))
    month = int(request.query_params.get('month', now().month))

    # Calculate total price per item as an expression
    total_price_expr = ExpressionWrapper(
        F('sale_price') * F('quantity'),
        output_field=FloatField()
    )

    # Query sales with annotation for calculated total price (rename to avoid conflict)
    sales_qs = SoldItem.objects.filter(
        date_sold__year=year,
        date_sold__month=month
    ).annotate(
        item_name=F('item__name'),
        vendor_price=F('sale_price'),
        qty_remaining=F('item__in_stock'),
        calculated_total_price=total_price_expr  # renamed annotation here
    ).values(
        'id', 'item_name', 'vendor_price', 'quantity', 'qty_remaining', 'date_sold', 'calculated_total_price'
    ).order_by('-date_sold')

    sales = list(sales_qs)

    # Aggregate total amount using the same expression
    total_amount = SoldItem.objects.filter(
        date_sold__year=year,
        date_sold__month=month
    ).aggregate(
        total=Sum(total_price_expr)
    )['total'] or 0

    # Get available months with sales (distinct year+month)
    months_qs = (
        SoldItem.objects
        .annotate(year=TruncYear('date_sold'), month=TruncMonth('date_sold'))
        .values('year', 'month')
        .annotate(count=Count('id'))
        .order_by('-year', '-month')
    )

    available_months = []
    for entry in months_qs:
        y = entry['year'].year
        m = entry['month'].month
        label = entry['month'].strftime('%b %Y')
        available_months.append({'year': y, 'month': m, 'label': label})

    return Response({
        'sales': sales,
        'total_amount': total_amount,
        'month': month,
        'year': year,
        'available_months': available_months,
    })