import React from "react";
import { Check } from "lucide-react";

export const STAGE_LABELS = {
  PAID: "Payment confirmed",
  PROCESSING: "Processing",
  PACKING: "Packing",
  READY_TO_SHIP: "Ready for dispatch",
  DISPATCH_INSPECTED: "Dispatch inspection passed",
  SHIPPED: "Handed to carrier",
  IN_TRANSIT: "In transit",
  OUT_FOR_DELIVERY: "Out for delivery",
  AWAITING_CONFIRMATION: "Delivered, awaiting confirmation",
  COMPLETED: "Completed",
};

export const VENDOR_STAGES = ["PAID", "PROCESSING", "PACKING", "READY_TO_SHIP"];
export const FULL_STAGES = [
  "PAID", "PROCESSING", "PACKING", "READY_TO_SHIP", "DISPATCH_INSPECTED",
  "SHIPPED", "IN_TRANSIT", "OUT_FOR_DELIVERY", "AWAITING_CONFIRMATION", "COMPLETED",
];

const ORDER = FULL_STAGES;
const normalize = (value) => String(value || "").trim().toUpperCase();
const when = (value) =>
  value ? new Date(value).toLocaleString("en-KE", { dateStyle: "medium", timeStyle: "short" }) : "";

/**
 * Vertical checklist of fulfilment stages. A ticked stage is one that really
 * happened (taken from the status history), with its time and note beside it.
 * Everything is derived from the record, so it updates the moment the record does.
 */
export default function FulfillmentStepper({ status, events = [], stages = FULL_STAGES, showNotes = true }) {
  const current = normalize(status);
  const currentIndex = ORDER.indexOf(current);
  const reached = (stage) => {
    if (stage === "PAID") return currentIndex >= 0 || current === "DELIVERED";
    const index = ORDER.indexOf(stage);
    return index !== -1 && currentIndex >= index;
  };
  // The first stage that is not yet reached is "next"; the last reached is "current".
  const lastReached = [...stages].reverse().find(reached);
  const nextStage = stages.find((stage) => !reached(stage));

  const eventFor = (stage) =>
    [...events].reverse().find((event) => normalize(event.to_status) === stage);

  return (
    <ol className="space-y-0" aria-label="Order progress">
      {stages.map((stage, index) => {
        const done = reached(stage);
        const isCurrent = stage === lastReached && stage !== stages[stages.length - 1];
        const isNext = stage === nextStage;
        const event = eventFor(stage);
        const note = showNotes && event?.note ? event.note : "";
        const last = index === stages.length - 1;
        return (
          <li key={stage} className="relative flex gap-3 pb-4 last:pb-0" aria-current={isCurrent ? "step" : undefined}>
            {!last && (
              <span aria-hidden="true" className={`absolute left-[11px] top-6 h-[calc(100%-1.25rem)] w-0.5 ${done && reached(stages[index + 1]) ? "bg-emerald-400" : "bg-slate-200"}`} />
            )}
            <span
              className={`relative z-[1] mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-white ${
                done ? "border-emerald-500 bg-emerald-500" : isNext ? "border-blue-500 bg-white" : "border-slate-300 bg-white"
              }`}
            >
              {done ? <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden="true" /> : isNext ? <span className="h-2 w-2 animate-pulse rounded-full bg-blue-500" /> : null}
            </span>
            <div className="min-w-0 flex-1">
              <p className={`text-sm leading-6 ${done ? "font-semibold text-slate-900" : isNext ? "font-semibold text-blue-700" : "text-slate-400"}`}>
                {STAGE_LABELS[stage] || stage}
                {done && <span className="sr-only"> (done)</span>}
                {isNext && <span className="ml-2 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-blue-700">Next</span>}
              </p>
              {done && event?.created_at && <p className="text-xs text-slate-500">{when(event.created_at)}</p>}
              {note && <p className="mt-0.5 break-words text-xs text-slate-600">“{note}”</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
