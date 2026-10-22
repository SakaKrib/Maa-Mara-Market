"""Recover an M-Pesa payout whose result message from Safaricom was lost.

The result callback is the only thing that marks a payout paid. If Safaricom could
not be answered (server down, bug), apply the outcome by hand after checking it on
the M-Pesa statement. This reuses the real callback handler, so every safeguard
(correlation IDs, duplicate receipts, audit log, invoice, notifications) still applies.

    python manage.py confirm_mpesa_payout <reference> --receipt QWE123RTY
    python manage.py confirm_mpesa_payout <reference> --failed --desc "Insufficient funds"
"""
import json

from django.core.management.base import BaseCommand, CommandError
from django.test import RequestFactory

from vendorDashboard.calback import mpesa_result
from vendorDashboard.models import VendorPayout
from vendorDashboard.payout.services.payout_guard import log_event_safely


class Command(BaseCommand):
    help = "Apply an M-Pesa result to a submitted payout after verifying it on the M-Pesa statement."

    def add_arguments(self, parser):
        parser.add_argument("reference")
        parser.add_argument("--receipt", help="M-Pesa transaction/receipt ID (required for a successful payout)")
        parser.add_argument("--failed", action="store_true", help="Record the payout as failed instead")
        parser.add_argument("--code", type=int, default=None, help="Result code for a failure (default 1)")
        parser.add_argument("--desc", default="", help="Result description")

    def handle(self, *args, **options):
        payout = VendorPayout.objects.filter(reference=options["reference"]).first()
        if payout is None:
            raise CommandError("Payout reference not found.")
        if payout.paid:
            raise CommandError("This payout is already marked paid.")
        if not (payout.mpesa_conversation_id or payout.mpesa_originator_conversation_id):
            raise CommandError("This payout was never submitted to M-Pesa, so there is nothing to confirm.")
        if payout.mpesa_result_code not in (None,):
            raise CommandError("M-Pesa already reported a result for this payout.")

        failed = options["failed"]
        receipt = (options["receipt"] or "").strip()
        if not failed and not receipt:
            raise CommandError("--receipt is required to confirm a successful payout.")

        result = {
            "ResultType": 0,
            "ResultCode": (options["code"] or 1) if failed else 0,
            "ResultDesc": options["desc"] or ("Recorded manually as failed." if failed else "Confirmed manually from the M-Pesa statement."),
            "OriginatorConversationID": payout.mpesa_originator_conversation_id,
            "ConversationID": payout.mpesa_conversation_id,
        }
        if not failed:
            result["TransactionID"] = receipt
        request = RequestFactory().post("/mpesa/result", data=json.dumps({"Result": result}), content_type="application/json")
        response = mpesa_result(request)
        if response.status_code != 200:
            raise CommandError(f"The result could not be applied (HTTP {response.status_code}). See the server log.")
        payout.refresh_from_db()
        log_event_safely(payout, "manual_result_applied", None, None, provider="MPESA", paid=payout.paid, receipt=receipt)
        self.stdout.write(self.style.SUCCESS(
            f"Payout {payout.reference}: {'paid, receipt ' + receipt if payout.paid else 'recorded as failed'}."
        ))
