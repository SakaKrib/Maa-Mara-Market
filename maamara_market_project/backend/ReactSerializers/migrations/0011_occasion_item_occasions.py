from django.db import migrations, models


def seed_occasions(apps, schema_editor):
    Occasion = apps.get_model("ReactSerializers", "Occasion")
    occasions = [
        ("wedding", "Wedding", "Products suitable for weddings and wedding celebrations."),
        ("engagement", "Engagement", "Products suitable for engagements and proposals."),
        ("birthday", "Birthday", "Products suitable for birthday celebrations and gifts."),
        ("graduation", "Graduation", "Products suitable for graduation celebrations and gifts."),
        ("anniversary", "Anniversary", "Products suitable for anniversaries and relationship milestones."),
        ("baby-shower", "Baby Shower", "Products suitable for baby showers and new-parent celebrations."),
        ("traditional-ceremony", "Traditional Ceremony", "Products suitable for traditional ceremonies and cultural celebrations."),
        ("gifts", "Gifts", "Products intentionally suitable for gifting."),
        ("souvenirs", "Souvenirs", "Products suitable as keepsakes or souvenirs."),
        ("home", "Home", "Products intended for home use, decor, or living spaces."),
        ("office", "Office", "Products intended for office or workplace use."),
    ]
    for display_order, (key, name, description) in enumerate(occasions):
        Occasion.objects.update_or_create(
            key=key,
            defaults={
                "name": name,
                "description": description,
                "is_active": True,
                "display_order": display_order,
            },
        )


class Migration(migrations.Migration):
    dependencies = [
        ("ReactSerializers", "0010_item_video_itemadditionalimage"),
    ]

    operations = [
        migrations.CreateModel(
            name="Occasion",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("key", models.SlugField(max_length=50, unique=True)),
                ("name", models.CharField(max_length=100, unique=True)),
                ("description", models.CharField(blank=True, max_length=255)),
                ("is_active", models.BooleanField(default=True)),
                ("display_order", models.PositiveIntegerField(default=0)),
            ],
            options={"ordering": ("display_order", "name")},
        ),
        migrations.AddField(
            model_name="item",
            name="occasions",
            field=models.ManyToManyField(blank=True, related_name="items", to="ReactSerializers.occasion"),
        ),
        migrations.RunPython(seed_occasions, migrations.RunPython.noop),
    ]
