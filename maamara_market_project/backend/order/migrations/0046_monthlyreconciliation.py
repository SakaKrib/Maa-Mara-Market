import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("oder", "0045_alter_payment_method_choices"),
    ]

    operations = [
        migrations.CreateModel(
            name="MonthlyReconciliation",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("month", models.CharField(max_length=7, unique=True)),
                ("revenue", models.DecimalField(decimal_places=2, max_digits=14)),
                ("shipping", models.DecimalField(decimal_places=2, default=0, max_digits=14)),
                ("vendor_share", models.DecimalField(decimal_places=2, max_digits=14)),
                ("profit", models.DecimalField(decimal_places=2, max_digits=14)),
                ("orders", models.PositiveIntegerField(default=0)),
                ("note", models.CharField(blank=True, default="", max_length=500)),
                ("confirmed_at", models.DateTimeField(auto_now=True)),
                ("confirmed_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="+", to=settings.AUTH_USER_MODEL)),
            ],
        ),
    ]
