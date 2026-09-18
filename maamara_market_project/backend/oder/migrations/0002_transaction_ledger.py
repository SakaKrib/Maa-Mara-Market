from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("oder", "0001_initial"),
        ("vendorDashboard", "0001_initial"),
    ]

    operations = [
        migrations.AlterField(
            model_name="transaction",
            name="transaction_type",
            field=models.CharField(
                choices=[
                    ("C2B", "Customer to Business"),
                    ("B2C", "Business to Customer"),
                    ("PayPal", "PayPal Payment"),
                    ("BANK_TRANSFER", "Bank Transfer"),
                ],
                max_length=30,
            ),
        ),
        migrations.AlterField(
            model_name="transaction",
            name="mpesa_receipt_number",
            field=models.CharField(blank=True, max_length=100, null=True, db_index=True),
        ),
        migrations.AlterField(
            model_name="transaction",
            name="phone_number",
            field=models.CharField(blank=True, max_length=20, null=True),
        ),
        migrations.AlterField(
            model_name="transaction",
            name="amount",
            field=models.DecimalField(decimal_places=2, default=0, max_digits=12),
        ),
        migrations.AlterField(
            model_name="transaction",
            name="account_reference",
            field=models.CharField(blank=True, max_length=100, null=True, db_index=True),
        ),
        migrations.AlterField(
            model_name="transaction",
            name="status",
            field=models.CharField(default="pending", max_length=30),
        ),
        migrations.AddField(
            model_name="transaction",
            name="payment_method",
            field=models.CharField(default="mpesa", max_length=30),
        ),
        migrations.AddField(
            model_name="transaction",
            name="visitor_id",
            field=models.CharField(blank=True, db_index=True, max_length=64, null=True),
        ),
        migrations.AddField(
            model_name="transaction",
            name="paypal_transaction_id",
            field=models.CharField(blank=True, db_index=True, max_length=255, null=True),
        ),
        migrations.AddField(
            model_name="transaction",
            name="payer_email",
            field=models.EmailField(blank=True, max_length=254, null=True),
        ),
        migrations.AddField(
            model_name="transaction",
            name="updated_at",
            field=models.DateTimeField(auto_now=True),
        ),
        migrations.AddField(
            model_name="transaction",
            name="order",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="transactions",
                to="oder.order",
            ),
        ),
        migrations.AddField(
            model_name="transaction",
            name="payment",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="transactions",
                to="oder.payment",
            ),
        ),
        migrations.AddField(
            model_name="transaction",
            name="vendor",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="transactions",
                to="vendorDashboard.vendor",
            ),
        ),
        migrations.AddIndex(
            model_name="transaction",
            index=models.Index(fields=["order", "payment"], name="oder_trans_order_p_7f8c6a_idx"),
        ),
        migrations.AddIndex(
            model_name="transaction",
            index=models.Index(fields=["transaction_type", "status"], name="oder_trans_transac_6f6d1d_idx"),
        ),
    ]
