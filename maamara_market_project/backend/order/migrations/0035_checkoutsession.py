from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ("oder", "0034_orderitem_custom_preferences"),
    ]

    operations = [
        migrations.CreateModel(
            name="CheckoutSession",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("visitor_id", models.CharField(blank=True, db_index=True, max_length=255, null=True)),
                ("payload", models.JSONField(default=dict)),
                ("payment_method", models.CharField(max_length=20)),
                ("amount", models.DecimalField(decimal_places=2, max_digits=12)),
                ("currency", models.CharField(default="KES", max_length=3)),
                ("paypal_order_id", models.CharField(blank=True, max_length=64, null=True, unique=True)),
                ("mpesa_checkout_request_id", models.CharField(blank=True, max_length=100, null=True, unique=True)),
                ("status", models.CharField(choices=[
                    ("draft", "Draft"),
                    ("payment_pending", "Payment Pending"),
                    ("completed", "Completed"),
                    ("failed", "Failed"),
                    ("expired", "Expired"),
                ], db_index=True, default="draft", max_length=20)),
                ("expires_at", models.DateTimeField(db_index=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("user", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name="checkout_sessions", to="auth.user")),
            ],
            options={
                "indexes": [
                    models.Index(fields=["user", "status"], name="oder_checkou_user_id_9a4e6a_idx"),
                    models.Index(fields=["visitor_id", "status"], name="oder_checkou_visitor_4bb7fd_idx"),
                    models.Index(fields=["expires_at", "status"], name="oder_checkou_expires_0f6f2f_idx"),
                ],
            },
        ),
    ]
