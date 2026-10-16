import React, { useEffect } from "react";

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
const AppSnackbar = ({ open, message, severity, onClose, autoHideDuration, children }) => {
  useEffect(() => {
    if (!open || !onClose || !autoHideDuration) return undefined;
    const timer = setTimeout(() => onClose(), autoHideDuration);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, message, autoHideDuration]);

  if (!open) return null;
  const isError = resolveSnackbarSeverity(severity, message) === "error";
  const tone = isError
    ? "border-red-200 bg-red-50 text-red-700"
    : "border-gray-300 bg-card text-green-700";
  const dismiss = isError ? "text-red-500 hover:text-red-700" : "text-green-600 hover:text-green-800";
  return (
    <div
      role={isError ? "alert" : "status"}
      className={`fixed right-4 top-20 z-[1400] max-w-sm rounded-[20px] border px-4 py-3 text-sm font-semibold shadow-lg ${tone}`}
    >
      {children ?? message}
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className={`ml-3 text-xs ${dismiss}`}
          aria-label="Dismiss notification"
        >
          ×
        </button>
      )}
    </div>
  );
};

export default AppSnackbar;
