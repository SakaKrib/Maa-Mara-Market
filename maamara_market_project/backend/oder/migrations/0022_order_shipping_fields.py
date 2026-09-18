from django.db import migrations, models
import decimal


class Migration(migrations.Migration):

    dependencies = [
        ("oder", "0021_oderitem_selected_weight"),
    ]

    operations = [
        migrations.AddField(
            model_name="order",
            name="shipping_amount",
            field=models.DecimalField(
                decimal_places=2,
                default=decimal.Decimal("0.00"),
                max_digits=12,
            ),
        ),
        migrations.AddField(
            model_name="order",
            name="shipping_provider",
            field=models.CharField(blank=True, max_length=32, null=True),
        ),
        migrations.AddField(
            model_name="order",
            name="shipping_service",
            field=models.CharField(blank=True, max_length=128, null=True),
        ),
        migrations.AddField(
            model_name="order",
            name="shipping_provider_amount",
            field=models.DecimalField(
                blank=True,
                decimal_places=2,
                max_digits=12,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="order",
            name="shipping_currency",
            field=models.CharField(blank=True, max_length=3, null=True),
        ),
    ]
