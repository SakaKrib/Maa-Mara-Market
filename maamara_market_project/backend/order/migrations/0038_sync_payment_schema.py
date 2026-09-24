from django.db import migrations, models


def populate_merchant_references(apps, schema_editor):
    Payment = apps.get_model("oder", "Payment")
    for payment in Payment.objects.filter(merchant_reference__isnull=True).iterator():
        payment.merchant_reference = f"LEGACY-PAYMENT-{payment.pk}"
        payment.save(update_fields=["merchant_reference"])


class Migration(migrations.Migration):

    dependencies = [
        ("oder", "0037_order_checkout_payment_data"),
    ]

    operations = [
        migrations.RenameField(
            model_name="payment",
            old_name="timestamp",
            new_name="created_at",
        ),
        migrations.AddField(
            model_name="payment",
            name="payment_gateway",
            field=models.CharField(
                choices=[("PESAPAL", "Pesapal"), ("PAYPAL", "PayPal")],
                default="PESAPAL",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="payment",
            name="currency",
            field=models.CharField(default="KES", max_length=10),
        ),
        migrations.AddField(
            model_name="payment",
            name="merchant_reference",
            field=models.CharField(blank=True, max_length=100, null=True),
        ),
        migrations.AddField(
            model_name="payment",
            name="order_tracking_id",
            field=models.CharField(blank=True, max_length=100, null=True),
        ),
        migrations.AddField(
            model_name="payment",
            name="callback_payload",
            field=models.JSONField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="payment",
            name="paid_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="payment",
            name="updated_at",
            field=models.DateTimeField(auto_now=True),
        ),
        migrations.AddField(
            model_name="payment",
            name="provider_amount",
            field=models.DecimalField(
                blank=True,
                decimal_places=2,
                max_digits=12,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="payment",
            name="provider_currency",
            field=models.CharField(blank=True, max_length=10, null=True),
        ),
        migrations.RunPython(
            populate_merchant_references,
            migrations.RunPython.noop,
        ),
        migrations.AlterField(
            model_name="payment",
            name="merchant_reference",
            field=models.CharField(max_length=100, unique=True),
        ),
    ]
