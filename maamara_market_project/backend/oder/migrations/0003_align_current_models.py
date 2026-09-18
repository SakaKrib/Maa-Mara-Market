from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


def migrate_order_items(apps, schema_editor):
    Order = apps.get_model("oder", "Order")
    OderItem = apps.get_model("oder", "OderItem")
    for order in Order.objects.all().iterator():
        for item in order.items.all():
            if item.order_id is None:
                item.order_id = order.pk
                item.save(update_fields=["order"])


class Migration(migrations.Migration):

    dependencies = [
        ("oder", "0002_transaction_ledger"),
        ("ReactSerializers", "0001_initial"),
        ("vendorDashboard", "0001_initial"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.RenameField(
            model_name="payment",
            old_name="method",
            new_name="payment_method",
        ),
        migrations.AddField(
            model_name="oderitem",
            name="order",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="order_items",
                to="oder.order",
            ),
        ),
        migrations.AddField(
            model_name="oderitem",
            name="color_variant",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                to="ReactSerializers.colorvariant",
            ),
        ),
        migrations.AddField(
            model_name="oderitem",
            name="size_stock",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                to="ReactSerializers.sizestock",
            ),
        ),
        migrations.AddField(
            model_name="oderitem",
            name="age_variant",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                to="ReactSerializers.agevariant",
            ),
        ),
        migrations.AddField(
            model_name="oderitem",
            name="selected_weight",
            field=models.CharField(blank=True, max_length=50, null=True),
        ),
        migrations.AddField(
            model_name="oderitem",
            name="selected_length",
            field=models.CharField(blank=True, max_length=50, null=True),
        ),
        migrations.AddField(
            model_name="oderitem",
            name="price_at_purchase",
            field=models.DecimalField(decimal_places=2, max_digits=10, default=0),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name="oderitem",
            name="shoe_size",
            field=models.CharField(blank=True, max_length=50, null=True),
        ),
        migrations.RunPython(migrate_order_items, migrations.RunPython.noop),
        migrations.RemoveField(
            model_name="order",
            name="items",
        ),
        migrations.AddField(
            model_name="order",
            name="paypal_order_id",
            field=models.CharField(blank=True, max_length=64, null=True, unique=True),
        ),
        migrations.AddField(
            model_name="order",
            name="paypal_invoice_id",
            field=models.CharField(blank=True, max_length=128, null=True, unique=True),
        ),
        migrations.AddField(
            model_name="customer",
            name="vendor",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="customers",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.CreateModel(
            name="Card",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("visitor_id", models.CharField(blank=True, max_length=64, null=True, unique=True)),
                ("brand", models.CharField(blank=True, max_length=32, null=True)),
                ("last_digits", models.CharField(blank=True, max_length=4, null=True)),
                ("type", models.CharField(blank=True, max_length=16, null=True)),
                ("capture_id", models.CharField(blank=True, db_index=True, max_length=64, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
            ],
        ),
    ]
