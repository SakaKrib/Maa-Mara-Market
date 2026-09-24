from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("oder", "0039_sync_transaction_card_column"),
    ]

    operations = [
        migrations.RemoveField(
            model_name="transaction",
            name="card",
        ),
        migrations.RemoveField(
            model_name="transaction",
            name="card_brand",
        ),
        migrations.RemoveField(
            model_name="transaction",
            name="card_type",
        ),
        migrations.RemoveField(
            model_name="transaction",
            name="last_4_digits",
        ),
        migrations.DeleteModel(
            name="Card",
        ),
        migrations.AlterField(
            model_name="payment",
            name="payment_method",
            field=models.CharField(
                choices=[
                    ("UNKNOWN", "Unknown"),
                    ("MPESA", "M-Pesa"),
                ],
                default="UNKNOWN",
                max_length=20,
            ),
        ),
        migrations.AlterField(
            model_name="transaction",
            name="payment_method",
            field=models.CharField(
                choices=[
                    ("paypal", "PayPal"),
                    ("mpesa", "M-Pesa"),
                ],
                default="paypal",
                max_length=50,
            ),
        ),
    ]
