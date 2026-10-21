import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


def backfill_destination_hashes(apps, schema_editor):
    """Record each existing vendor's current destination without starting a hold."""
    from vendorDashboard.payout.services.payout_guard import destination_fingerprint

    Vendor = apps.get_model("vendorDashboard", "Vendor")
    for vendor in Vendor.objects.all().iterator():
        Vendor.objects.filter(pk=vendor.pk).update(payout_destination_hash=destination_fingerprint(vendor))


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("vendorDashboard", "0027_vendor_mpesa_paybill_account"),
    ]

    operations = [
        migrations.AddField(
            model_name="vendor",
            name="payout_destination_hash",
            field=models.CharField(blank=True, default="", max_length=64),
        ),
        migrations.AddField(
            model_name="vendor",
            name="payout_destination_changed_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="vendorpayout",
            name="initiated_by",
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="initiated_vendor_payouts", to=settings.AUTH_USER_MODEL),
        ),
        migrations.AddField(
            model_name="vendorpayout",
            name="initiated_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="vendorpayout",
            name="initiated_ip",
            field=models.GenericIPAddressField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="vendorpayout",
            name="send_in_progress",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="vendorpayout",
            name="send_started_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="vendorpayout",
            name="approval_requested_by",
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="requested_vendor_payout_approvals", to=settings.AUTH_USER_MODEL),
        ),
        migrations.AddField(
            model_name="vendorpayout",
            name="approval_requested_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="vendorpayout",
            name="approval_amount",
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True),
        ),
        migrations.AddField(
            model_name="vendorpayout",
            name="approval_destination_hash",
            field=models.CharField(blank=True, default="", max_length=64),
        ),
        migrations.AddField(
            model_name="vendorpayout",
            name="approved_by",
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="approved_vendor_payouts", to=settings.AUTH_USER_MODEL),
        ),
        migrations.AddField(
            model_name="vendorpayout",
            name="approved_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.CreateModel(
            name="PayoutAuditLog",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("action", models.CharField(db_index=True, max_length=40)),
                ("ip_address", models.GenericIPAddressField(blank=True, null=True)),
                ("detail", models.JSONField(blank=True, default=dict)),
                ("created_at", models.DateTimeField(auto_now_add=True, db_index=True)),
                ("actor", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="payout_audit_entries", to=settings.AUTH_USER_MODEL)),
                ("payout", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="audit_logs", to="vendorDashboard.vendorpayout")),
            ],
            options={"ordering": ["-created_at", "-id"]},
        ),
        migrations.RunPython(backfill_destination_hashes, migrations.RunPython.noop),
    ]
