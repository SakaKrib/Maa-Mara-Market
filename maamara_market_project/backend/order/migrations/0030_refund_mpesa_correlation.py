from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("order", "0029_refund_card_provider"),
    ]

    operations = [
        migrations.AddField(
            model_name="refund",
            name="mpesa_originator_conversation_id",
            field=models.CharField(blank=True, db_index=True, max_length=100, null=True),
        ),
        migrations.AddField(
            model_name="refund",
            name="mpesa_conversation_id",
            field=models.CharField(blank=True, db_index=True, max_length=100, null=True),
        ),
        migrations.AddField(
            model_name="refund",
            name="mpesa_result_code",
            field=models.IntegerField(blank=True, null=True),
        ),
    ]
