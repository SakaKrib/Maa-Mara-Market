"""Automatic first-pass filter for user-written text (reviews, comments, messages).

It blocks the clearest cases before they are saved: threats, self-harm incitement,
sexual solicitation, scam phrases, spammy links, and anything on the owner's own
term list (``CONTENT_FILTER_EXTRA_TERMS`` in settings, comma separated). Everything
else is left to reports and moderators; see docs/MODERATION_PROCEDURE.md.
"""
import re
import unicodedata

from django.conf import settings

BLOCKED_MESSAGE = (
    "This text may break our community rules, so it was not posted. "
    "Please remove abusive, threatening, sexual or spam content and try again."
)

# Short phrases that are abusive in almost any context. Extend via settings.
DEFAULT_BLOCKED_PHRASES = (
    "kill yourself", "go kill yourself", "i will kill you", "i'll kill you", "i will find you and",
    "you should die", "hope you die", "rape you", "send nudes", "nude pics", "nudes for sale",
    "free money click", "wire me money", "western union me", "guaranteed investment returns",
    "double your money", "whatsapp me for", "dm me for sex", "escort service", "buy followers",
)

_LEET = str.maketrans({"0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "@": "a", "$": "s", "!": "i"})
_URL = re.compile(r"(https?://|www\.)\S+|\b[\w-]+\.(com|net|org|co\.ke|ke|info|biz|xyz|ru|cn)\b", re.I)
_PHONE = re.compile(r"(?:\+?\d[\s-]?){9,}")
_EMAIL = re.compile(r"[\w.+-]+@[\w-]+\.[\w.-]+")


def _normalise(text):
    text = unicodedata.normalize("NFKD", str(text or "")).encode("ascii", "ignore").decode("ascii").lower()
    text = text.translate(_LEET)
    text = re.sub(r"(.)\1{2,}", r"\1\1", text)          # coooool -> cool
    text = re.sub(r"[^a-z0-9' ]+", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def _squash(text):
    """Collapse every run of repeated characters so 'kiiiill' and 'kill' compare equal."""
    return re.sub(r"(.)\1+", r"\1", text)


def _blocked_phrases():
    extra = [t.strip().lower() for t in str(getattr(settings, "CONTENT_FILTER_EXTRA_TERMS", "") or "").split(",")]
    return [p for p in (*DEFAULT_BLOCKED_PHRASES, *extra) if p]


def check_text(text, *, allow_contact=False):
    """Return (ok, reason). ``allow_contact`` lets private messages include phone numbers and emails."""
    if not getattr(settings, "CONTENT_FILTER_ENABLED", True):
        return True, ""
    raw = str(text or "")
    normalised = f" {_squash(_normalise(raw))} "
    for phrase in _blocked_phrases():
        if f" {_squash(_normalise(phrase))} " in normalised:
            return False, "abusive"
    if len(_URL.findall(raw)) > 1:
        return False, "links"
    if not allow_contact and (_PHONE.search(raw) or _EMAIL.search(raw) or _URL.search(raw)):
        return False, "contact"
    return True, ""


def reject_if_blocked(text, *, allow_contact=False):
    """Raise a DRF ValidationError when the text is blocked (staff are exempt at call sites)."""
    from rest_framework.exceptions import ValidationError

    ok, _reason = check_text(text, allow_contact=allow_contact)
    if not ok:
        raise ValidationError({"detail": BLOCKED_MESSAGE})
