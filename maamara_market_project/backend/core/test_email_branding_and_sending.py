import re
from unittest.mock import patch

from django.contrib.auth.models import User
from django.core import mail
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.test import SimpleTestCase, TestCase, override_settings
from rest_framework.test import APIClient

from core.email_backend import embed_logo
from core.email_branding import LOGO_PATH, logo_data_uri
from core.models import EmailCampaign, EmailCampaignRecipient, NewsletterSubscriber


def _luminance(hex_color):
    channels = [int(hex_color[i:i + 2], 16) / 255 for i in (1, 3, 5)]
    lin = [c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4 for c in channels]
    return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2]


def contrast(fg, bg):
    a, b = sorted((_luminance(fg), _luminance(bg)), reverse=True)
    return (a + 0.05) / (b + 0.05)


ITEMS = [{
    "id": 7, "name": "Beaded Maasai necklace", "description": "Hand made in Narok.",
    "price": "2500", "discount_price": "1999", "image_url": "https://example.test/a.jpg",
    "product_url": "https://shop.example.test/item/7",
}]


def render_campaign(**extra):
    campaign = EmailCampaign(title="Spring", subject="Sale", content_payload={"items": ITEMS}, cta_url="https://shop.example.test/")
    context = {"campaign": campaign, "frontend_url": "https://shop.example.test", "unsubscribe_url": "#"}
    context.update(extra)
    return render_to_string("emails/marketing_campaign.html", context)


class EmailTemplateRenderingTests(SimpleTestCase):
    def test_logo_png_is_the_rasterised_approved_artwork(self):
        self.assertTrue(LOGO_PATH.exists())
        self.assertEqual(LOGO_PATH.read_bytes()[:8], b"\x89PNG\r\n\x1a\n")

    def test_header_uses_png_logo_not_svg_and_shows_wordmark(self):
        html = render_campaign()
        self.assertIn("maamara-brand-artwork.png", html)
        self.assertNotIn("maamara-brand-artwork.svg", html)
        for word in ("Maa", "Mara", "Market"):
            self.assertIn(word, html)
        self.assertNotIn("display:flex", html.split('<div class="header"')[1].split("</div>")[0])

    def test_preview_logo_is_self_contained(self):
        html = render_campaign(logo_src=logo_data_uri())
        self.assertIn("src=\"data:image/png;base64,", html)

    def test_every_shop_now_button_has_20px_radius(self):
        html = render_campaign()
        anchors = re.findall(r"<a[^>]*class=\"[^\"]*shop-now[^\"]*\"[^>]*>", html)
        self.assertGreaterEqual(len(anchors), 1)
        item_button = [a for a in anchors if "item/7" in a][0]
        self.assertIn("border-radius:20px", item_button)
        # The main call-to-action button (shown when no products are featured) uses the same class.
        plain = EmailCampaign(title="T", subject="S", cta_url="https://shop.example.test/")
        cta = render_to_string("emails/marketing_campaign.html", {"campaign": plain, "frontend_url": "https://shop.example.test"})
        self.assertIn('class="button shop-now"', cta)
        self.assertIn("border-radius:20px !important", cta)

    def test_product_details_render_above_the_shop_now_button(self):
        html = render_campaign()
        positions = [html.index(text) for text in ("Beaded Maasai necklace", "Hand made in Narok.", "KSh 1999", "KSh 2500")]
        button = html.index('class="shop-now" href="https://shop.example.test/item/7"')
        self.assertEqual(positions, sorted(positions))
        self.assertTrue(all(position < button for position in positions))

    def test_product_text_is_readable_in_light_and_dark_modes(self):
        html = render_campaign()
        light_card = "#ffffff"
        dark_card = re.search(r"\.product-card,\.product-card-cell \{ background-color:(#[0-9a-f]{6})", html).group(1)
        light = {
            "name": re.search(r'class="product-name" style="[^"]*color:(#[0-9a-f]{6})', html).group(1),
            "desc": re.search(r'class="product-desc" style="[^"]*color:(#[0-9a-f]{6})', html).group(1),
            "price": re.search(r'class="product-price" style="[^"]*color:(#[0-9a-f]{6})', html).group(1),
        }
        dark = {key: re.search(r"\.product-%s \{ color:(#[0-9a-f]{6}) !important" % key, html).group(1)
                for key in ("name", "desc", "price")}
        for key, color in light.items():
            self.assertGreaterEqual(contrast(color, light_card), 4.5, f"light {key}")
        for key, color in dark.items():
            self.assertGreaterEqual(contrast(color, dark_card), 4.5, f"dark {key}")


class LogoEmbeddingTests(SimpleTestCase):
    def build(self, html):
        message = EmailMultiAlternatives("Hi", "text", "from@example.test", ["to@example.test"])
        message.attach_alternative(html, "text/html")
        return message

    def test_logo_url_is_replaced_by_inline_image(self):
        message = self.build('<img src="http://localhost:5173/maamara-brand-artwork.png" alt="logo">')
        embed_logo(message)
        self.assertIn("cid:maamara-logo", message.alternatives[0][0])
        self.assertEqual(len(message.attachments), 1)
        self.assertEqual(message.mixed_subtype, "related")
        self.assertEqual(message.attachments[0]["Content-ID"], "<maamara-logo>")

    def test_message_without_logo_is_untouched(self):
        message = self.build("<p>hello</p>")
        embed_logo(message)
        self.assertEqual(message.attachments, [])


@override_settings(FRONTEND_URL="https://shop.example.test")
class CampaignSendingTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_user("send-admin", "sa@example.com", "pw", is_staff=True)
        self.client.force_authenticate(user=self.admin)
        for email in ("one@example.test", "two@example.test"):
            NewsletterSubscriber.objects.create(email=email, consent_given=True)
        NewsletterSubscriber.objects.create(email="gone@example.test", consent_given=False)
        self.campaign = EmailCampaign.objects.create(
            title="Launch", subject="Hello", status="approved",
            content_payload={"items": ITEMS}, body_text="Body",
        )

    def test_campaign_list_reports_available_recipients_before_sending(self):
        rows = self.client.get("/api/admin/email-campaigns/").json()
        self.assertEqual(rows[0]["available_recipient_count"], 2)
        self.assertEqual(rows[0]["recipient_count"], 0)

    @patch("core.email_campaigns._worker_available", return_value=False)
    def test_send_without_a_worker_sends_directly_and_reports_counts(self, _worker):
        response = self.client.post(f"/api/admin/email-campaigns/{self.campaign.pk}/actions/send/", {}, format="json")
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["delivery"], "inline")
        self.assertEqual((body["status"], body["recipient_count"], body["sent_count"], body["failed_count"]), ("sent", 2, 2, 0))
        self.assertEqual(len(mail.outbox), 2)
        self.assertEqual(EmailCampaignRecipient.objects.filter(campaign=self.campaign, status="sent").count(), 2)

    @patch("core.email_campaigns._worker_available", return_value=False)
    def test_failed_deliveries_are_counted_and_explained_in_the_report(self, _worker):
        with patch("django.core.mail.message.EmailMessage.send", side_effect=OSError("SMTP authentication failed")):
            self.client.post(f"/api/admin/email-campaigns/{self.campaign.pk}/actions/send/", {}, format="json")
        report = self.client.get(f"/api/admin/email-campaigns/{self.campaign.pk}/report/").json()
        self.assertEqual(report["recipients"]["failed"], 2)
        self.assertEqual(report["campaign"]["status"], "failed")
        self.assertIn("SMTP authentication failed", report["errors"][0])

    @patch("core.email_campaigns._worker_available", return_value=True)
    @patch("core.email_tasks.send_email_campaign.delay")
    def test_send_with_a_worker_queues_the_task(self, delay, _worker):
        body = self.client.post(f"/api/admin/email-campaigns/{self.campaign.pk}/actions/send/", {}, format="json").json()
        delay.assert_called_once_with(self.campaign.pk)
        self.assertEqual(body["delivery"], "queued")
        self.assertEqual(body["recipient_count"], 2)

    def test_send_with_no_subscribers_is_refused(self):
        NewsletterSubscriber.objects.all().delete()
        response = self.client.post(f"/api/admin/email-campaigns/{self.campaign.pk}/actions/send/", {}, format="json")
        self.assertEqual(response.status_code, 400)

    def test_preview_endpoint_embeds_the_logo_without_a_public_url(self):
        response = self.client.post(f"/api/admin/email-campaigns/{self.campaign.pk}/actions/preview/", {}, format="json")
        html = response.content.decode()
        self.assertIn("data:image/png;base64,", html)
        self.assertIn("Beaded Maasai necklace", html)
