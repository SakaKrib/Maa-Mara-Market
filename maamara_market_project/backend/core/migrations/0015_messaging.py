from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
from django.core.validators import FileExtensionValidator


class Migration(migrations.Migration):
    dependencies = [
        ("core", "0014_visitor_ownership_and_voucher_expiry"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="Conversation",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("admin", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="admin_conversations", to=settings.AUTH_USER_MODEL)),
                ("participant", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="message_conversations", to=settings.AUTH_USER_MODEL)),
            ],
            options={"ordering": ["-updated_at"]},
        ),
        migrations.CreateModel(
            name="DirectMessage",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("body", models.TextField(blank=True)),
                ("image", models.ImageField(blank=True, null=True, upload_to="messages/%Y/%m/", validators=[FileExtensionValidator(allowed_extensions=["jpg", "jpeg", "png", "webp"])])),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("read_at", models.DateTimeField(blank=True, null=True)),
                ("conversation", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="messages", to="core.conversation")),
                ("sender", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="sent_direct_messages", to=settings.AUTH_USER_MODEL)),
            ],
            options={"ordering": ["created_at"]},
        ),
        migrations.AddConstraint(
            model_name="conversation",
            constraint=models.UniqueConstraint(fields=("admin", "participant"), name="unique_admin_participant_conversation"),
        ),
    ]
