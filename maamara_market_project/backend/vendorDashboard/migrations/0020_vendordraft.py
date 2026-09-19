from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ("vendorDashboard", "0019_vendorpayout_kcb_fields"),
        ("auth", "0012_alter_user_first_name_max_length"),
    ]

    operations = [
        migrations.CreateModel(
            name="VendorDraft",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, primary_key=True, serialize=False)),
                ("visitor_id", models.UUIDField(blank=True, null=True)),
                ("data", models.JSONField(default=dict)),
                ("draft_images", models.JSONField(blank=True, default=list)),
                ("status", models.CharField(default="DRAFT", max_length=20)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("expires_at", models.DateTimeField()),
                ("user", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to="auth.user")),
            ],
        ),
        migrations.CreateModel(
            name="VendorDraftImage",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("image", models.ImageField(upload_to="vendor_drafts/")),
                ("item_index", models.IntegerField()),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("draft", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="images", to="vendorDashboard.vendordraft")),
            ],
        ),
    ]
