"""Shared Maa Mara Market email branding.

The approved logo artwork is ``frontend/public/maamara-brand-artwork.svg``. Gmail
and Outlook do not display SVG images, so the identical artwork is rasterised to
``templates/emails/assets/maamara-brand-artwork.png`` and embedded in the message
(CID) so it shows even when the frontend URL is private or localhost.
"""
import base64
from email.mime.image import MIMEImage
from functools import lru_cache
from pathlib import Path

LOGO_CID = "maamara-logo"
LOGO_PATH = Path(__file__).resolve().parent.parent / "templates" / "emails" / "assets" / "maamara-brand-artwork.png"


@lru_cache(maxsize=1)
def logo_bytes():
    return LOGO_PATH.read_bytes()


def logo_data_uri():
    """Self-contained logo for in-browser previews (no network or public URL needed)."""
    return "data:image/png;base64," + base64.b64encode(logo_bytes()).decode("ascii")


def logo_cid_src():
    return f"cid:{LOGO_CID}"


def attach_logo(message):
    """Embed the logo as an inline related image on an EmailMultiAlternatives message."""
    message.mixed_subtype = "related"
    image = MIMEImage(logo_bytes(), _subtype="png")
    image.add_header("Content-ID", f"<{LOGO_CID}>")
    image.add_header("Content-Disposition", "inline", filename="maamara-logo.png")
    message.attach(image)
