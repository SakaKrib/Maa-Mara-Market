import re

from allauth.socialaccount.models import SocialAccount
from django.contrib.auth.models import User
from django.core import mail
from django.core.cache import cache
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from core.models import AccountDeletionRecord, Notification, Profile, Wallet
from order.models import Order


@override_settings(RATE_LIMITS_ENABLED=False, EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
                   FRONTEND_URL="https://example.test", PUBLIC_PATH_PREFIX="/")
class AccountDeletionTests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()
        self.user = User.objects.create_user("ann", "ann@example.com", "pw-12345!x", first_name="Ann")
        Profile.objects.get_or_create(user=self.user, defaults={"phone_number": "0700"})
        Wallet.objects.get_or_create(user=self.user)
        Notification.objects.create(user=self.user, message="hi")

    def _delete(self, **body):
        self.client.force_authenticate(self.user)
        return self.client.post("/api/account/delete/", body, format="json")

    def test_requires_login(self):
        self.assertIn(self.client.post("/api/account/delete/", {"confirm": "DELETE"}, format="json").status_code, (401, 403))

    def test_needs_typed_confirmation_and_password(self):
        self.assertEqual(self._delete(password="pw-12345!x").status_code, 400)
        self.assertEqual(self._delete(confirm="DELETE", password="wrong").status_code, 403)
        self.user.refresh_from_db()
        self.assertTrue(self.user.is_active)

    def test_password_user_is_anonymised_and_cannot_log_in(self):
        res = self._delete(confirm="DELETE", password="pw-12345!x")
        self.assertEqual(res.status_code, 200, res.content)
        self.user.refresh_from_db()
        self.assertFalse(self.user.is_active)
        self.assertFalse(self.user.has_usable_password())
        self.assertNotIn("ann", self.user.username)
        self.assertTrue(self.user.email.endswith("@deleted.invalid"))
        self.assertEqual(self.user.first_name, "")
        self.assertFalse(Profile.objects.filter(user=self.user).exists())
        self.assertFalse(Wallet.objects.filter(user=self.user).exists())
        record = AccountDeletionRecord.objects.get()
        self.assertEqual(record.status, "completed")
        self.assertNotIn("ann@example.com", record.email_hash)
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to, ["ann@example.com"])
        self.assertFalse(self.client.login(username="ann", password="pw-12345!x"))

    def test_social_account_links_removed_and_code_flow(self):
        user = User.objects.create_user("soc", "soc@example.com", None)
        SocialAccount.objects.create(user=user, provider="apple", uid="a-1")
        self.client.force_authenticate(user)
        info = self.client.get("/api/account/delete/info/").json()
        self.assertFalse(info["has_password"])
        bad = self.client.post("/api/account/delete/", {"confirm": "DELETE", "code": "000000"}, format="json")
        self.assertEqual(bad.status_code, 403)
        self.assertEqual(self.client.post("/api/account/delete/send-code/").status_code, 200)
        code = re.search(r"code is (\d{6})", mail.outbox[-1].body).group(1)
        ok = self.client.post("/api/account/delete/", {"confirm": "DELETE", "code": code}, format="json")
        self.assertEqual(ok.status_code, 200, ok.content)
        self.assertFalse(SocialAccount.objects.filter(user=user).exists())
        replay = self.client.post("/api/account/delete/", {"confirm": "DELETE", "code": code}, format="json")
        self.assertNotEqual(replay.status_code, 200)

    def test_code_locks_after_too_many_wrong_attempts(self):
        user = User.objects.create_user("soc2", "soc2@example.com", None)
        self.client.force_authenticate(user)
        self.client.post("/api/account/delete/send-code/")
        code = re.search(r"code is (\d{6})", mail.outbox[-1].body).group(1)
        for _ in range(5):
            self.client.post("/api/account/delete/", {"confirm": "DELETE", "code": "999999"}, format="json")
        res = self.client.post("/api/account/delete/", {"confirm": "DELETE", "code": code}, format="json")
        self.assertEqual(res.status_code, 403)

    def test_open_order_blocks_deletion_and_keeps_account(self):
        Order.objects.create(user=self.user, status="SHIPPED", ordered_date=timezone.now())
        res = self._delete(confirm="DELETE", password="pw-12345!x")
        self.assertEqual(res.status_code, 409)
        self.user.refresh_from_db()
        self.assertTrue(self.user.is_active)

    def test_completed_orders_are_kept(self):
        order = Order.objects.create(user=self.user, status="COMPLETED", ordered_date=timezone.now())
        self.assertEqual(self._delete(confirm="DELETE", password="pw-12345!x").status_code, 200)
        order.refresh_from_db()
        self.assertEqual(order.user_id, self.user.pk)

    def test_staff_cannot_self_delete(self):
        self.user.is_staff = True
        self.user.save()
        self.assertEqual(self._delete(confirm="DELETE", password="pw-12345!x").status_code, 409)

    # ---- public web flow
    def test_public_request_sends_link_and_does_not_reveal_accounts(self):
        known = self.client.post("/api/account/deletion-request/", {"email": "ANN@example.com"}, format="json")
        unknown = self.client.post("/api/account/deletion-request/", {"email": "nobody@example.com"}, format="json")
        self.assertEqual(known.status_code, 200)
        self.assertEqual(known.json(), unknown.json())
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn("https://example.test/delete-account?token=", mail.outbox[0].body)

    def test_public_confirm_deletes_and_link_is_single_use(self):
        self.client.post("/api/account/deletion-request/", {"email": "ann@example.com"}, format="json")
        token = re.search(r"token=(\S+)", mail.outbox[0].body).group(1)
        res = self.client.post("/api/account/deletion-request/confirm/", {"token": token}, format="json")
        self.assertEqual(res.status_code, 200, res.content)
        self.user.refresh_from_db()
        self.assertFalse(self.user.is_active)
        again = self.client.post("/api/account/deletion-request/confirm/", {"token": token}, format="json")
        self.assertEqual(again.status_code, 400)
        self.assertEqual(AccountDeletionRecord.objects.get().channel, "web")

    def test_public_confirm_rejects_tampered_token(self):
        res = self.client.post("/api/account/deletion-request/confirm/", {"token": "garbage"}, format="json")
        self.assertEqual(res.status_code, 400)

    def test_public_confirm_blocked_account_is_queued_for_review(self):
        self.user.is_staff = True
        self.user.save()
        self.client.post("/api/account/deletion-request/", {"email": "ann@example.com"}, format="json")
        token = re.search(r"token=(\S+)", mail.outbox[0].body).group(1)
        res = self.client.post("/api/account/deletion-request/confirm/", {"token": token}, format="json")
        self.assertEqual(res.status_code, 202)
        self.assertEqual(AccountDeletionRecord.objects.get().status, "pending_review")
        self.user.refresh_from_db()
        self.assertTrue(self.user.is_active)


@override_settings(RATE_LIMITS_ENABLED=False, PUBLIC_PATH_PREFIX="/")
class AppleRevocationTests(TestCase):
    def test_deletion_revokes_apple_token_and_survives_failure(self):
        from unittest import mock
        from core.account_deletion import anonymise_user

        user = User.objects.create_user("apl", "apl@example.com", "pw-12345!x")
        Profile.objects.update_or_create(user=user, defaults={
            "phone_number": "0700", "apple_refresh_token": "r-token", "apple_token_client_id": "com.example.app",
        })
        with mock.patch("ReactSerializers.apple_auth.revoke_apple_token", return_value=True) as revoke:
            anonymise_user(user)
        revoke.assert_called_once_with("r-token", "com.example.app")
        self.assertFalse(Profile.objects.filter(user=user).exists())

        other = User.objects.create_user("apl2", "apl2@example.com", "pw-12345!x")
        Profile.objects.update_or_create(user=other, defaults={"phone_number": "0701", "apple_refresh_token": "t2",
                                                               "apple_token_client_id": "svc"})
        with mock.patch("ReactSerializers.apple_auth.revoke_apple_token", side_effect=RuntimeError("down")):
            anonymise_user(other)
        other.refresh_from_db()
        self.assertFalse(other.is_active)

    def test_user_without_apple_token_skips_revocation(self):
        from unittest import mock
        from core.account_deletion import anonymise_user

        user = User.objects.create_user("noapl", "n@example.com", "pw-12345!x")
        Profile.objects.update_or_create(user=user, defaults={"phone_number": "0702"})
        with mock.patch("ReactSerializers.apple_auth.revoke_apple_token") as revoke:
            anonymise_user(user)
        revoke.assert_not_called()
