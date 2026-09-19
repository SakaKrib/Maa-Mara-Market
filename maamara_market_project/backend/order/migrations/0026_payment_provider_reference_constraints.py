from django.db import migrations, models
from django.db.models import Q


class Migration(migrations.Migration):
    dependencies = [
        ("oder", "0025_pending_order_owner_constraint"),
    ]

    operations = [
        migrations.AddConstraint(
            model_name="transaction",
            constraint=models.UniqueConstraint(
                fields=("mpesa_receipt_number",),
                condition=(
                    Q(transaction_type="C2B")
                    & Q(mpesa_receipt_number__isnull=False)
                    & ~Q(mpesa_receipt_number="")
                ),
                name="uniq_c2b_mpesa_receipt",
            ),
        ),
        migrations.AddConstraint(
            model_name="transaction",
            constraint=models.UniqueConstraint(
                fields=("account_reference",),
                condition=(
                    Q(transaction_type="C2B")
                    & Q(account_reference__isnull=False)
                    & ~Q(account_reference="")
                ),
                name="uniq_c2b_account_reference",
            ),
        ),
        migrations.AddConstraint(
            model_name="transaction",
            constraint=models.UniqueConstraint(
                fields=("paypal_transaction_id",),
                condition=(
                    Q(transaction_type="PayPal")
                    & Q(paypal_transaction_id__isnull=False)
                    & ~Q(paypal_transaction_id="")
                ),
                name="uniq_paypal_transaction_id",
            ),
        ),
    ]
