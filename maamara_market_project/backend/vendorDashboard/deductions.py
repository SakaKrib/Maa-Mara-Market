"""Take back from a vendor money they were already paid for a sale that was refunded or exchanged."""
import logging
from decimal import Decimal

from vendorDashboard.models import Vendor, VendorAdjustment, VendorPayout
from vendorDashboard.sales_overview import SUBMITTED_PAYOUT

logger = logging.getLogger(__name__)
ZERO = Decimal("0.00")


def vendor_share(order_item):
    """What the vendor earned on this line (their own price, without the platform markup)."""
    try:
        return Decimal(str(order_item.get_final_price_for_vendor())).quantize(Decimal("0.01"))
    except AttributeError:
        base = getattr(order_item.item, "vendor_price", None) or getattr(order_item.item, "price", 0)
        return (Decimal(str(base)) * order_item.quantity).quantize(Decimal("0.01"))


def vendor_was_paid_for(order_item):
    """True if a payout containing this line was paid or handed to a payment provider."""
    return VendorPayout.objects.filter(order_items=order_item).filter(SUBMITTED_PAYOUT).exists()


def register_vendor_deduction(order_item, reason, preference="refund"):
    """Record a negative adjustment when the vendor already received money for ``order_item``.

    * Not paid yet: nothing to take back. The line is flagged refunded/exchanged, so it drops
      out of every payout and the vendor is simply never paid for it.
    * Already paid: a negative adjustment of the vendor's own share is created (once per line)
      and is taken from the vendor's next payout(s) until fully recovered.
    Returns the adjustment, or None when no deduction is needed.
    """
    if not vendor_was_paid_for(order_item):
        return None
    existing = VendorAdjustment.objects.filter(order_item=order_item, kind="vendor_deduction").first()
    if existing:
        return existing
    vendor = Vendor.objects.filter(user=order_item.item.created_by).first()
    if vendor is None:
        logger.error("No vendor found to deduct for order item %s", order_item.pk)
        return None
    share = vendor_share(order_item)
    if share <= 0:
        return None
    return VendorAdjustment.objects.create(
        vendor=vendor,
        order_item=order_item,
        amount=-share,
        reason=reason,
        customer_preference=preference,
        is_approved=True,
        kind="vendor_deduction",
    )
