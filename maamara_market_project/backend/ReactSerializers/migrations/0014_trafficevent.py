from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("ReactSerializers", "0013_itemview_lifetime_unique"),
    ]

    operations = [
        migrations.CreateModel(
            name="TrafficEvent",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("visitor_id", models.CharField(blank=True, db_index=True, max_length=255, null=True)),
                ("session_id", models.CharField(blank=True, db_index=True, max_length=255, null=True)),
                ("event_type", models.CharField(choices=[("page_view", "Page view"), ("session_start", "Session start"), ("event", "Event")], db_index=True, default="page_view", max_length=30)),
                ("path", models.CharField(db_index=True, max_length=1000)),
                ("referrer", models.URLField(blank=True, default="", max_length=2000)),
                ("source", models.CharField(blank=True, db_index=True, default="direct", max_length=120)),
                ("medium", models.CharField(blank=True, default="", max_length=120)),
                ("campaign", models.CharField(blank=True, default="", max_length=255)),
                ("ip_address", models.GenericIPAddressField(blank=True, db_index=True, null=True)),
                ("country_code", models.CharField(blank=True, default="", max_length=8)),
                ("country_name", models.CharField(blank=True, default="", max_length=120)),
                ("device_type", models.CharField(blank=True, db_index=True, default="unknown", max_length=30)),
                ("user_agent", models.TextField(blank=True, default="")),
                ("created_at", models.DateTimeField(auto_now_add=True, db_index=True)),
                ("user", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="traffic_events", to="auth.user")),
            ],
            options={
                "ordering": ("-created_at",),
            },
        ),
        migrations.AddIndex(
            model_name="trafficevent",
            index=models.Index(fields=["created_at", "event_type"], name="ReactSerial_created__event_idx"),
        ),
        migrations.AddIndex(
            model_name="trafficevent",
            index=models.Index(fields=["source", "created_at"], name="ReactSerial_source_created_idx"),
        ),
        migrations.AddIndex(
            model_name="trafficevent",
            index=models.Index(fields=["country_code", "created_at"], name="ReactSerial_country_created_idx"),
        ),
    ]
