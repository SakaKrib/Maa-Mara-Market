from django.db import migrations, models
from django.db.models import Q
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("oder", "0027_paypal_transaction_vendor_constraints"),
        ("vendorDashboard", "0018_unique_return_request_per_item"),
    ]

    operations = [
        migrations.CreateModel(
            name="Refund",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("amount", models.DecimalField(decimal_places=2, max_digits=12)),
                ("currency", models.CharField(default="KES", max_length=3)),
                ("provider", models.CharField(choices=[("PayPal", "PayPal"), ("Mpesa", "M-Pesa")], max_length=20)),
                ("provider_reference", models.CharField(blank=True, db_index=True, max_length=255, null=True)),
                ("status", models.CharField(choices=[("approved", "Approved"), ("processing", "Processing"), ("completed", "Completed"), ("failed", "Failed")], default="approved", max_length=20)),
                ("failure_reason", models.TextField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("completed_at", models.DateTimeField(blank=True, null=True)),
                ("payment", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="refunds", to="oder.payment")),
                ("return_request", models.OneToOneField(on_delete=django.db.models.deletion.PROTECT, related_name="refund_record", to="vendorDashboard.returnrequest")),
            ],
            options={
                "indexes": [models.Index(fields=["payment", "status"], name="order_refund_payment_status_idx"), models.Index(fields=["provider", "status"], name="order_refund_provider_status_idx")],
                "constraints": [models.UniqueConstraint(condition=(Q(provider_reference__isnull=False) & ~Q(provider_reference="")), fields=("provider", "provider_reference"), name="uniq_refund_provider_reference")],
            },
        ),
    ]
