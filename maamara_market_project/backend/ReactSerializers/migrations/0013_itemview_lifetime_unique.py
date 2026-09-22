from django.db import migrations, models
from django.db.models import Count, Q


def dedupe_lifetime_item_views(apps, schema_editor):
    ItemView = apps.get_model("ReactSerializers", "ItemView")
    Item = apps.get_model("ReactSerializers", "Item")

    authenticated_keys = (
        ItemView.objects
        .filter(user_id__isnull=False)
        .values("item_id", "user_id")
        .annotate(row_count=Count("id"))
        .filter(row_count__gt=1)
    )

    for key in authenticated_keys.iterator():
        rows = ItemView.objects.filter(
            item_id=key["item_id"],
            user_id=key["user_id"],
        ).order_by("viewed_at", "id")
        keep_id = rows.values_list("id", flat=True).first()
        if keep_id is not None:
            rows.exclude(id=keep_id).delete()

    visitor_keys = (
        ItemView.objects
        .filter(user_id__isnull=True, visitor_id__isnull=False)
        .values("item_id", "visitor_id")
        .annotate(row_count=Count("id"))
        .filter(row_count__gt=1)
    )

    for key in visitor_keys.iterator():
        rows = ItemView.objects.filter(
            item_id=key["item_id"],
            user_id__isnull=True,
            visitor_id=key["visitor_id"],
        ).order_by("viewed_at", "id")
        keep_id = rows.values_list("id", flat=True).first()
        if keep_id is not None:
            rows.exclude(id=keep_id).delete()

    for item in Item.objects.all().iterator():
        total_views = ItemView.objects.filter(item_id=item.pk).count()
        Item.objects.filter(pk=item.pk).update(views=total_views)


class Migration(migrations.Migration):

    dependencies = [
        ("ReactSerializers", "0012_itemview_daily_view"),
    ]

    operations = [
        migrations.RunPython(
            dedupe_lifetime_item_views,
            migrations.RunPython.noop,
        ),
        migrations.RemoveConstraint(
            model_name="itemview",
            name="unique_item_user_day_view",
        ),
        migrations.RemoveConstraint(
            model_name="itemview",
            name="unique_item_visitor_day_view",
        ),
        migrations.AddConstraint(
            model_name="itemview",
            constraint=models.UniqueConstraint(
                condition=Q(user__isnull=False),
                fields=("item", "user"),
                name="unique_item_user_lifetime_view",
            ),
        ),
        migrations.AddConstraint(
            model_name="itemview",
            constraint=models.UniqueConstraint(
                condition=Q(user__isnull=True, visitor_id__isnull=False),
                fields=("item", "visitor_id"),
                name="unique_item_visitor_lifetime_view",
            ),
        ),
    ]
