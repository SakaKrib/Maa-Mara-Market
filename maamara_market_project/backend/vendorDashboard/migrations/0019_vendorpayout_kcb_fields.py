# Generated manually for KCB payout provider correlation and settlement fields.

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("vendorDashboard", "0018_unique_return_request_per_item"),
    ]

    operations = [
        migrations.AddField(
            model_name="vendorpayout",
            name="kcb_transaction_reference",
            field=models.CharField(
                blank=True,
                db_index=True,
                max_length=100,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="vendorpayout",
            name="kcb_message_id",
            field=models.CharField(
                blank=True,
                db_index=True,
                max_length=100,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="vendorpayout",
            name="kcb_provider_status",
            field=models.CharField(
                blank=True,
                max_length=50,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="vendorpayout",
            name="kcb_provider_reference",
            field=models.CharField(
                blank=True,
                db_index=True,
                max_length=100,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="vendorpayout",
            name="kcb_result_description",
            field=models.CharField(
                blank=True,
                max_length=255,
                null=True,
            ),
        ),
    ]
