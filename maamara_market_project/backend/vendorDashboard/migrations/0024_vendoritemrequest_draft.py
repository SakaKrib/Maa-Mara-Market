from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("vendorDashboard", "0023_itemdraft_itemdraftmedia"),
    ]

    operations = [
        migrations.AddField(
            model_name="vendoritemrequest",
            name="draft",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="vendor_item_requests",
                to="vendorDashboard.itemdraft",
            ),
        ),
    ]
