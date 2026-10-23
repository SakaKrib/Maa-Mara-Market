"""Gemini response schema for item sales suggestions (used when search is off)."""

SUGGESTION_SCHEMA = {
    "type": "object",
    "properties": {
        "verdict": {"type": "string"},
        "why": {"type": "array", "items": {"type": "string"}},
        "recommendations": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "type": {"type": "string"},
                    "title": {"type": "string"},
                    "detail": {"type": "string"},
                    "impact": {"type": "string"},
                    "suggested_discount_percent": {"type": "number"},
                    "suggested_offer_days": {"type": "number"},
                    "suggested_price": {"type": "number"},
                },
                "required": ["type", "title", "detail", "impact"],
            },
        },
        "market_notes": {"type": "array", "items": {"type": "string"}},
    },
    "required": ["verdict", "why", "recommendations"],
}
