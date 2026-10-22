import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, ShieldCheck, X } from "lucide-react";
import { Button } from "./button";

/**
 * App-styled replacement for window.confirm (which is a native Android/iOS popup
 * inside the APK). Usage:
 *
 *   const [confirm, confirmNode] = useConfirmDialog();
 *   const ok = await confirm({ title, subtitle, rows: [["Amount", "KES 100"]], warnings: [], note, confirmLabel });
 *   ...render {confirmNode} once in the component.
 */
export function ConfirmDialog({ title, subtitle, rows = [], warnings = [], note, confirmLabel = "Continue", cancelLabel = "Cancel", onResult }) {
  const confirmRef = useRef(null);

  useEffect(() => {
    confirmRef.current?.focus();
    const onKey = (event) => {
      if (event.key === "Escape") onResult(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onResult]);

  return (
    <div
      className="fixed inset-0 z-[1700] flex items-end justify-center overflow-y-auto bg-black/55 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onResult(false);
      }}
    >
      <section
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        className="w-full max-w-lg rounded-t-3xl border border-border bg-card p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] text-card-foreground shadow-2xl sm:rounded-2xl sm:p-6"
      >
        <div className="mb-4 flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h3 id="confirm-dialog-title" className="text-lg font-bold">{title}</h3>
            {subtitle && <p className="mt-1 break-words text-sm text-muted-foreground">{subtitle}</p>}
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={() => onResult(false)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {rows.length > 0 && (
          <dl className="space-y-2 rounded-2xl border border-border bg-muted/40 p-4 text-sm">
            {rows.map(([label, value]) => (
              <div key={label} className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="min-w-0 break-words font-semibold sm:text-right">{value}</dd>
              </div>
            ))}
          </dl>
        )}

        {warnings.length > 0 && (
          <div className="mt-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
            <p className="flex items-center gap-2 font-semibold"><AlertTriangle className="h-4 w-4" />Check first</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {warnings.map((warning, index) => <li key={index} className="break-words">{warning}</li>)}
            </ul>
          </div>
        )}

        {note && <p className="mt-3 break-words text-sm leading-6 text-muted-foreground">{note}</p>}

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" className="rounded-[20px]" onClick={() => onResult(false)}>{cancelLabel}</Button>
          <Button type="button" ref={confirmRef} className="rounded-[20px]" onClick={() => onResult(true)}>{confirmLabel}</Button>
        </div>
      </section>
    </div>
  );
}

export function useConfirmDialog() {
  const [options, setOptions] = useState(null);
  const resolver = useRef(null);

  const finish = useCallback((result) => {
    resolver.current?.(result);
    resolver.current = null;
    setOptions(null);
  }, []);

  const confirm = useCallback(
    (next) =>
      new Promise((resolve) => {
        resolver.current?.(false);
        resolver.current = resolve;
        setOptions(next);
      }),
    [],
  );

  return [confirm, options ? <ConfirmDialog {...options} onResult={finish} /> : null];
}

export default ConfirmDialog;
