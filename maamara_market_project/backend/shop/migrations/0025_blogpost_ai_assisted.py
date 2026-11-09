from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("shop", "0024_moderation_hidden"),
    ]

    operations = [
        migrations.AddField(
            model_name="blogpost",
            name="ai_assisted",
            field=models.BooleanField(default=False),
        ),
    ]
