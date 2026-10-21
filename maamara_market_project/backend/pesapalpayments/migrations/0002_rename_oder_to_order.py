from django.db import migrations


def rename_column_if_needed(apps, schema_editor):
    """Rename ``oder_id`` to ``order_id`` only where the damaged name exists.

    Databases that ran the original 0001 already have ``order_id``; databases
    created from the mistyped 0001 have ``oder_id``. Both end up with ``order_id``.
    """
    model = apps.get_model("pesapalpayments", "PesapalTransaction")
    table = model._meta.db_table
    connection = schema_editor.connection
    with connection.cursor() as cursor:
        columns = {col.name for col in connection.introspection.get_table_description(cursor, table)}
    if "oder_id" in columns and "order_id" not in columns:
        schema_editor.execute(
            "ALTER TABLE %s RENAME COLUMN %s TO %s" % (
                schema_editor.quote_name(table),
                schema_editor.quote_name("oder_id"),
                schema_editor.quote_name("order_id"),
            )
        )


class Migration(migrations.Migration):
    """Repair a field name damaged by an app-label search/replace in 0001.

    The model has always declared ``order``. The migration state is renamed
    unconditionally; the database column is renamed only if it needs it.
    """

    dependencies = [
        ("pesapalpayments", "0001_initial"),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.RenameField(model_name="pesapaltransaction", old_name="oder", new_name="order"),
            ],
            database_operations=[
                migrations.RunPython(rename_column_if_needed, migrations.RunPython.noop),
            ],
        ),
    ]
