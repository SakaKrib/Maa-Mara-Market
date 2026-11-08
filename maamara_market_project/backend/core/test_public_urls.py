from django.template import Context, Template
from django.test import SimpleTestCase, override_settings
from rest_framework.test import APIClient

from core.public_urls import frontend_base, web_url


class PublicUrlTests(SimpleTestCase):
    @override_settings(FRONTEND_URL="https://shop.example.com", PUBLIC_PATH_PREFIX="/maamara")
    def test_prefix_is_added_once(self):
        self.assertEqual(frontend_base(), "https://shop.example.com/maamara")
        self.assertEqual(web_url("/item/5"), "https://shop.example.com/maamara/item/5")

    @override_settings(FRONTEND_URL="https://shop.example.com/maamara/", PUBLIC_PATH_PREFIX="/maamara")
    def test_prefix_not_duplicated(self):
        self.assertEqual(frontend_base(), "https://shop.example.com/maamara")

    @override_settings(FRONTEND_URL="https://maamaramarket.com", PUBLIC_PATH_PREFIX="/")
    def test_root_deployment_has_no_prefix(self):
        self.assertEqual(web_url("orders"), "https://maamaramarket.com/orders")


@override_settings(
    FRONTEND_URL="https://shop.example.com", PUBLIC_PATH_PREFIX="/",
    ANDROID_APP_LINK="https://play.google.com/store/apps/details?id=com.maamaramarket.app", IOS_APP_LINK="",
)
class EmailFooterAndLinksTests(SimpleTestCase):
    def render(self):
        return Template("{% load email_tags %}{% email_app_links as app_links %}"
                        "{% if app_links.android %}ANDROID:{{ app_links.android }}{% endif %}"
                        "{% if app_links.ios %}IOS:{{ app_links.ios }}{% endif %}"
                        "SITE:{{ app_links.frontend_url }}").render(Context())

    def test_footer_uses_store_links_not_apk(self):
        out = self.render()
        self.assertIn("ANDROID:https://play.google.com", out)
        self.assertNotIn("IOS:", out)
        self.assertIn("SITE:https://shop.example.com", out)
        self.assertNotIn(".apk", out.lower())

    @override_settings(ANDROID_APP_LINK="", IOS_APP_LINK="")
    def test_store_links_hidden_until_configured(self):
        out = self.render()
        self.assertNotIn("ANDROID:", out)
        self.assertNotIn("IOS:", out)

    @override_settings(ANDROID_APP_LINK="javascript:alert(1)", IOS_APP_LINK="http://insecure.example")
    def test_unsafe_links_are_dropped(self):
        out = self.render()
        self.assertNotIn("ANDROID:", out)
        self.assertNotIn("IOS:", out)

    @override_settings(ANDROID_APP_LINK="https://play.google.com/x", IOS_APP_LINK="https://apps.apple.com/y")
    def test_app_links_endpoint_is_public(self):
        res = APIClient().get("/api/app-links/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json(), {"android": "https://play.google.com/x", "ios": "https://apps.apple.com/y"})
