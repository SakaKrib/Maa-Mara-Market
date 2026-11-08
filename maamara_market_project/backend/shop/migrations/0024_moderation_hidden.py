from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("shop", "0023_unique_visitor_blog_reaction"),
    ]

    operations = [
        migrations.AddField(
            model_name="review",
            name="moderation_hidden",
            field=models.BooleanField(db_index=True, default=False),
        ),
        migrations.AddField(
            model_name="commentblog",
            name="moderation_hidden",
            field=models.BooleanField(db_index=True, default=False),
        ),
    ]
