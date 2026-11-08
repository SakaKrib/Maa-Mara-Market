from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0025_newsletter_email_campaigns"),
    ]

    operations = [
        migrations.CreateModel(
            name="AccountDeletionRecord",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("user_id", models.IntegerField(blank=True, db_index=True, null=True)),
                ("email_hash", models.CharField(db_index=True, max_length=64)),
                ("channel", models.CharField(default="app", max_length=10)),
                ("status", models.CharField(default="completed", max_length=20)),
                ("requested_at", models.DateTimeField(auto_now_add=True)),
                ("completed_at", models.DateTimeField(blank=True, null=True)),
            ],
        ),
    ]
