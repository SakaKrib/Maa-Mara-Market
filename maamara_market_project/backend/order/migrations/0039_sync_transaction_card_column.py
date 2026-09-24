from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("oder", "0038_sync_payment_schema"),
    ]

    operations = [
        migrations.RunSQL(
            sql="""
            ALTER TABLE oder_transaction
            ADD COLUMN IF NOT EXISTS card_id bigint;
            """,
            reverse_sql=migrations.RunSQL.noop,
        ),
        migrations.RunSQL(
            sql="""
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1
                    FROM pg_constraint
                    WHERE conname = 'oder_transaction_card_id_fk'
                ) THEN
                    ALTER TABLE oder_transaction
                    ADD CONSTRAINT oder_transaction_card_id_fk
                    FOREIGN KEY (card_id)
                    REFERENCES oder_card(id)
                    DEFERRABLE INITIALLY DEFERRED;
                END IF;
            END $$;
            """,
            reverse_sql=migrations.RunSQL.noop,
        ),
        migrations.RunSQL(
            sql="""
            CREATE INDEX IF NOT EXISTS oder_transaction_card_id_idx
            ON oder_transaction (card_id);
            """,
            reverse_sql=migrations.RunSQL.noop,
        ),
    ]
