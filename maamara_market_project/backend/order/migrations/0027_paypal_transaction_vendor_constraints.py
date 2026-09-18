from django.db import migrations, models
from django.db.models import Q


class Migration(migrations.Migration):
    dependencies = [
        ("order", "0026_payment_provider_reference_constraints"),
    ]

    operations = [
        migrations.RemoveConstraint(
            model_name="transaction",
            name="uniq_paypal_transaction_id",
        ),
        migrations.AddConstraint(
            model_name="transaction",
            constraint=models.UniqueConstraint(
                fields=("payment", "paypal_transaction_id", "vendor"),
                condition=(
                    Q(transaction_type="PayPal")
                    & Q(paypal_transaction_id__isnull=False)
                    & ~Q(paypal_transaction_id="")
                    & Q(vendor__isnull=False)
                ),
                name="uniq_paypal_transaction_vendor",
            ),
        ),
        migrations.AddConstraint(
            model_name="transaction",
            constraint=models.UniqueConstraint(
                fields=("payment", "paypal_transaction_id"),
                condition=(
                    Q(transaction_type="PayPal")
                    & Q(paypal_transaction_id__isnull=False)
                    & ~Q(paypal_transaction_id="")
                    & Q(vendor__isnull=True)
                ),
                name="uniq_paypal_transaction_no_vendor",
            ),
        ),
    ]
