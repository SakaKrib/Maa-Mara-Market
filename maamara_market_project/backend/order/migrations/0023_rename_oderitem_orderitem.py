from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("oder", "0022_order_shipping_fields"),
    ]

    operations = [
        migrations.RenameModel(
            old_name="OderItem",
            new_name="OrderItem",
        ),
    ]
