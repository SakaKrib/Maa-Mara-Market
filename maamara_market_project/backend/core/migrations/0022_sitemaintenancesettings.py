from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("core", "0021_visitor_messaging"),
    ]

    operations = [
        migrations.CreateModel(
            name="SiteMaintenanceSettings",
            fields=[
                ("id", models.BigAutoField(primary_key=True, serialize=False, auto_created=True, verbose_name="ID")),
                ("enabled", models.BooleanField(default=False)),
                ("message", models.TextField(
                    blank=True,
                    default="We're making a few improvements to Maa Mara Market. We'll be back shortly. You can still check the status of an existing order below.",
                )),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={
                "verbose_name": "Site maintenance settings",
                "verbose_name_plural": "Site maintenance settings",
            },
        ),
    ]
