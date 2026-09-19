from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("oder", "0028_refund_ledger"),
    ]

    operations = [
        migrations.AlterField(
            model_name="refund",
            name="provider",
            field=models.CharField(
                choices=[
                    ("PayPal", "PayPal"),
                    ("Mpesa", "M-Pesa"),
                    ("card", "Card"),
                ],
                max_length=20,
            ),
        ),
    ]
