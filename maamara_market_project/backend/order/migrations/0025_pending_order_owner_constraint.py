from django.db import migrations, models
from django.db.models import Q


class Migration(migrations.Migration):

    dependencies = [
        ("order", "0024_card_user_visitor_index"),
    ]

    operations = [
        migrations.AddConstraint(
            model_name="order",
            constraint=models.UniqueConstraint(
                fields=("user", "visitor_id"),
                condition=Q(status="pending"),
                name="uniq_pending_order_owner",
            ),
        ),
        migrations.AddIndex(
            model_name="order",
            index=models.Index(fields=("user", "status"), name="order_user_status_idx"),
        ),
        migrations.AddIndex(
            model_name="order",
            index=models.Index(fields=("visitor_id", "status"), name="order_visitor_status_idx"),
        ),
    ]
