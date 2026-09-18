from datetime import date, timedelta


def default_voucher_expiry_date():
    """Return a rolling 30-day default for newly issued vouchers."""
    return date.today() + timedelta(days=30)
