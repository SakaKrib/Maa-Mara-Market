from django.db import migrations, models


def remove_duplicate_visitor_reactions(apps, schema_editor):
    ReactionBlog = apps.get_model("shop", "ReactionBlog")
    alias = schema_editor.connection.alias
    rows = (
        ReactionBlog.objects.using(alias)
        .filter(visitor_id__isnull=False)
        .exclude(visitor_id="")
        .order_by("created_at", "id")
        .values_list("id", "post_id", "visitor_id")
    )
    seen = set()
    duplicate_ids = []
    for reaction_id, post_id, visitor_id in rows.iterator():
        key = (post_id, visitor_id)
        if key in seen:
            duplicate_ids.append(reaction_id)
        else:
            seen.add(key)
    if duplicate_ids:
        ReactionBlog.objects.using(alias).filter(id__in=duplicate_ids).delete()


class Migration(migrations.Migration):
    dependencies = [
        ("shop", "0022_repair_blogpost_view_count_column"),
    ]

    operations = [
        migrations.RunPython(remove_duplicate_visitor_reactions, migrations.RunPython.noop),
        migrations.AddConstraint(
            model_name="reactionblog",
            constraint=models.UniqueConstraint(
                fields=("post", "visitor_id"),
                condition=models.Q(visitor_id__isnull=False) & ~models.Q(visitor_id=""),
                name="uniq_blog_reaction_visitor_per_post",
            ),
        ),
    ]
