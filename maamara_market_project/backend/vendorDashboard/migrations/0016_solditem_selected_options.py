from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("vendorDashboard", "0015_vendorpayout_paypal_batch_id"),
    ]

    operations = [
        migrations.AddField(
            model_name="solditem",
            name="selected_weight",
            field=models.CharField(blank=True, max_length=50, null=True),
        ),
        migrations.AddField(
            model_name="solditem",
            name="selected_length",
            field=models.CharField(blank=True, max_length=50, null=True),
        ),
        migrations.AddField(
            model_name="solditem",
            name="shoe_size",
            field=models.CharField(blank=True, max_length=50, null=True),
        ),
    ]
