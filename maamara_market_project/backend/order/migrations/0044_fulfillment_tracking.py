import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("oder", "0043_transaction_b2b_type"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="OrderItemFulfillment",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("status", models.CharField(
                    choices=[
                        ("PAID", "Paid - awaiting vendor processing"),
                        ("PROCESSING", "Processing"),
                        ("PACKING", "Packing"),
                        ("READY_TO_SHIP", "Ready for dispatch inspection"),
                        ("DISPATCH_INSPECTED", "Dispatch inspection passed"),
                        ("SHIPPED", "Handed to carrier"),
                        ("IN_TRANSIT", "In transit"),
                        ("OUT_FOR_DELIVERY", "Out for delivery"),
                        ("DELIVERED", "Delivered"),
                        ("AWAITING_CONFIRMATION", "Awaiting customer confirmation"),
                        ("COMPLETED", "Customer accepted or acceptance window elapsed"),
                        ("ISSUE_REPORTED", "Customer reported a problem"),
                        ("CANCELLED", "Cancelled"),
                    ],
                    db_index=True,
                    default="PAID",
                    max_length=32,
                )),
                ("inspection_status", models.CharField(
                    choices=[("PENDING", "Pending inspection"), ("PASSED", "Passed"), ("FAILED", "Failed")],
                    default="PENDING",
                    max_length=16,
                )),
                ("dispatch_inspected_at", models.DateTimeField(blank=True, null=True)),
                ("dispatch_notes", models.TextField(blank=True, default="")),
                ("delivery_reported_at", models.DateTimeField(blank=True, null=True)),
                ("confirmation_deadline", models.DateTimeField(blank=True, db_index=True, null=True)),
                ("customer_confirmed_at", models.DateTimeField(blank=True, null=True)),
                ("completed_at", models.DateTimeField(blank=True, null=True)),
                ("payout_eligible_at", models.DateTimeField(blank=True, db_index=True, null=True)),
                ("hold_reason", models.TextField(blank=True, default="")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("dispatch_inspected_by", models.ForeignKey(
                    blank=True,
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name="+",
                    to=settings.AUTH_USER_MODEL,
                )),
                ("order_item", models.OneToOneField(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name="fulfillment",
                    to="oder.orderitem",
                )),
            ],
            options={"ordering": ["-updated_at"]},
        ),
        migrations.CreateModel(
            name="Shipment",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("carrier", models.CharField(choices=[("DHL", "DHL"), ("FEDEX", "FedEx"), ("OTHER", "Other carrier")], max_length=16)),
                ("service", models.CharField(blank=True, default="", max_length=120)),
                ("tracking_number", models.CharField(max_length=120)),
                ("tracking_url", models.URLField(blank=True, default="", max_length=500)),
                ("status", models.CharField(
                    choices=[
                        ("LABEL_CREATED", "Shipment recorded"),
                        ("SHIPPED", "Handed to carrier"),
                        ("IN_TRANSIT", "In transit"),
                        ("OUT_FOR_DELIVERY", "Out for delivery"),
                        ("DELIVERED", "Delivered"),
                        ("EXCEPTION", "Carrier exception"),
                        ("RETURNED", "Returned to sender"),
                    ],
                    db_index=True,
                    default="LABEL_CREATED",
                    max_length=24,
                )),
                ("latest_event_description", models.CharField(blank=True, default="", max_length=500)),
                ("handed_over_at", models.DateTimeField(blank=True, null=True)),
                ("estimated_delivery_at", models.DateTimeField(blank=True, null=True)),
                ("delivered_at", models.DateTimeField(blank=True, null=True)),
                ("last_synced_at", models.DateTimeField(blank=True, null=True)),
                ("provider_payload", models.JSONField(blank=True, default=dict)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("created_by", models.ForeignKey(
                    blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL,
                    related_name="+", to=settings.AUTH_USER_MODEL,
                )),
                ("order", models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name="shipments",
                    to="oder.order",
                )),
                ("order_items", models.ManyToManyField(
                    blank=True,
                    related_name="shipments",
                    to="oder.orderitemfulfillment",
                )),
            ],
            options={"ordering": ["-created_at"]},
        ),
        migrations.CreateModel(
            name="ShipmentEvent",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("carrier_event_id", models.CharField(blank=True, max_length=160, null=True)),
                ("status", models.CharField(max_length=24)),
                ("description", models.CharField(blank=True, default="", max_length=500)),
                ("source", models.CharField(
                    choices=[
                        ("CARRIER_API", "Carrier API"),
                        ("CARRIER_WEBHOOK", "Carrier webhook"),
                        ("STAFF", "Staff update"),
                        ("SYSTEM", "System"),
                    ],
                    default="SYSTEM",
                    max_length=24,
                )),
                ("occurred_at", models.DateTimeField(blank=True, null=True)),
                ("received_at", models.DateTimeField(auto_now_add=True)),
                ("payload", models.JSONField(blank=True, default=dict)),
                ("shipment", models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name="events",
                    to="oder.shipment",
                )),
            ],
            options={"ordering": ["occurred_at", "received_at"]},
        ),
        migrations.CreateModel(
            name="FulfillmentEvent",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("source", models.CharField(
                    choices=[
                        ("VENDOR", "Vendor"),
                        ("STAFF", "Dispatch/admin"),
                        ("CUSTOMER", "Customer"),
                        ("CARRIER_API", "Carrier API"),
                        ("CARRIER_WEBHOOK", "Carrier webhook"),
                        ("SYSTEM", "System"),
                    ],
                    default="SYSTEM",
                    max_length=24,
                )),
                ("event_type", models.CharField(max_length=64)),
                ("from_status", models.CharField(blank=True, default="", max_length=32)),
                ("to_status", models.CharField(blank=True, default="", max_length=32)),
                ("note", models.TextField(blank=True, default="")),
                ("metadata", models.JSONField(blank=True, default=dict)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("actor", models.ForeignKey(
                    blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL,
                    related_name="+", to=settings.AUTH_USER_MODEL,
                )),
                ("fulfillment", models.ForeignKey(
                    blank=True, null=True, on_delete=django.db.models.deletion.CASCADE,
                    related_name="events", to="oder.orderitemfulfillment",
                )),
                ("order", models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name="fulfillment_events",
                    to="oder.order",
                )),
                ("shipment", models.ForeignKey(
                    blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL,
                    related_name="fulfillment_events", to="oder.shipment",
                )),
            ],
            options={"ordering": ["created_at", "id"]},
        ),
        migrations.AddIndex(
            model_name="orderitemfulfillment",
            index=models.Index(fields=["status", "confirmation_deadline"], name="fulfill_status_deadline_idx"),
        ),
        migrations.AddIndex(
            model_name="fulfillmentevent",
            index=models.Index(fields=["order", "created_at"], name="fulfill_event_order_time_idx"),
        ),
        migrations.AddConstraint(
            model_name="shipment",
            constraint=models.UniqueConstraint(
                fields=("carrier", "tracking_number"),
                condition=~models.Q(tracking_number=""),
                name="uniq_carrier_tracking_number",
            ),
        ),
        migrations.AddConstraint(
            model_name="shipmentevent",
            constraint=models.UniqueConstraint(
                fields=("shipment", "carrier_event_id"),
                condition=models.Q(carrier_event_id__isnull=False) & ~models.Q(carrier_event_id=""),
                name="uniq_shipment_carrier_event",
            ),
        ),
    ]
