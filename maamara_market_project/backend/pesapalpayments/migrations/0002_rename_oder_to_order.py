from django.db import migrations


def _rename_order_column(apps, schema_editor, old_column, new_column):
    """Rename the legacy FK column only when the database still has it."""
    model = apps.get_model("pesapalpayments", "PesapalTransaction")
    table = model._meta.db_table
    connection = schema_editor.connection

    with connection.cursor() as cursor:
        columns = {
            column.name
            for column in connection.introspection.get_table_description(cursor, table)
        }

    if old_column in columns and new_column in columns:
        raise RuntimeError(
            f"Cannot safely rename {table}.{old_column}: "
            f"both {old_column} and {new_column} exist."
        )

    if old_column in columns:
        quote = schema_editor.quote_name
        schema_editor.execute(
            f"ALTER TABLE {quote(table)} "
            f"RENAME COLUMN {quote(old_column)} TO {quote(new_column)}"
        )
    elif new_column not in columns:
        raise RuntimeError(
            f"Cannot rename Pesapal order column: neither {old_column} "
            f"nor {new_column} exists in {table}."
        )


def forwards(apps, schema_editor):
    _rename_order_column(apps, schema_editor, "oder_id", "order_id")


def backwards(apps, schema_editor):
    _rename_order_column(apps, schema_editor, "order_id", "oder_id")


class Migration(migrations.Migration):
    """Repair the misspelled FK column while tolerating already-correct schemas.

    Some databases already have order_id (and record a legacy 0002 migration),
    while fresh databases created from 0001 still have oder_id. Preserve both
    database states while keeping Django's migration state consistent.
    """

    dependencies = [
        ("pesapalpayments", "0001_initial"),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            database_operations=[
                migrations.RunPython(forwards, backwards),
            ],
            state_operations=[
                migrations.RenameField(
                    model_name="pesapaltransaction",
                    old_name="oder",
                    new_name="order",
                ),
            ],
        ),
    ]
