from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        ("oder", "0041_remove_card_user_alter_checkoutsession_options_and_more"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="PesapalTransaction",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("merchant_reference", models.CharField(db_index=True, max_length=100, unique=True)),
                ("order_tracking_id", models.CharField(blank=True, db_index=True, max_length=100, null=True, unique=True)),
                ("payment_account", models.CharField(blank=True, max_length=100, null=True)),
                ("amount", models.DecimalField(decimal_places=2, max_digits=12)),
                ("currency", models.CharField(default="KES", max_length=5)),
                ("payment_method", models.CharField(blank=True, max_length=50, null=True)),
                ("status", models.CharField(
                    choices=[
                        ("initialized", "Initialized"),
                        ("pending", "Pending"),
                        ("completed", "Completed"),
                        ("failed", "Failed"),
                        ("cancelled", "Cancelled"),
                        ("invalid", "Invalid"),
                        ("refunded", "Refunded"),
                    ],
                    default="initialized",
                    max_length=20,
                )),
                ("pesapal_response", models.JSONField(blank=True, null=True)),
                ("paid_at", models.DateTimeField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("customer", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to=settings.AUTH_USER_MODEL)),
                ("checkout_session", models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name="pesapal_transaction", to="order.checkoutsession")),
                ("oder", models.OneToOneField(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="pesapal_transaction", to="order.order")),
            ],
            options={"ordering": ["-created_at"]},
        ),
    ]
