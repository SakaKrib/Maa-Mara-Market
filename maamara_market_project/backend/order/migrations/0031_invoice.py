from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("order", "0030_refund_mpesa_correlation"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="Invoice",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("invoice_number", models.CharField(editable=False, max_length=40, unique=True)),
                ("invoice_type", models.CharField(choices=[("customer_payment", "Customer Payment"), ("vendor_payout", "Vendor Payout")], max_length=32)),
                ("status", models.CharField(choices=[("issued", "Issued"), ("void", "Void")], default="issued", max_length=16)),
                ("visitor_id", models.CharField(blank=True, db_index=True, max_length=255, null=True)),
                ("payout_reference", models.CharField(blank=True, db_index=True, max_length=100, null=True)),
                ("amount", models.DecimalField(decimal_places=2, max_digits=12)),
                ("currency", models.CharField(default="KES", max_length=3)),
                ("provider", models.CharField(blank=True, max_length=32, null=True)),
                ("provider_reference", models.CharField(blank=True, db_index=True, max_length=255, null=True)),
                ("issued_at", models.DateTimeField(auto_now_add=True)),
                ("paid_at", models.DateTimeField(blank=True, null=True)),
                ("metadata", models.JSONField(blank=True, default=dict)),
                ("order", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="invoices", to="order.order")),
                ("payment", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="invoices", to="order.payment")),
                ("transaction", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="invoices", to="order.transaction")),
                ("user", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="invoices", to=settings.AUTH_USER_MODEL)),
            ],
            options={
                "ordering": ["-issued_at"],
                "indexes": [
                    models.Index(fields=["user", "invoice_type", "issued_at"], name="order_invoi_user_id_4b0b9c_idx"),
                    models.Index(fields=["visitor_id", "invoice_type", "issued_at"], name="order_invoi_visitor__e2b1ab_idx"),
                    models.Index(fields=["provider", "provider_reference"], name="order_invoi_provider_8d93c2_idx"),
                ],
            },
        ),
        migrations.AddConstraint(
            model_name="invoice",
            constraint=models.UniqueConstraint(condition=models.Q(("payment__isnull", False)), fields=("payment",), name="uniq_invoice_payment"),
        ),
        migrations.AddConstraint(
            model_name="invoice",
            constraint=models.UniqueConstraint(
                condition=models.Q(("invoice_type", "vendor_payout"), ("payout_reference__isnull", False)),
                fields=("invoice_type", "payout_reference"),
                name="uniq_vendor_payout_invoice",
            ),
        ),
    ]
