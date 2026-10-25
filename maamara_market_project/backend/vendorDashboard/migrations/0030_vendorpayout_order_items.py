from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("oder", "0045_alter_payment_method_choices"),
        ("vendorDashboard", "0029_payout_batches"),
    ]

    operations = [
        migrations.AlterUniqueTogether(name="vendorpayout", unique_together=set()),
        migrations.AddField(
            model_name="vendorpayout",
            name="order_items",
            field=models.ManyToManyField(blank=True, related_name="vendor_payouts", to="oder.orderitem"),
        ),
    ]
