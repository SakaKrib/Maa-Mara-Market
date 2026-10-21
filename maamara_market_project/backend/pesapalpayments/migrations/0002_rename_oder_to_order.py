from django.db import migrations


class Migration(migrations.Migration):
    """Repair a field name damaged by an app-label search/replace in 0001.

    The model has always declared ``order``; 0001 accidentally created ``oder``.
    Renaming keeps data for databases that already applied 0001 and gives fresh
    databases the column the model expects.
    """

    dependencies = [
        ("pesapalpayments", "0001_initial"),
    ]

    operations = [
        migrations.RenameField(
            model_name="pesapaltransaction",
            old_name="oder",
            new_name="order",
        ),
    ]
