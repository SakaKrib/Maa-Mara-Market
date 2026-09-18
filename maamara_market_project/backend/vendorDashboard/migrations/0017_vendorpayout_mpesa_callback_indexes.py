from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("vendorDashboard", "0016_solditem_selected_options"),
    ]

    operations = [
        migrations.AddIndex(
            model_name="vendorpayout",
            index=models.Index(
                fields=["mpesa_originator_conversation_id"],
                name="vp_mpesa_origin_idx",
            ),
        ),
        migrations.AddIndex(
            model_name="vendorpayout",
            index=models.Index(
                fields=["mpesa_transaction_id"],
                name="vp_mpesa_txn_idx",
            ),
        ),
    ]
