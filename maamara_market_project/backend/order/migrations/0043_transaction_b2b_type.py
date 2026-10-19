from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("oder", "0042_pesapal_checkout_session"),
    ]

    operations = [
        migrations.AlterField(
            model_name="transaction",
            name="transaction_type",
            field=models.CharField(
                choices=[
                    ("C2B", "Customer to Business"),
                    ("B2C", "Business to Customer"),
                    ("B2B", "Business to Business"),
                    ("PayPal", "PayPal Payment"),
                    ("BANK_TRANSFER", "Bank Transfer"),
                ],
                max_length=15,
            ),
        ),
    ]
