from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0017_aboutpage"),
    ]

    operations = [
        migrations.CreateModel(
            name="SearchEvent",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                (
                    "query",
                    models.CharField(max_length=255),
                ),
                (
                    "visitor_id",
                    models.CharField(
                        blank=True,
                        db_index=True,
                        max_length=64,
                        null=True,
                    ),
                ),
                (
                    "created_at",
                    models.DateTimeField(auto_now_add=True),
                ),
                (
                    "user",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="marketplace_search_events",
                        to="auth.user",
                    ),
                ),
            ],
            options={
                "ordering": ["-created_at"],
                "indexes": [
                    models.Index(
                        fields=["user", "-created_at"],
                        name="core_search_user_created_idx",
                    ),
                    models.Index(
                        fields=["visitor_id", "-created_at"],
                        name="core_search_visitor_created_idx",
                    ),
                ],
            },
        ),
    ]
