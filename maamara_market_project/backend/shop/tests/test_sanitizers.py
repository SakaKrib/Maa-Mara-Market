from django.test import SimpleTestCase

from shop.sanitizers import sanitize_rich_text


class RichTextSanitizerTests(SimpleTestCase):
    def test_removes_scripts_event_handlers_and_javascript_urls(self):
        dirty = (
            '<p>Hello</p>'
            '<script>alert(1)</script>'
            '<img src=x onerror="alert(2)">'
            '<a href="javascript:alert(3)" onclick="alert(4)">bad link</a>'
        )

        clean = sanitize_rich_text(dirty)

        self.assertIn("<p>Hello</p>", clean)
        self.assertNotIn("<script", clean.lower())
        self.assertNotIn("onerror", clean.lower())
        self.assertNotIn("onclick", clean.lower())
        self.assertNotIn("javascript:", clean.lower())

    def test_keeps_supported_rich_text(self):
        dirty = (
            '<h2>Requirements</h2>'
            '<p><strong>Experience</strong> is required.</p>'
            '<ul><li>Python</li><li>Django</li></ul>'
            '<blockquote>Useful context</blockquote>'
        )

        clean = sanitize_rich_text(dirty)

        for fragment in (
            "<h2>Requirements</h2>",
            "<strong>Experience</strong>",
            "<ul>",
            "<li>Python</li>",
            "<blockquote>Useful context</blockquote>",
        ):
            self.assertIn(fragment, clean)
