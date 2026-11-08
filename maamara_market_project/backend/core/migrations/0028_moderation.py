import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0027_profile_provider_subjects"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name="directmessage",
            name="moderation_hidden",
            field=models.BooleanField(default=False),
        ),
        migrations.CreateModel(
            name="ContentReport",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("reporter_visitor_id", models.CharField(blank=True, db_index=True, default="", max_length=64)),
                ("target_type", models.CharField(choices=[("review", "Review"), ("blog_post", "Blog post"), ("blog_comment", "Blog comment"), ("message", "Message"), ("item", "Product listing"), ("banner", "Banner"), ("user", "User or vendor")], max_length=20)),
                ("target_id", models.PositiveIntegerField()),
                ("reason", models.CharField(choices=[("spam", "Spam or scam"), ("harassment", "Harassment or bullying"), ("hate", "Hate speech"), ("sexual", "Sexual or inappropriate content"), ("violence", "Violence or dangerous content"), ("illegal", "Illegal goods or activity"), ("misleading", "False or misleading"), ("ip", "Copyright or counterfeit"), ("ai_harmful", "Harmful or inaccurate AI-generated content"), ("other", "Other")], max_length=20)),
                ("details", models.CharField(blank=True, default="", max_length=1000)),
                ("snapshot", models.TextField(blank=True, default="", help_text="Copy of the content when reported, kept as evidence.")),
                ("status", models.CharField(choices=[("open", "Open"), ("actioned", "Action taken"), ("dismissed", "Dismissed")], db_index=True, default="open", max_length=12)),
                ("action", models.CharField(choices=[("none", "No action"), ("removed", "Content removed"), ("suspended", "User suspended"), ("removed_suspended", "Content removed and user suspended")], default="none", max_length=20)),
                ("moderator_note", models.CharField(blank=True, default="", max_length=1000)),
                ("resolved_at", models.DateTimeField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True, db_index=True)),
                ("reporter", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="content_reports_made", to=settings.AUTH_USER_MODEL)),
                ("resolved_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="content_reports_resolved", to=settings.AUTH_USER_MODEL)),
                ("target_owner", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="content_reports_received", to=settings.AUTH_USER_MODEL)),
            ],
            options={"ordering": ["-created_at"]},
        ),
        migrations.AddIndex(
            model_name="contentreport",
            index=models.Index(fields=["target_type", "target_id"], name="core_report_target_idx"),
        ),
        migrations.CreateModel(
            name="UserBlock",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("blocked", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="blocks_received", to=settings.AUTH_USER_MODEL)),
                ("blocker", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="blocks_made", to=settings.AUTH_USER_MODEL)),
            ],
        ),
        migrations.AddConstraint(
            model_name="userblock",
            constraint=models.UniqueConstraint(fields=("blocker", "blocked"), name="unique_user_block"),
        ),
        migrations.AddConstraint(
            model_name="userblock",
            constraint=models.CheckConstraint(check=models.Q(("blocker", models.F("blocked")), _negated=True), name="no_self_block"),
        ),
    ]
