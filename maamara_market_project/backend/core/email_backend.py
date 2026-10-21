"""SMTP backend that embeds the approved logo in every Maa Mara Market email.

Templates reference ``<frontend>/maamara-brand-artwork.png``. That URL is not
reachable from a recipient's mail client when the frontend runs on localhost or
a private (Tailscale) address, and many clients block remote images. Rewriting it
to an inline CID image makes the logo appear in every email without touching
each sender.
"""
import logging
import re

from django.core.mail.backends.smtp import EmailBackend

from .email_branding import LOGO_CID, attach_logo

logger = logging.getLogger(__name__)

_LOGO_SRC = re.compile(r"""src=(["'])[^"']*maamara-brand-artwork\.png\1""")


def embed_logo(message):
    """Rewrite the logo URL to a CID reference and attach the image. Never raises."""
    try:
        replaced = False
        if getattr(message, "content_subtype", "") == "html" and _LOGO_SRC.search(message.body or ""):
            message.body = _LOGO_SRC.sub(f'src="cid:{LOGO_CID}"', message.body)
            replaced = True
        alternatives = []
        for content, mimetype in getattr(message, "alternatives", []) or []:
            if mimetype == "text/html" and _LOGO_SRC.search(content):
                content = _LOGO_SRC.sub(f'src="cid:{LOGO_CID}"', content)
                replaced = True
            alternatives.append((content, mimetype))
        if replaced:
            message.alternatives = alternatives
            attach_logo(message)
    except Exception:
        logger.exception("Could not embed the Maa Mara Market logo; sending without it.")


class BrandedSMTPEmailBackend(EmailBackend):
    def send_messages(self, email_messages):
        for message in email_messages or []:
            embed_logo(message)
        return super().send_messages(email_messages)
