import React from "react"
import { useToast } from "./toast";
import { resolveSnackbarSeverity } from "./app-snackbar";
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastTitle,
  ToastViewport,
} from "./toast";

export function Toaster() {
  const toastContext = useToast();
  const { toasts = [] } = toastContext;

  return (
    <>
      <div className="fixed right-4 top-[8.1rem] z-[1400] flex max-w-[min(24rem,calc(100vw-2rem))] flex-col items-end space-y-3">
        {toasts.map(({ id, title, description, action, variant, ...props }) => {
          const severity = resolveSnackbarSeverity(
            variant === "destructive" || variant === "warning" ? "error" : variant === "success" ? "success" : "",
            `${title || ""} ${description || ""}`
          );
          const isError = severity === "error";
          const tone = isError
            ? "border-red-200 bg-red-50 text-red-700 dark:bg-red-50 dark:text-red-700"
            : "border-gray-300 bg-card text-green-700 dark:bg-card dark:text-green-700";
          return (
            <Toast key={id} {...props} className={`relative !w-max max-w-full rounded-[20px] border px-4 py-3 text-sm font-semibold shadow-lg ${tone}`}>
              <div className="min-w-0 pr-6">
                {title && <ToastTitle className="text-sm font-semibold text-inherit">{title}</ToastTitle>}
                {description && <ToastDescription className="mt-1 text-sm font-normal text-inherit">{description}</ToastDescription>}
                {action && <div className="mt-2">{action}</div>}
              </div>
              <ToastClose className={`absolute right-3 top-3 text-xs ${isError ? "text-red-500 hover:text-red-700" : "text-green-600 hover:text-green-800"}`} />
            </Toast>
          );
        })}
      </div>

      {/* This will define the position for Toasts to be rendered */}
    </>
  );
}
