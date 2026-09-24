from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("oder", "0036_checkoutsession_order"),
    ]

    operations = [
        migrations.CreateModel(
            name="Refund",
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
                    "amount",
                    models.DecimalField(decimal_places=2, max_digits=12),
                ),
                ("currency", models.CharField(max_length=10)),
                (
                    "provider",
                    models.CharField(
                        choices=[("PayPal", "PayPal"), ("Mpesa", "M-Pesa")],
                        max_length=20,
                    ),
                ),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("approved", "Approved"),
                            ("processing", "Processing"),
                            ("completed", "Completed"),
                            ("failed", "Failed"),
                            ("cancelled", "Cancelled"),
                        ],
                        db_index=True,
                        default="approved",
                        max_length=20,
                    ),
                ),
                (
                    "provider_reference",
                    models.CharField(
                        blank=True,
                        max_length=255,
                        null=True,
                        unique=True,
                    ),
                ),
                (
                    "mpesa_originator_conversation_id",
                    models.CharField(
                        blank=True,
                        max_length=100,
                        null=True,
                        unique=True,
                    ),
                ),
                (
                    "mpesa_conversation_id",
                    models.CharField(
                        blank=True,
                        max_length=100,
                        null=True,
                        unique=True,
                    ),
                ),
                (
                    "mpesa_result_code",
                    models.IntegerField(blank=True, null=True),
                ),
                ("failure_reason", models.TextField(blank=True, null=True)),
                ("completed_at", models.DateTimeField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "payment",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="refunds",
                        to="oder.payment",
                    ),
                ),
                (
                    "return_request",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="refund",
                        to="vendorDashboard.returnrequest",
                    ),
                ),
            ],
            options={
                "ordering": ["-created_at"],
                "indexes": [
                    models.Index(
                        fields=["payment", "status"],
                        name="oder_refund_payment_status_idx",
                    ),
                    models.Index(
                        fields=["provider", "status"],
                        name="oder_refund_provider_status_idx",
                    ),
                    models.Index(
                        fields=["return_request"],
                        name="oder_refund_return_request_idx",
                    ),
                ],
            },
        ),
    ]
