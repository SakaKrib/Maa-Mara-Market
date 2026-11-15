from django.test import TestCase, override_settings


class AppLinksTests(TestCase):
    @override_settings(ANDROID_APP_SHA256_CERT_FINGERPRINTS="aa:bb, cc:dd")
    def test_assetlinks(self):
        r = self.client.get("/.well-known/assetlinks.json")
        self.assertEqual(r.status_code, 200)
        t = r.json()[0]["target"]
        self.assertEqual(t["sha256_cert_fingerprints"], ["AA:BB", "CC:DD"])

    @override_settings(ANDROID_APP_SHA256_CERT_FINGERPRINTS="")
    def test_assetlinks_empty(self):
        self.assertEqual(self.client.get("/.well-known/assetlinks.json").json(), [])

    @override_settings(APPLE_TEAM_ID="TEAM123456", APPLE_BUNDLE_ID="com.x.app", PUBLIC_PATH_PREFIX="/maamara")
    def test_aasa(self):
        d = self.client.get("/.well-known/apple-app-site-association").json()
        self.assertEqual(d["applinks"]["details"][0]["appID"], "TEAM123456.com.x.app")
        self.assertEqual(d["applinks"]["details"][0]["paths"], ["/maamara/*"])


class AdminPrefixRedirectTests(TestCase):
    def test_admin_login_redirect_keeps_public_prefix(self):
        from django.test import override_settings

        with override_settings(FORCE_SCRIPT_NAME="/maamara"):
            response = self.client.get("/admin/")
        self.assertEqual(response.status_code, 302)
        self.assertIn("next=/maamara/admin/", response["Location"])
