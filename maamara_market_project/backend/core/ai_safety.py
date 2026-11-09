"""Shared safety layer for every Gemini call (blog, item, registration, insights).

* Requests carry explicit safety settings for all adjustable harm categories.
* Responses that Gemini blocked (prompt or output) raise ``AIBlockedError`` instead
  of returning half-empty content; the message is safe to show to the vendor.
* AI output is only ever a draft for a vendor to review; see docs/AI_SAFETY.md.
"""

SAFETY_CATEGORIES = (
    "HARM_CATEGORY_HARASSMENT",
    "HARM_CATEGORY_HATE_SPEECH",
    "HARM_CATEGORY_SEXUALLY_EXPLICIT",
    "HARM_CATEGORY_DANGEROUS_CONTENT",
)
SAFETY_SETTINGS = [
    {"category": category, "threshold": "BLOCK_MEDIUM_AND_ABOVE"} for category in SAFETY_CATEGORIES
]

BLOCKING_FINISH_REASONS = {
    "SAFETY", "PROHIBITED_CONTENT", "BLOCKLIST", "SPII", "IMAGE_SAFETY", "RECITATION",
}

BLOCKED_MESSAGE = (
    "The AI could not produce this because it may break our content rules. "
    "Please change the title, image or details and try again, or write it yourself."
)


class AIBlockedError(ValueError):
    """Gemini refused the prompt or the output. Message is safe to show users."""

    def __init__(self, message=BLOCKED_MESSAGE):
        super().__init__(message)


def with_safety(payload):
    """Return the request payload with safety settings attached."""
    payload["safetySettings"] = SAFETY_SETTINGS
    return payload


def ensure_not_blocked(data):
    """Raise AIBlockedError if Gemini blocked the prompt or the generated output."""
    feedback = data.get("promptFeedback") or {}
    if feedback.get("blockReason"):
        raise AIBlockedError()
    candidates = data.get("candidates") or []
    if candidates and all(
        (candidate.get("finishReason") or "") in BLOCKING_FINISH_REASONS for candidate in candidates
    ):
        raise AIBlockedError()
    return data
