"""Server-side check of a video's length.

The browser trims clips before upload, but the server must not rely on that:
an old app build, an unsupported WebView or a direct API call can all send an
untrimmed file. ``ffprobe`` (shipped with ffmpeg in the backend image) reads the
real duration so the limit holds on every path.
"""
import logging
import os
import shutil
import subprocess
import tempfile

logger = logging.getLogger(__name__)

MIN_SECONDS = 3
MAX_SECONDS = 15
# MediaRecorder clips and container rounding can land a fraction over the limit.
TOLERANCE_SECONDS = 0.75
PROBE_TIMEOUT_SECONDS = 25


class VideoUnreadable(ValueError):
    """The file is not a video that ffprobe can read."""


def _run(args):
    return subprocess.run(args, capture_output=True, text=True, timeout=PROBE_TIMEOUT_SECONDS)


def probe_duration(path):
    """Seconds of video in ``path``; None only when ffprobe is not installed."""
    ffprobe = shutil.which("ffprobe")
    if not ffprobe:
        return None
    try:
        result = _run([ffprobe, "-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", path])
        if result.returncode != 0:
            raise VideoUnreadable(result.stderr.strip() or "ffprobe failed")
        text = result.stdout.strip()
        if text and text != "N/A":
            return float(text.splitlines()[0])
        # Browser-recorded WebM clips carry no duration header: use the last packet time.
        packets = _run([
            ffprobe, "-v", "error", "-select_streams", "v:0",
            "-show_entries", "packet=pts_time", "-of", "csv=p=0", path,
        ])
        times = []
        for line in packets.stdout.splitlines():
            try:
                times.append(float(line.strip().rstrip(",")))
            except ValueError:
                continue
        if not times:
            raise VideoUnreadable("no video frames found")
        return max(times)
    except subprocess.TimeoutExpired as exc:
        raise VideoUnreadable("the video took too long to read") from exc


def uploaded_video_duration(uploaded):
    """Duration of a Django UploadedFile, leaving the file ready to be saved."""
    temp_path = getattr(uploaded, "temporary_file_path", None)
    try:
        if callable(temp_path):
            return probe_duration(temp_path())
        suffix = os.path.splitext(getattr(uploaded, "name", "") or "")[1] or ".bin"
        with tempfile.NamedTemporaryFile(suffix=suffix) as handle:
            uploaded.seek(0)
            for chunk in uploaded.chunks():
                handle.write(chunk)
            handle.flush()
            return probe_duration(handle.name)
    finally:
        try:
            uploaded.seek(0)
        except Exception:
            pass


def check_video_length(uploaded, label="video", minimum=MIN_SECONDS, maximum=MAX_SECONDS):
    """Return an error message if the clip is outside the allowed length, else None."""
    try:
        duration = uploaded_video_duration(uploaded)
    except VideoUnreadable:
        return f"The {label} could not be read as a video. Please choose another file."
    if duration is None:
        logger.warning("ffprobe is not installed; the %s length could not be checked on the server.", label)
        return None
    if duration > maximum + TOLERANCE_SECONDS:
        return (
            f"The {label} is {round(duration)} seconds long. Videos must be between {minimum} and {maximum} seconds, "
            "so trim it before posting."
        )
    if duration < minimum - TOLERANCE_SECONDS:
        return f"The {label} is too short. Videos must be between {minimum} and {maximum} seconds."
    return None
