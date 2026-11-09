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
