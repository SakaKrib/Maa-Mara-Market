from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("vendorDashboard", "0026_vendordraft_identity_images"),
    ]

    operations = [
        migrations.AddField(
            model_name="vendor",
            name="mpesa_paybill_account",
            field=models.CharField(blank=True, max_length=50, null=True),
        ),
    ]
