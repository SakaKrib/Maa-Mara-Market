import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0029_profile_apple_refresh_token"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="VendorTermsAcceptance",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("version", models.CharField(max_length=20)),
                ("acknowledgements", models.JSONField(blank=True, default=list)),
                ("accepted_at", models.DateTimeField(auto_now_add=True)),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="vendor_terms_acceptances", to=settings.AUTH_USER_MODEL)),
            ],
            options={"ordering": ["-accepted_at"]},
        ),
        migrations.AddConstraint(
            model_name="vendortermsacceptance",
            constraint=models.UniqueConstraint(fields=("user", "version"), name="unique_vendor_terms_acceptance"),
        ),
    ]
