"""One place for how a Payment's status and method are spelled.

Payments are saved as status "PAID" and method "PAYPAL"/"MPESA", while the refund ledger
uses "PayPal"/"Mpesa". Comparing the raw strings made every refund and exchange approval fail.
"""

# A payment that took money and can still be refunded or exchanged.
REFUNDABLE_PAYMENT_STATUSES = {"paid", "completed", "partially_refunded"}


def is_refundable_status(status):
    return str(status or "").lower() in REFUNDABLE_PAYMENT_STATUSES


def canonical_provider(payment_method):
    """"PAYPAL"/"PayPal" -> "PayPal", "MPESA"/"M-Pesa"/"Mpesa" -> "Mpesa", anything else -> None."""
    key = "".join(ch for ch in str(payment_method or "").lower() if ch.isalnum())
    return {"paypal": "PayPal", "mpesa": "Mpesa"}.get(key)
