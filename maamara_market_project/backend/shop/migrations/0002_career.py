from django.db import migrations, models
import django.db.models.deletion
from django.utils import timezone

class Migration(migrations.Migration):
    dependencies = [
        ("shop", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="CareerVacancy",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("title", models.CharField(max_length=255)),
                ("department", models.CharField(max_length=255)),
                ("location", models.CharField(max_length=255)),
                ("employment_type", models.CharField(choices=[("full_time", "Full Time"), ("part_time", "Part Time"), ("contract", "Contract"), ("internship", "Internship"), ("remote", "Remote")], default="full_time", max_length=20)),
                ("description", models.TextField()),
                ("requirements", models.TextField(blank=True)),
                ("responsibilities", models.TextField(blank=True)),
                ("salary", models.CharField(blank=True, max_length=100)),
                ("application_deadline", models.DateField(blank=True, null=True)),
                ("is_active", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(default=timezone.now)),
            ],
            options={"ordering": ["-created_at"]},
        ),
        migrations.CreateModel(
            name="JobApplication",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("full_name", models.CharField(max_length=255)),
                ("email", models.EmailField(max_length=254)),
                ("phone", models.CharField(max_length=50)),
                ("cv", models.FileField(upload_to="job_applications/")),
                ("cover_letter", models.TextField(blank=True)),
                ("applied_at", models.DateTimeField(auto_now_add=True)),
                ("seen", models.BooleanField(default=False)),
                ("vacancy", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="applications", to="shop.careervacancy")),
            ],
        ),
    ]