from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("oder", "0035_checkoutsession"),
    ]

    operations = [
        migrations.AddField(
            model_name="checkoutsession",
            name="order",
            field=models.OneToOneField(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="checkout_session",
                to="oder.order",
            ),
        ),
    ]
