from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0026_accountdeletionrecord"),
    ]

    operations = [
        migrations.AddField(
            model_name="profile",
            name="google_subject",
            field=models.CharField(blank=True, db_index=True, max_length=255, null=True, unique=True),
        ),
        migrations.AddField(
            model_name="profile",
            name="apple_subject",
            field=models.CharField(blank=True, db_index=True, max_length=255, null=True, unique=True),
        ),
    ]
