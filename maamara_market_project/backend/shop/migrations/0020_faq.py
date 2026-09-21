from django.db import migrations, models
import django.utils.timezone


class Migration(migrations.Migration):
    dependencies = [
        ("shop", "0019_alter_jobapplication_options"),
    ]

    operations = [
        migrations.CreateModel(
            name="FAQ",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("question", models.CharField(max_length=500)),
                ("answer", models.TextField(blank=True)),
                ("category", models.CharField(blank=True, max_length=120)),
                ("created_at", models.DateTimeField(default=django.utils.timezone.now)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={
                "ordering": ["category", "-updated_at", "question"],
            },
        ),
    ]
