from django.db import migrations


class Migration(migrations.Migration):
    """
    Repair databases where 0021 was recorded as applied but its column is
    missing. The operation is safe when the column already exists.
    """

    dependencies = [
        ("shop", "0021_blogpost_view_count"),
    ]

    operations = [
        migrations.RunSQL(
            sql='ALTER TABLE "shop_blogpost" ADD COLUMN IF NOT EXISTS "view_count" integer NOT NULL DEFAULT 0;',
            reverse_sql=migrations.RunSQL.noop,
        ),
    ]
