from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("shop", "0020_faq"),
    ]

    operations = [
        migrations.AddField(
            model_name="blogpost",
            name="view_count",
            field=models.PositiveIntegerField(default=0),
        ),
    ]
