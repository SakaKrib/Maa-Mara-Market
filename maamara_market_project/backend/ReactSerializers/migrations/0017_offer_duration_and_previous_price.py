from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("ReactSerializers", "0016_database_backed_item_taxonomy"),
    ]

    operations = [
        migrations.AddField(
            model_name="offer",
            name="duration_days",
            field=models.PositiveSmallIntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="offer",
            name="previous_discount_price",
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True),
        ),
    ]
