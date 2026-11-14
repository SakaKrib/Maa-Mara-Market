from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0030_vendortermsacceptance"),
    ]

    operations = [
        migrations.CreateModel(
            name="SiteContactSettings",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("contact_email", models.CharField(blank=True, default="maamaramarket@gmail.com", max_length=254)),
                ("contact_phone", models.CharField(blank=True, default="+254 712 345 678", max_length=32)),
                ("location", models.CharField(blank=True, default="Nairobi, Kenya · East Africa", max_length=120)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={
                "verbose_name": "Site contact settings",
                "verbose_name_plural": "Site contact settings",
            },
        ),
    ]
