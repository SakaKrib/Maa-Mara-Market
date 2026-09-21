from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0016_supportmessage_inquiry_fields"),
    ]

    operations = [
        migrations.CreateModel(
            name="AboutPage",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("hero_image", models.ImageField(blank=True, null=True, upload_to="about/")),
                ("hero_title", models.CharField(blank=True, default="", max_length=255)),
                ("hero_subtitle", models.TextField(blank=True, default="")),
                ("about_title", models.CharField(blank=True, default="", max_length=255)),
                ("impact_title", models.CharField(blank=True, default="", max_length=255)),
                ("impact_content", models.TextField(blank=True, default="")),
                ("products_title", models.CharField(blank=True, default="", max_length=255)),
                ("products_content", models.TextField(blank=True, default="")),
                ("materials_content", models.TextField(blank=True, default="")),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
        ),
    ]
