from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("core", "0023_pushdevice"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AlterField(
            model_name="pushdevice",
            name="user",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="push_devices",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AddField(
            model_name="pushdevice",
            name="visitor_id",
            field=models.CharField(blank=True, db_index=True, max_length=64, null=True),
        ),
        migrations.AddIndex(
            model_name="pushdevice",
            index=models.Index(fields=["visitor_id", "active"], name="core_push_visitor_act_idx"),
        ),
    ]
