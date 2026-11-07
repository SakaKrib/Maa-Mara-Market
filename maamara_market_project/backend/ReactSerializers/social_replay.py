"""Replay protection and server-issued nonces for social sign-in.

An ID token is only valid for a single exchange: its hash is remembered until
it would have expired anyway. Native Apple sign-in additionally binds each
attempt to a one-time nonce this server issued, so a token minted for another
request cannot be submitted here.
"""
import hashlib
import secrets
import time

from django.core.cache import cache
from rest_framework.exceptions import AuthenticationFailed

NONCE_TTL_SECONDS = 600


def _digest(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def issue_nonce() -> str:
    raw = secrets.token_urlsafe(32)
    cache.set(f"social-nonce:{_digest(raw)}", 1, NONCE_TTL_SECONDS)
    return raw


def consume_nonce(raw: str) -> str:
    """Return the SHA-256 form Apple embeds in the token; fail unless freshly issued."""
    if not isinstance(raw, str) or not raw or len(raw) > 256:
        raise AuthenticationFailed("Sign-in session is missing. Please try again.")
    key = f"social-nonce:{_digest(raw)}"
    if cache.get(key) is None:
        raise AuthenticationFailed("Sign-in session expired. Please try again.")
    cache.delete(key)
    return _digest(raw)


def reject_replay(token: str, claims: dict) -> None:
    ttl = max(int(claims.get("exp", 0) or 0) - int(time.time()), 0) + 60
    if not cache.add(f"social-token:{_digest(token)}", 1, ttl):
        raise AuthenticationFailed("This sign-in was already used. Please try again.")
