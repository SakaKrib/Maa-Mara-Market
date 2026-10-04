from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("order", "0041_remove_card_user_alter_checkoutsession_options_and_more"),
    ]

    operations = [
        migrations.AlterField(
            model_name="checkoutsession",
            name="payment_method",
            field=models.CharField(
                choices=[("Pesapal", "Pesapal")],
                max_length=20,
            ),
        ),
    ]
