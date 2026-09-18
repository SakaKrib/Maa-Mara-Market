import core.models
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0013_alter_voucher_expiry_date"),
    ]

    operations = [
        migrations.AlterField(
            model_name="voucher",
            name="expiry_date",
            field=models.DateField(default=core.models.default_voucher_expiry_date),
        ),
        migrations.AlterField(
            model_name="voucher",
            name="visitor_id",
            field=models.CharField(blank=True, db_index=True, max_length=64, null=True),
        ),
        migrations.AlterField(
            model_name="supportmessage",
            name="visitor_id",
            field=models.CharField(blank=True, db_index=True, max_length=64, null=True),
        ),
        migrations.AlterField(
            model_name="notification",
            name="visitor_id",
            field=models.CharField(blank=True, db_index=True, max_length=64, null=True),
        ),
    ]
