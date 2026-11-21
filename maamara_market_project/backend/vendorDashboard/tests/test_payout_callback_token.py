import json

from django.test import TestCase, override_settings

BODY = json.dumps({"Result": {"ResultCode": 0, "ConversationID": "nomatch", "OriginatorConversationID": "nomatch"}})
URLS = ["/mpesa/result", "/mpesa/b2b/till/result", "/mpesa/b2b/paybill/result"]


class PayoutCallbackTokenTests(TestCase):
    def post(self, url):
        return self.client.post(url, BODY, content_type="application/json")

    @override_settings(MPESA_PAYOUT_CALLBACK_TOKEN="s3cret")
    def test_wrong_or_missing_token_rejected(self):
        for url in URLS:
            self.assertEqual(self.post(url).status_code, 403, url)
            self.assertEqual(self.post(url + "?token=nope").status_code, 403, url)

    @override_settings(MPESA_PAYOUT_CALLBACK_TOKEN="s3cret")
    def test_correct_token_accepted(self):
        for url in URLS:
            self.assertEqual(self.post(url + "?token=s3cret").status_code, 200, url)

    @override_settings(MPESA_PAYOUT_CALLBACK_TOKEN="s3cret")
    def test_timeout_requires_token(self):
        self.assertEqual(self.post("/mpesa/b2b/paybill/timeout").status_code, 403)

    @override_settings(MPESA_PAYOUT_CALLBACK_TOKEN="")
    def test_not_enforced_when_unset(self):
        self.assertEqual(self.post("/mpesa/b2b/paybill/result").status_code, 200)

    @override_settings(MPESA_PAYOUT_CALLBACK_TOKEN="payout-secret", MPESA_CALLBACK_TOKEN="shared-secret")
    def test_shared_token_also_accepted(self):
        self.assertEqual(self.post("/mpesa/b2b/till/result?token=shared-secret").status_code, 200)
        self.assertEqual(self.post("/mpesa/b2b/till/result?token=payout-secret").status_code, 200)
        self.assertEqual(self.post("/mpesa/b2b/till/result?token=other").status_code, 403)

    @override_settings(MPESA_PAYOUT_CALLBACK_TOKEN=' "s3cret" ')
    def test_quotes_and_spaces_in_env_ignored(self):
        self.assertEqual(self.post("/mpesa/b2b/till/result?token=s3cret").status_code, 200)
