from django.db import migrations, models


def populate_merchant_references(apps, schema_editor):
    Payment = apps.get_model("oder", "Payment")
    for payment in Payment.objects.filter(merchant_reference__isnull=True).iterator():
        payment.merchant_reference = f"LEGACY-PAYMENT-{payment.pk}"
        payment.save(update_fields=["merchant_reference"])


class Migration(migrations.Migration):

    dependencies = [
        ("oder", "0037_order_checkout_payment_data"),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            database_operations=[
                migrations.RunSQL(
                    sql="""
                    DO $$
                    BEGIN
                        IF EXISTS (
                            SELECT 1
                            FROM information_schema.columns
                            WHERE table_name = 'oder_payment'
                              AND column_name = 'timestamp'
                        ) AND NOT EXISTS (
                            SELECT 1
                            FROM information_schema.columns
                            WHERE table_name = 'oder_payment'
                              AND column_name = 'created_at'
                        ) THEN
                            ALTER TABLE oder_payment RENAME COLUMN timestamp TO created_at;
                        END IF;
                    END $$;
                    """,
                    reverse_sql=migrations.RunSQL.noop,
                ),
            ],
            state_operations=[
                migrations.RenameField(
                    model_name="payment",
                    old_name="timestamp",
                    new_name="created_at",
                ),
            ],
        ),
        migrations.SeparateDatabaseAndState(
            database_operations=[
                migrations.RunSQL(
                    sql="""
                    ALTER TABLE oder_payment
                    ADD COLUMN IF NOT EXISTS payment_gateway varchar(20) NOT NULL DEFAULT 'PESAPAL';
                    """,
                    reverse_sql=migrations.RunSQL.noop,
                ),
            ],
            state_operations=[
                migrations.AddField(
                    model_name="payment",
                    name="payment_gateway",
                    field=models.CharField(
                        choices=[("PESAPAL", "Pesapal"), ("PAYPAL", "PayPal")],
                        default="PESAPAL",
                        max_length=20,
                    ),
                ),
            ],
        ),
        migrations.SeparateDatabaseAndState(
            database_operations=[
                migrations.RunSQL(
                    sql="""
                    ALTER TABLE oder_payment
                    ADD COLUMN IF NOT EXISTS currency varchar(10) NOT NULL DEFAULT 'KES';
                    """,
                    reverse_sql=migrations.RunSQL.noop,
                ),
            ],
            state_operations=[
                migrations.AddField(
                    model_name="payment",
                    name="currency",
                    field=models.CharField(default="KES", max_length=10),
                ),
            ],
        ),
        migrations.SeparateDatabaseAndState(
            database_operations=[
                migrations.RunSQL(
                    sql="""
                    ALTER TABLE oder_payment
                    ADD COLUMN IF NOT EXISTS merchant_reference varchar(100);
                    """,
                    reverse_sql=migrations.RunSQL.noop,
                ),
            ],
            state_operations=[
                migrations.AddField(
                    model_name="payment",
                    name="merchant_reference",
                    field=models.CharField(blank=True, max_length=100, null=True),
                ),
            ],
        ),
        migrations.SeparateDatabaseAndState(
            database_operations=[
                migrations.RunSQL(
                    sql="""
                    ALTER TABLE oder_payment
                    ADD COLUMN IF NOT EXISTS order_tracking_id varchar(100);
                    """,
                    reverse_sql=migrations.RunSQL.noop,
                ),
            ],
            state_operations=[
                migrations.AddField(
                    model_name="payment",
                    name="order_tracking_id",
                    field=models.CharField(blank=True, max_length=100, null=True),
                ),
            ],
        ),
        migrations.SeparateDatabaseAndState(
            database_operations=[
                migrations.RunSQL(
                    sql="""
                    ALTER TABLE oder_payment
                    ADD COLUMN IF NOT EXISTS callback_payload jsonb;
                    """,
                    reverse_sql=migrations.RunSQL.noop,
                ),
            ],
            state_operations=[
                migrations.AddField(
                    model_name="payment",
                    name="callback_payload",
                    field=models.JSONField(blank=True, null=True),
                ),
            ],
        ),
        migrations.SeparateDatabaseAndState(
            database_operations=[
                migrations.RunSQL(
                    sql="""
                    ALTER TABLE oder_payment
                    ADD COLUMN IF NOT EXISTS paid_at timestamptz;
                    """,
                    reverse_sql=migrations.RunSQL.noop,
                ),
            ],
            state_operations=[
                migrations.AddField(
                    model_name="payment",
                    name="paid_at",
                    field=models.DateTimeField(blank=True, null=True),
                ),
            ],
        ),
        migrations.SeparateDatabaseAndState(
            database_operations=[
                migrations.RunSQL(
                    sql="""
                    ALTER TABLE oder_payment
                    ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP;
                    """,
                    reverse_sql=migrations.RunSQL.noop,
                ),
            ],
            state_operations=[
                migrations.AddField(
                    model_name="payment",
                    name="updated_at",
                    field=models.DateTimeField(auto_now=True),
                ),
            ],
        ),
        migrations.SeparateDatabaseAndState(
            database_operations=[
                migrations.RunSQL(
                    sql="""
                    ALTER TABLE oder_payment
                    ADD COLUMN IF NOT EXISTS provider_amount numeric(12, 2);
                    """,
                    reverse_sql=migrations.RunSQL.noop,
                ),
            ],
            state_operations=[
                migrations.AddField(
                    model_name="payment",
                    name="provider_amount",
                    field=models.DecimalField(
                        blank=True,
                        decimal_places=2,
                        max_digits=12,
                        null=True,
                    ),
                ),
            ],
        ),
        migrations.SeparateDatabaseAndState(
            database_operations=[
                migrations.RunSQL(
                    sql="""
                    ALTER TABLE oder_payment
                    ADD COLUMN IF NOT EXISTS provider_currency varchar(10);
                    """,
                    reverse_sql=migrations.RunSQL.noop,
                ),
            ],
            state_operations=[
                migrations.AddField(
                    model_name="payment",
                    name="provider_currency",
                    field=models.CharField(blank=True, max_length=10, null=True),
                ),
            ],
        ),
        migrations.RunPython(
            populate_merchant_references,
            migrations.RunPython.noop,
        ),
        migrations.RunSQL(
            sql="""
            CREATE UNIQUE INDEX IF NOT EXISTS oder_payment_merchant_reference_uniq
            ON oder_payment (merchant_reference);
            """,
            reverse_sql=migrations.RunSQL.noop,
        ),
        migrations.AlterField(
            model_name="payment",
            name="merchant_reference",
            field=models.CharField(max_length=100, unique=True),
        ),
    ]
