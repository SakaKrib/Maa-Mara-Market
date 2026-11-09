from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0028_moderation"),
    ]

    operations = [
        migrations.AddField(
            model_name="profile",
            name="apple_refresh_token",
            field=models.CharField(blank=True, max_length=512, null=True),
        ),
        migrations.AddField(
            model_name="profile",
            name="apple_token_client_id",
            field=models.CharField(blank=True, default="", max_length=255),
        ),
    ]
