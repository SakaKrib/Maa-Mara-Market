from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("vendorDashboard", "0017_vendorpayout_mpesa_callback_indexes"),
    ]

    operations = [
        migrations.AddConstraint(
            model_name="returnrequest",
            constraint=models.UniqueConstraint(
                fields=("item",),
                name="uniq_return_request_per_order_item",
            ),
        ),
        migrations.AddIndex(
            model_name="returnrequest",
            index=models.Index(
                fields=("customer", "status"),
                name="return_customer_status_idx",
            ),
        ),
        migrations.AddIndex(
            model_name="returnrequest",
            index=models.Index(
                fields=("visitor_id", "status"),
                name="return_visitor_status_idx",
            ),
        ),
    ]
