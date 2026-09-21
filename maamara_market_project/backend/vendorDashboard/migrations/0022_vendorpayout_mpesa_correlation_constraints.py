from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("vendorDashboard", "0021_remove_vendorpayout_vp_mpesa_origin_idx_and_more"),
    ]

    operations = [
        migrations.AddConstraint(
            model_name="vendorpayout",
            constraint=models.UniqueConstraint(
                fields=("mpesa_conversation_id",),
                condition=(
                    models.Q(mpesa_conversation_id__isnull=False)
                    & ~models.Q(mpesa_conversation_id="")
                ),
                name="uniq_vp_mpesa_conversation",
            ),
        ),
        migrations.AddConstraint(
            model_name="vendorpayout",
            constraint=models.UniqueConstraint(
                fields=("mpesa_originator_conversation_id",),
                condition=(
                    models.Q(mpesa_originator_conversation_id__isnull=False)
                    & ~models.Q(mpesa_originator_conversation_id="")
                ),
                name="uniq_vp_mpesa_originator",
            ),
        ),
        migrations.AddConstraint(
            model_name="vendorpayout",
            constraint=models.UniqueConstraint(
                fields=("mpesa_transaction_id",),
                condition=(
                    models.Q(mpesa_transaction_id__isnull=False)
                    & ~models.Q(mpesa_transaction_id="")
                ),
                name="uniq_vp_mpesa_transaction",
            ),
        ),
    ]
