import shutil
import subprocess
import tempfile
from unittest.mock import patch

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import SimpleTestCase
from rest_framework import serializers

from core.video_limits import VideoUnreadable, check_video_length
from shop.Serializers import BlogPostSerializer


def clip(name="clip.mp4", content_type="video/mp4"):
    return SimpleUploadedFile(name, b"fake-bytes", content_type=content_type)


class VideoLengthRuleTests(SimpleTestCase):
    def check(self, seconds):
        with patch("core.video_limits.probe_duration", return_value=seconds):
            return check_video_length(clip(), label="blog video")

    def test_clip_inside_the_limits_is_accepted(self):
        self.assertIsNone(self.check(3))
        self.assertIsNone(self.check(9.5))
        self.assertIsNone(self.check(15))

    def test_a_small_overshoot_from_browser_recording_is_tolerated(self):
        self.assertIsNone(self.check(15.4))

    def test_untrimmed_clip_is_rejected_with_a_clear_message(self):
        message = self.check(42)
        self.assertIn("42 seconds", message)
        self.assertIn("trim", message)

    def test_too_short_clip_is_rejected(self):
        self.assertIn("too short", self.check(1))

    def test_unreadable_file_is_rejected(self):
        with patch("core.video_limits.probe_duration", side_effect=VideoUnreadable("bad")):
            self.assertIn("could not be read", check_video_length(clip()))

    def test_without_ffprobe_the_server_does_not_block_posting(self):
        self.assertIsNone(self.check(None))

    def test_blog_serializer_rejects_a_long_video(self):
        with patch("core.video_limits.probe_duration", return_value=60):
            with self.assertRaises(serializers.ValidationError):
                BlogPostSerializer().validate_video(clip())

    def test_blog_serializer_accepts_a_trimmed_video(self):
        with patch("core.video_limits.probe_duration", return_value=10):
            self.assertIsNotNone(BlogPostSerializer().validate_video(clip()))


import unittest


@unittest.skipUnless(shutil.which("ffmpeg") and shutil.which("ffprobe"), "ffmpeg is not installed")
class RealFileTests(SimpleTestCase):
    def make(self, seconds):
        handle = tempfile.NamedTemporaryFile(suffix=".mp4")
        subprocess.run(
            ["ffmpeg", "-loglevel", "error", "-y", "-f", "lavfi", "-i", f"testsrc=duration={seconds}:size=160x120:rate=10", handle.name],
            check=True,
        )
        self.addCleanup(handle.close)
        with open(handle.name, "rb") as source:
            return SimpleUploadedFile("real.mp4", source.read(), content_type="video/mp4")

    def test_a_thirty_second_file_is_rejected_and_an_eight_second_file_passes(self):
        self.assertIn("seconds long", check_video_length(self.make(30), label="blog video"))
        self.assertIsNone(check_video_length(self.make(8), label="blog video"))

    def test_the_upload_can_still_be_saved_after_checking(self):
        upload = self.make(8)
        check_video_length(upload)
        self.assertEqual(upload.read()[:4] != b"", True)
