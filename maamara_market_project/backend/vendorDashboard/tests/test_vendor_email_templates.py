from django.test import SimpleTestCase
from django.template.loader import render_to_string


class VendorEmailTemplateTests(SimpleTestCase):
    def render_email(self, template_name, **context):
        defaults = {
            "frontend_url": "https://market.example",
            "company_address": "Nairobi, Kenya",
        }
        defaults.update(context)
        return render_to_string(template_name, defaults)

    def assert_shared_branding(self, html):
        self.assertIn("Maa Mara Market", html)
        self.assertIn("market.example", html)
        self.assertIn("Nairobi, Kenya", html)
        self.assertIn("support@maamaramarket.com", html)
        self.assertIn("©", html)

    def test_vendor_otp_email_uses_shared_layout_and_displays_expiry(self):
        html = self.render_email(
            "emails/vendor_otp.html",
            first_name="Amina",
            otp="012345",
            otp_expiry_minutes=3,
        )
        self.assert_shared_branding(html)
        self.assertIn("012345", html)
        self.assertIn("3 minutes", html)
        self.assertIn("Verify your vendor registration", html)

    def test_vendor_verified_email_uses_shared_layout(self):
        html = self.render_email(
            "emails/vendor_verified.html",
            first_name="Amina",
        )
        self.assert_shared_branding(html)
        self.assertIn("Registration verified", html)
        self.assertIn("fully approved", html)

    def test_admin_vendor_notification_uses_configured_review_link(self):
        html = self.render_email(
            "emails/vendor_verified_admin.html",
            username="vendor-one",
            vendor_email="vendor@example.com",
            review_url="https://api.example/admin/vendor-requests/42/",
        )
        self.assert_shared_branding(html)
        self.assertIn("vendor@example.com", html)
        self.assertIn("https://api.example/admin/vendor-requests/42/", html)
        self.assertNotIn("yourdomain.com", html)

    def test_customer_registration_otp_emails_use_shared_layout(self):
        for template_name, heading in (
            ("emails/registration_otp.html", "Verify Your Account"),
            ("emails/resend_otp.html", "New Verification Code"),
        ):
            with self.subTest(template=template_name):
                html = self.render_email(
                    template_name,
                    first_name="Amina",
                    otp="012345",
                    otp_expiry_minutes=3,
                )
                self.assert_shared_branding(html)
                self.assertIn("012345", html)
                self.assertIn("3 minutes", html)
                self.assertIn(heading, html)

    def test_customer_registration_confirmation_uses_shared_layout(self):
        html = self.render_email(
            "emails/registration_verification.html",
            first_name="Amina",
            username="amina",
            dashboard_url="https://market.example/user-account",
        )
        self.assert_shared_branding(html)
        self.assertIn("Account Verified", html)
        self.assertIn("https://market.example/user-account", html)
