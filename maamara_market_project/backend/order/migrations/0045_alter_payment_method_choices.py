from django.db import migrations, models


class Migration(migrations.Migration):
    """Sync stored choices metadata with the models (no schema change)."""

    dependencies = [
        ("oder", "0044_fulfillment_tracking"),
    ]

    operations = [
        migrations.AlterField(
            model_name="checkoutsession",
            name="payment_method",
            field=models.CharField(choices=[("Pesapal", "Pesapal"), ("PayPal", "PayPal"), ("M-Pesa", "M-Pesa")], max_length=20),
        ),
        migrations.AlterField(
            model_name="payment",
            name="payment_method",
            field=models.CharField(choices=[("UNKNOWN", "Unknown"), ("MPESA", "M-Pesa"), ("PAYPAL", "PayPal"), ("CARD", "Card")], default="UNKNOWN", max_length=20),
        ),
        migrations.AlterField(
            model_name="transaction",
            name="payment_method",
            field=models.CharField(choices=[("paypal", "PayPal"), ("mpesa", "M-Pesa"), ("pesapal", "Pesapal")], default="paypal", max_length=50),
        ),
    ]
