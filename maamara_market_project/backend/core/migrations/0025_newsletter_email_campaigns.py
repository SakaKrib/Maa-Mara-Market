# Generated for newsletter subscription and email campaign management.
import uuid
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("core", "0024_pushdevice_visitor_support"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="NewsletterSubscriber",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("email", models.EmailField(max_length=254, unique=True)),
                ("first_name", models.CharField(blank=True, default="", max_length=150)),
                ("consent_given", models.BooleanField(default=True)),
                ("consent_source", models.CharField(blank=True, default="website", max_length=100)),
                ("consented_at", models.DateTimeField(blank=True, null=True)),
                ("unsubscribed_at", models.DateTimeField(blank=True, null=True)),
                ("unsubscribe_token", models.UUIDField(default=uuid.uuid4, editable=False, unique=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={"ordering": ["-created_at"]},
        ),
        migrations.CreateModel(
            name="EmailCampaign",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("title", models.CharField(max_length=200)),
                ("campaign_type", models.CharField(choices=[("banner", "Banner promotion"), ("sale", "Sale items"), ("new_arrivals", "New arrivals"), ("custom", "Custom campaign")], default="custom", max_length=30)),
                ("subject", models.CharField(max_length=255)),
                ("preheader", models.CharField(blank=True, default="", max_length=255)),
                ("body_html", models.TextField(blank=True, default="")),
                ("body_text", models.TextField(blank=True, default="")),
                ("hero_image_url", models.URLField(blank=True, default="")),
                ("cta_label", models.CharField(blank=True, default="Shop now", max_length=80)),
                ("cta_url", models.URLField(blank=True, default="")),
                ("content_payload", models.JSONField(blank=True, default=dict)),
                ("status", models.CharField(choices=[("draft", "Draft"), ("pending_approval", "Pending approval"), ("approved", "Approved"), ("scheduled", "Scheduled"), ("sending", "Sending"), ("sent", "Sent"), ("failed", "Failed"), ("cancelled", "Cancelled")], db_index=True, default="draft", max_length=24)),
                ("scheduled_at", models.DateTimeField(blank=True, db_index=True, null=True)),
                ("prepared_for_date", models.DateField(blank=True, db_index=True, null=True)),
                ("source_key", models.CharField(blank=True, db_index=True, default="", max_length=255)),
                ("recipient_count", models.PositiveIntegerField(default=0)),
                ("sent_count", models.PositiveIntegerField(default=0)),
                ("failed_count", models.PositiveIntegerField(default=0)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("sent_at", models.DateTimeField(blank=True, null=True)),
                ("approved_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="email_campaigns_approved", to=settings.AUTH_USER_MODEL)),
                ("created_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="email_campaigns_created", to=settings.AUTH_USER_MODEL)),
            ],
            options={"ordering": ["-created_at"], "constraints": [models.UniqueConstraint(fields=("campaign_type", "source_key", "prepared_for_date"), name="uniq_email_campaign_source_day")]},
        ),
        migrations.CreateModel(
            name="EmailCampaignRecipient",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("email", models.EmailField(max_length=254)),
                ("status", models.CharField(choices=[("pending", "Pending"), ("sent", "Submitted"), ("failed", "Failed"), ("suppressed", "Unsubscribed/suppressed")], db_index=True, default="pending", max_length=20)),
                ("error", models.TextField(blank=True, default="")),
                ("attempts", models.PositiveSmallIntegerField(default=0)),
                ("attempted_at", models.DateTimeField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("campaign", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="recipients", to="core.emailcampaign")),
                ("subscriber", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="campaign_deliveries", to="core.newslettersubscriber")),
            ],
            options={"ordering": ["id"], "constraints": [models.UniqueConstraint(fields=("campaign", "email"), name="uniq_campaign_recipient_email")]},
        ),
    ]
