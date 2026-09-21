import bleach

RICH_TEXT_TAGS = {
    "p", "br", "strong", "em", "u", "s",
    "h1", "h2", "h3",
    "ul", "ol", "li",
    "blockquote", "pre", "code",
}

RICH_TEXT_ATTRIBUTES = {
    "a": {"href", "title", "target", "rel"},
}

RICH_TEXT_PROTOCOLS = {"http", "https", "mailto"}


def sanitize_rich_text(value):
    """Return a strictly allow-listed HTML fragment safe for rich-text rendering."""
    if not value:
        return ""

    return bleach.clean(
        str(value),
        tags=RICH_TEXT_TAGS,
        attributes=RICH_TEXT_ATTRIBUTES,
        protocols=RICH_TEXT_PROTOCOLS,
        strip=True,
        strip_comments=True,
    )
