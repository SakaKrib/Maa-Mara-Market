import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("oder", "0045_alter_payment_method_choices"),
        ("vendorDashboard", "0028_payout_security"),
    ]

    operations = [
        migrations.CreateModel(
            name="PayoutBatch",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("week_start", models.DateField(unique=True)),
                ("week_end", models.DateField()),
                ("cutoff_at", models.DateTimeField(help_text="Items eligible strictly before this moment are included.")),
                ("status", models.CharField(choices=[("DRAFT", "Draft - awaiting audit"), ("AUDITED", "Audited - awaiting approval"), ("APPROVED", "Approved - payouts may be sent")], db_index=True, default="DRAFT", max_length=12)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("audited_at", models.DateTimeField(blank=True, null=True)),
                ("approved_at", models.DateTimeField(blank=True, null=True)),
                ("skipped", models.JSONField(blank=True, default=list)),
                ("approved_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="+", to=settings.AUTH_USER_MODEL)),
                ("audited_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="+", to=settings.AUTH_USER_MODEL)),
                ("created_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="+", to=settings.AUTH_USER_MODEL)),
            ],
            options={"ordering": ["-week_start"]},
        ),
        migrations.CreateModel(
            name="PayoutAllocation",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("payment_reference", models.CharField(blank=True, default="", max_length=100)),
                ("vendor_amount", models.DecimalField(decimal_places=2, max_digits=12)),
                ("eligible_at", models.DateTimeField()),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("batch", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="allocations", to="vendorDashboard.payoutbatch")),
                ("order_item", models.OneToOneField(on_delete=django.db.models.deletion.PROTECT, related_name="payout_allocation", to="oder.orderitem")),
                ("payment", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name="+", to="oder.payment")),
                ("payout", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="allocations", to="vendorDashboard.vendorpayout")),
                ("vendor", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="payout_allocations", to="vendorDashboard.vendor")),
            ],
            options={"ordering": ["batch_id", "vendor_id", "order_item_id"]},
        ),
        migrations.AddIndex(
            model_name="payoutallocation",
            index=models.Index(fields=["batch", "vendor"], name="alloc_batch_vendor_idx"),
        ),
    ]
