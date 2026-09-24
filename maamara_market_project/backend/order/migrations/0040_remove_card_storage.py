from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("oder", "0039_sync_transaction_card_column"),
    ]

    operations = [
        migrations.RemoveField(
            model_name="transaction",
            name="card",
        ),
        migrations.RemoveField(
            model_name="transaction",
            name="card_brand",
        ),
        migrations.RemoveField(
            model_name="transaction",
            name="card_type",
        ),
        migrations.RemoveField(
            model_name="transaction",
            name="last_4_digits",
        ),
        migrations.DeleteModel(
            name="Card",
        ),
    ]
