from decimal import Decimal

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("oder", "0046_monthlyreconciliation"),
        ("vendorDashboard", "0031_vendoradjustment_kind"),
    ]

    operations = [
        migrations.AddField(
            model_name="order",
            name="credit_applied",
            field=models.DecimalField(decimal_places=2, default=Decimal("0.00"), max_digits=12),
        ),
        migrations.CreateModel(
            name="ExchangeCredit",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("visitor_id", models.CharField(blank=True, db_index=True, max_length=255, null=True)),
                ("amount", models.DecimalField(decimal_places=2, max_digits=12)),
                ("used_amount", models.DecimalField(decimal_places=2, default=Decimal("0.00"), max_digits=12)),
                ("expires_at", models.DateTimeField()),
                ("voided", models.BooleanField(default=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("return_request", models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name="exchange_credit", to="vendorDashboard.returnrequest")),
                ("user", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name="exchange_credits", to=settings.AUTH_USER_MODEL)),
            ],
            options={"ordering": ["created_at"]},
        ),
    ]
