from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("ReactSerializers", "0009_alter_item_item_attribute"),
    ]

    operations = [
        migrations.AlterField(
            model_name="item",
            name="image",
            field=models.ImageField(blank=True, null=True, upload_to="items/"),
        ),
        migrations.AddField(
            model_name="item",
            name="video",
            field=models.FileField(blank=True, null=True, upload_to="item_videos/"),
        ),
        migrations.CreateModel(
            name="ItemAdditionalImage",
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
                    "image",
                    models.ImageField(upload_to="items/additional/"),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "item",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="additional_images",
                        to="ReactSerializers.item",
                    ),
                ),
            ],
            options={"ordering": ("id",)},
        ),
    ]
