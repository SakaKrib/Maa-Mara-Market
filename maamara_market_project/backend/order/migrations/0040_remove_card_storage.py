from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("oder", "0039_sync_transaction_card_column"),
    ]

    operations = [
        migrations.RunSQL(
            sql="""
            DO $$
            BEGIN
                IF to_regclass('oder_transaction') IS NOT NULL
                   AND EXISTS (
                       SELECT 1
                       FROM pg_constraint
                       WHERE conrelid = 'oder_transaction'::regclass
                         AND conname = 'oder_transaction_card_id_fk'
                   ) THEN
                    ALTER TABLE oder_transaction
                    DROP CONSTRAINT oder_transaction_card_id_fk;
                END IF;
            END $$;
            """,
            reverse_sql=migrations.RunSQL.noop,
        ),
        migrations.RunSQL(
            sql="""
            DO $$
            BEGIN
                IF to_regclass('oder_transaction') IS NOT NULL THEN
                    DROP INDEX IF EXISTS oder_transaction_card_id_idx;
                    ALTER TABLE oder_transaction
                    DROP COLUMN IF EXISTS card_id;
                    ALTER TABLE oder_transaction
                    DROP COLUMN IF EXISTS card_brand;
                    ALTER TABLE oder_transaction
                    DROP COLUMN IF EXISTS card_type;
                    ALTER TABLE oder_transaction
                    DROP COLUMN IF EXISTS last_4_digits;
                END IF;
            END $$;
            """,
            reverse_sql=migrations.RunSQL.noop,
        ),
        migrations.RunSQL(
            sql="""
            DROP TABLE IF EXISTS oder_card;
            """,
            reverse_sql=migrations.RunSQL.noop,
        ),
        migrations.SeparateDatabaseAndState(
            database_operations=[],
            state_operations=[
                migrations.AlterField(
                    model_name="payment",
                    name="payment_method",
                    field=models.CharField(
                        choices=[
                            ("UNKNOWN", "Unknown"),
                            ("MPESA", "M-Pesa"),
                        ],
                        default="UNKNOWN",
                        max_length=20,
                    ),
                ),
                migrations.AlterField(
                    model_name="transaction",
                    name="payment_method",
                    field=models.CharField(
                        choices=[
                            ("paypal", "PayPal"),
                            ("mpesa", "M-Pesa"),
                        ],
                        default="paypal",
                        max_length=50,
                    ),
                ),
            ],
        ),
    ]
