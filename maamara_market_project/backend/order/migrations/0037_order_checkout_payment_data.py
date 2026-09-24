from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("oder", "0036_checkoutsession_order"),
    ]

    operations = [
        migrations.AddField(
            model_name="order",
            name="checkout_billing_data",
            field=models.JSONField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="order",
            name="pending_payment_reference",
            field=models.CharField(blank=True, db_index=True, max_length=100, null=True),
        ),
    ]
