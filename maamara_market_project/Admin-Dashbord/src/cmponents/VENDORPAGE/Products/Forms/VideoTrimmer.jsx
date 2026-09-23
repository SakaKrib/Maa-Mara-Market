import React, { useEffect, useMemo, useRef, useState } from "react";

const MIN_DURATION = 3;
const MAX_DURATION = 15;

const formatTime = (seconds) => {
  if (!Number.isFinite(seconds)) return "0:00";
  const whole = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(whole / 60);
  const remainder = whole % 60;
  return `${minutes}:${String(remainder).padStart(2, "0")}`;
};

const getSupportedRecorderMimeType = () => {
  if (typeof MediaRecorder === "undefined") return "";
  const candidates = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
  ];
  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) || "";
};

const VideoTrimmer = ({ file, duration, onApply, onCancel }) => {
  const videoRef = useRef(null);
  const objectUrlRef = useRef(null);
  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const [start, setStart] = useState(0);
  const [end, setEnd] = useState(Math.min(duration, MAX_DURATION));
  const [processing, setProcessing] = useState(false);
  const [progressMessage, setProgressMessage] = useState("");
  const [error, setError] = useState("");

  const effectiveDuration = Number.isFinite(duration) ? duration : 0;
  const maxStart = Math.max(0, effectiveDuration - MIN_DURATION);
  const maxEnd = Math.min(effectiveDuration, MAX_DURATION);
  const selectedDuration = Math.max(0, end - start);

  const previewUrl = useMemo(() => {
    if (!file) return "";
    const url = URL.createObjectURL(file);
    objectUrlRef.current = url;
    return url;
  }, [file]);

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
      if (recorderRef.current?.state === "recording") recorderRef.current.stop();
      streamRef.current?.getTracks?.().forEach((track) => track.stop());
    };
  }, []);

  useEffect(() => {
    const minimumEnd = Math.min(
      maxEnd,
      Math.max(MIN_DURATION, start + MIN_DURATION)
    );
    setEnd((current) => Math.min(Math.max(current, minimumEnd), maxEnd));
  }, [maxEnd, start]);

  const trimVideo = async () => {
    if (!file || !videoRef.current) return;

    if (selectedDuration < MIN_DURATION || selectedDuration > MAX_DURATION) {
      setError("Choose a clip between 3 and 15 seconds.");
      return;
    }

    if (typeof MediaRecorder === "undefined") {
      setError("Video trimming is not supported by this browser or app.");
      return;
    }

    const captureStream =
      videoRef.current.captureStream?.() ||
      videoRef.current.mozCaptureStream?.();

    if (!captureStream) {
      setError("This browser or app cannot trim video locally.");
      return;
    }

    const mimeType = getSupportedRecorderMimeType();
    if (!mimeType) {
      setError("This browser or app does not provide a compatible video recorder.");
      return;
    }

    setProcessing(true);
    setError("");
    setProgressMessage("Preparing your trimmed video…");

    const chunks = [];
    const recorder = new MediaRecorder(captureStream, {
      mimeType,
      videoBitsPerSecond: 4_000_000,
    });

    recorderRef.current = recorder;
    streamRef.current = captureStream;

    try {
      const trimmedFile = await new Promise((resolve, reject) => {
        let started = false;
        let settled = false;
        let stopTimer = null;

        const cleanupListeners = () => {
          videoRef.current?.removeEventListener("timeupdate", handleTimeUpdate);
        };

        const fail = (reason) => {
          if (settled) return;
          settled = true;
          if (stopTimer) window.clearTimeout(stopTimer);
          cleanupListeners();
          try {
            if (recorder.state !== "inactive") recorder.stop();
          } catch {}
          reject(reason instanceof Error ? reason : new Error(String(reason)));
        };

        const handleTimeUpdate = () => {
          if (started && videoRef.current.currentTime >= end) {
            videoRef.current.pause();
            if (recorder.state !== "inactive") recorder.stop();
          }
        };

        recorder.ondataavailable = (event) => {
          if (event.data?.size) chunks.push(event.data);
        };

        recorder.onerror = () =>
          fail(new Error("The browser could not record the trimmed video."));

        recorder.onstop = () => {
          if (settled) return;
          settled = true;
          if (stopTimer) window.clearTimeout(stopTimer);
          cleanupListeners();

          const blob = new Blob(chunks, { type: mimeType });
          if (!blob.size) {
            reject(new Error("The trimmed video was empty."));
            return;
          }

          const baseName = file.name.replace(/.[^/.]+$/, "") || "product-video";
          resolve(
            new File([blob], `${baseName}-trimmed.webm`, {
              type: "video/webm",
              lastModified: Date.now(),
            })
          );
        };

        const startRecording = async () => {
          if (started || settled) return;

          try {
            videoRef.current.currentTime = start;
            await videoRef.current.play();

            videoRef.current.addEventListener("timeupdate", handleTimeUpdate);
            recorder.start(250);
            started = true;
            setProgressMessage(`Recording ${formatTime(selectedDuration)} clip…`);

            stopTimer = window.setTimeout(() => {
              if (recorder.state !== "inactive") recorder.stop();
            }, Math.max(250, selectedDuration * 1000 + 250));
          } catch (err) {
            fail(err);
          }
        };

        if (videoRef.current.readyState >= 1) {
          startRecording();
        } else {
          videoRef.current.addEventListener("loadedmetadata", startRecording, {
            once: true,
          });
        }
      });

      captureStream.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      recorderRef.current = null;
      onApply(trimmedFile);
    } catch (err) {
      captureStream.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      recorderRef.current = null;
      setError(err?.message || "The video could not be trimmed.");
    } finally {
      setProcessing(false);
      setProgressMessage("");
    }
  };

  return (
    <div className="rounded-2xl border border-gray-300 bg-[#f8f8f6] p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-gray-900">Trim product video</p>
          <p className="mt-1 text-xs leading-5 text-gray-500">
            Choose any section from 3 to 15 seconds. Trimming happens on this device before the video enters the existing upload/draft flow.
          </p>
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-gray-700">
          {formatTime(selectedDuration)}
        </span>
      </div>

      <video
        ref={videoRef}
        src={previewUrl}
        controls
        preload="metadata"
        className="mt-4 max-h-[360px] w-full rounded-xl bg-black"
      />

      <div className="mt-4 space-y-4">
        <div>
          <div className="mb-1 flex justify-between text-xs font-medium text-gray-600">
            <span>Start: {formatTime(start)}</span>
            <span>End: {formatTime(end)}</span>
          </div>
          <input
            type="range"
            min="0"
            max={maxStart}
            step="0.1"
            value={Math.min(start, maxStart)}
            onChange={(event) => {
              const nextStart = Number(event.target.value);
              setStart(Math.min(nextStart, Math.max(0, end - MIN_DURATION)));
            }}
            disabled={processing || effectiveDuration < MIN_DURATION}
            className="w-full"
            aria-label="Video start time"
          />
          <input
            type="range"
            min={Math.min(MIN_DURATION, effectiveDuration)}
            max={maxEnd}
            step="0.1"
            value={Math.min(Math.max(end, MIN_DURATION), maxEnd)}
            onChange={(event) => {
              const nextEnd = Number(event.target.value);
              setEnd(Math.max(nextEnd, start + MIN_DURATION));
            }}
            disabled={processing || effectiveDuration < MIN_DURATION}
            className="w-full"
            aria-label="Video end time"
          />
        </div>

        {effectiveDuration < MIN_DURATION && (
          <p className="text-xs font-semibold text-red-600">
            This video is shorter than the required 3 seconds and cannot be trimmed to a valid product video.
          </p>
        )}

        {effectiveDuration > MAX_DURATION && (
          <p className="text-xs font-medium text-amber-700">
            This video is {formatTime(effectiveDuration)} long. Trim it to 15 seconds or less before continuing.
          </p>
        )}

        {error && <p className="text-xs font-semibold text-red-600">{error}</p>}
        {progressMessage && (
          <p className="text-xs font-medium text-gray-600">{progressMessage}</p>
        )}

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={trimVideo}
            disabled={
              processing ||
              effectiveDuration < MIN_DURATION ||
              selectedDuration < MIN_DURATION ||
              selectedDuration > MAX_DURATION
            }
            className="rounded-full bg-gray-900 px-4 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {processing ? "Trimming…" : "Apply trim"}
          </button>

          {effectiveDuration >= MIN_DURATION && effectiveDuration <= MAX_DURATION && (
            <button
              type="button"
              onClick={() => onApply(file)}
              disabled={processing}
              className="rounded-full border border-gray-300 bg-white px-4 py-2 text-xs font-semibold text-gray-800 disabled:opacity-50"
            >
              Use original
            </button>
          )}

          <button
            type="button"
            onClick={onCancel}
            disabled={processing}
            className="rounded-full border border-gray-300 bg-white px-4 py-2 text-xs font-semibold text-gray-800 disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default VideoTrimmer;
