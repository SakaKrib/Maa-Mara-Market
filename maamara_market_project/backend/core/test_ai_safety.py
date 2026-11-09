from unittest import mock

from django.contrib.auth.models import User
from django.test import SimpleTestCase, TestCase, override_settings
from rest_framework.test import APIClient

from core import ai_safety
from core.ai_safety import AIBlockedError, ensure_not_blocked, with_safety


class SafetyHelperTests(SimpleTestCase):
    def test_safety_settings_cover_all_categories(self):
        payload = with_safety({"contents": []})
        categories = {row["category"] for row in payload["safetySettings"]}
        self.assertEqual(categories, set(ai_safety.SAFETY_CATEGORIES))
        self.assertTrue(all(row["threshold"] == "BLOCK_MEDIUM_AND_ABOVE" for row in payload["safetySettings"]))

    def test_blocked_prompt_raises(self):
        with self.assertRaises(AIBlockedError):
            ensure_not_blocked({"promptFeedback": {"blockReason": "SAFETY"}})

    def test_blocked_output_raises(self):
        with self.assertRaises(AIBlockedError):
            ensure_not_blocked({"candidates": [{"finishReason": "SAFETY"}]})

    def test_normal_response_passes(self):
        data = {"candidates": [{"finishReason": "STOP", "content": {"parts": [{"text": "{}"}]}}]}
        self.assertIs(ensure_not_blocked(data), data)

    def test_blocked_error_is_a_value_error_with_friendly_message(self):
        self.assertIsInstance(AIBlockedError(), ValueError)
        self.assertIn("content rules", str(AIBlockedError()))


class BlogAiViewTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user("vend", "v@example.com", "pw")

    @override_settings(GEMINI_API_KEY="test-key")
    def test_request_sends_safety_settings(self):
        from core import blog_ai

        ok = mock.Mock(ok=True)
        ok.json.return_value = {"candidates": [{"finishReason": "STOP",
                                                "content": {"parts": [{"text": '{"content": "<p>Hi</p>"}'}]}}]}
        with mock.patch.object(blog_ai.requests, "post", return_value=ok) as post:
            result = blog_ai._generate("prompt", [])
        self.assertEqual(result["content"], "<p>Hi</p>")
        self.assertIn("safetySettings", post.call_args.kwargs["json"])

    @override_settings(GEMINI_API_KEY="test-key")
    def test_blocked_generation_is_reported_as_blocked(self):
        from core import blog_ai

        blocked = mock.Mock(ok=True)
        blocked.json.return_value = {"promptFeedback": {"blockReason": "SAFETY"}}
        with mock.patch.object(blog_ai.requests, "post", return_value=blocked):
            with self.assertRaises(AIBlockedError):
                blog_ai._generate("prompt", [])
