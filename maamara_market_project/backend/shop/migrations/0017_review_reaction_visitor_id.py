from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("shop", "0016_remove_banner_call_to_action_url_banner_cta_item_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="review",
            name="visitor_id",
            field=models.CharField(blank=True, db_index=True, max_length=255, null=True),
        ),
        migrations.AddField(
            model_name="reaction",
            name="visitor_id",
            field=models.CharField(blank=True, db_index=True, max_length=255, null=True),
        ),
    ]
