from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("oder", "0003_align_current_models"),
    ]

    operations = [
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
            field=models.CharField(blank=True, max_length=3, null=True),
        ),
    ]
