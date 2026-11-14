from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("vendorDashboard", "0030_vendorpayout_order_items"),
    ]

    operations = [
        migrations.AddField(
            model_name="vendoradjustment",
            name="kind",
            field=models.CharField(
                choices=[("customer", "Customer record"), ("vendor_deduction", "Vendor deduction")],
                default="customer",
                max_length=20,
            ),
        ),
    ]
