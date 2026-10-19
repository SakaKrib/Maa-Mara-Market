import React, { useEffect, useState } from "react";

const ERROR_WORDS =
  /(fail|error|unable|couldn'?t|could not|cannot|can'?t|invalid|denied|unauthori[sz]ed|incorrect|wrong|required|not found|try again|rejected|missing)/i;

export const resolveSnackbarSeverity = (severity, message) => {
  const value = String(severity || "").toLowerCase();
  if (value === "error" || value === "warning" || value === "danger" || value === "destructive") return "error";
  if (value === "success") return "success";
  const text = String(message || "");
  if (/✅/.test(text)) return "success";
  if (/[⚠❌]/.test(text)) return "error";
  return ERROR_WORDS.test(text) ? "error" : "success";
};

/**
 * Shared snackbar used across the whole site.
 * success: white background, green text. error: light red background, red text.
 */
const DEFAULT_AUTO_HIDE_MS = 5000;

const AppSnackbar = ({
  open,
  message,
  severity,
  onClose,
  autoHideDuration = DEFAULT_AUTO_HIDE_MS,
  children,
}) => {
  const [paused, setPaused] = useState(false);

  // A snackbar closed while hovered never gets its mouseleave; reset so the next one is not stuck paused.
  useEffect(() => {
    if (!open) setPaused(false);
  }, [open]);

  // Close by itself (default 5s) so a snackbar can never get stuck on screen.
  // The timer is paused while the pointer is over it and restarts when it leaves.
  useEffect(() => {
    if (!open || !onClose || !autoHideDuration || paused) return undefined;
    const timer = setTimeout(() => onClose(), autoHideDuration);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, message, autoHideDuration, paused]);

  if (!open) return null;
  const isError = resolveSnackbarSeverity(severity, message) === "error";
  const tone = isError
    ? "border-red-200 bg-red-50 text-red-700"
    : "border-gray-300 bg-card text-green-700";
  const dismiss = isError ? "text-red-500 hover:text-red-700" : "text-green-600 hover:text-green-800";
  return (
    <div
      role={isError ? "alert" : "status"}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      className={`fixed right-4 top-[8.1rem] z-[1400] flex w-fit max-w-[min(22rem,calc(100vw-2rem))] items-start gap-3 rounded-[20px] border px-4 py-3 text-sm font-semibold shadow-lg ${tone}`}
    >
      <div className="min-w-0 flex-initial break-words [text-wrap:balance]">{children ?? message}</div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className={`shrink-0 text-xs leading-5 ${dismiss}`}
          aria-label="Dismiss notification"
        >
          ×
        </button>
      )}
    </div>
  );
};


// App-level snackbar for messages that must outlive the component that raised
// them (e.g. a row that disappears, a modal that closes, or a route change).
const GLOBAL_EVENT = "app-snackbar:notify";

export const notifySnackbar = (message, severity) => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(GLOBAL_EVENT, { detail: { message, severity } }));
};

export const GlobalSnackbarHost = () => {
  const [state, setState] = useState({ open: false, message: "", severity: "success" });
  useEffect(() => {
    const handler = (event) =>
      setState({ open: true, message: event.detail?.message || "", severity: event.detail?.severity });
    window.addEventListener(GLOBAL_EVENT, handler);
    return () => window.removeEventListener(GLOBAL_EVENT, handler);
  }, []);
  return (
    <AppSnackbar
      open={state.open}
      message={state.message}
      severity={state.severity}
      onClose={() => setState((prev) => ({ ...prev, open: false }))}
      autoHideDuration={4000}
    />
  );
};

export default AppSnackbar;
