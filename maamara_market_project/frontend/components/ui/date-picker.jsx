import { useEffect, useMemo, useState } from "react";
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";

// Same look as the date-of-birth picker in the account menu: month and year
// selectors, previous/next arrows and a day grid. The value is "YYYY-MM-DD".

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const toLocalDate = (value) => {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value));
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12);
  return Number.isNaN(date.getTime()) ? null : date;
};

const toIsoDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export default function DatePicker({
  value = "",
  onChange,
  name,
  min,
  max,
  fromYear,
  toYear,
  placeholder = "Select date",
  label = "Choose date",
  disabled = false,
  placement = "bottom",
  className = "",
  clearable = false,
}) {
  const today = new Date();
  const currentYear = today.getFullYear();
  const isoValue = value ? String(value).slice(0, 10) : "";
  const selectedDate = toLocalDate(isoValue);
  const minDate = toLocalDate(min);
  const maxDate = toLocalDate(max);

  // The year list always contains the chosen date and any min/max bound.
  const firstYear = Math.min(
    ...[fromYear ?? currentYear - 10, minDate?.getFullYear(), selectedDate?.getFullYear()].filter(Number.isFinite)
  );
  const lastYear = Math.max(
    ...[toYear ?? currentYear + 20, maxDate?.getFullYear(), selectedDate?.getFullYear()].filter(Number.isFinite)
  );

  const [open, setOpen] = useState(false);
  const clampMonth = (date) => {
    let next = new Date(date.getFullYear(), date.getMonth(), 1, 12);
    if (minDate && next < new Date(minDate.getFullYear(), minDate.getMonth(), 1, 12)) {
      next = new Date(minDate.getFullYear(), minDate.getMonth(), 1, 12);
    }
    if (maxDate && next > new Date(maxDate.getFullYear(), maxDate.getMonth(), 1, 12)) {
      next = new Date(maxDate.getFullYear(), maxDate.getMonth(), 1, 12);
    }
    return next;
  };
  const [visibleMonth, setVisibleMonth] = useState(() => clampMonth(selectedDate || today));

  useEffect(() => {
    if (!open && selectedDate) setVisibleMonth(clampMonth(selectedDate));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isoValue, open]);

  const yearOptions = useMemo(
    () => Array.from({ length: lastYear - firstYear + 1 }, (_, index) => firstYear + index),
    [firstYear, lastYear]
  );

  const year = visibleMonth.getFullYear();
  const month = visibleMonth.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [...Array(firstWeekday).fill(null), ...Array.from({ length: daysInMonth }, (_, index) => index + 1)];
  while (cells.length % 7 !== 0) cells.push(null);
  const todayIso = toIsoDate(today);
  const previousMonth = new Date(year, month - 1, 1, 12);
  const nextMonth = new Date(year, month + 1, 1, 12);
  const monthStartLimit = minDate ? new Date(minDate.getFullYear(), minDate.getMonth(), 1, 12) : new Date(firstYear, 0, 1, 12);
  const monthEndLimit = maxDate ? new Date(maxDate.getFullYear(), maxDate.getMonth(), 1, 12) : new Date(lastYear, 11, 1, 12);
  const canGoPrevious = previousMonth >= monthStartLimit;
  const canGoNext = nextMonth <= monthEndLimit;

  const isBlocked = (iso) => (min && iso < min) || (max && iso > max);
  const monthBlocked = (candidateYear, candidateMonth) =>
    new Date(candidateYear, candidateMonth, 1, 12) < monthStartLimit ||
    new Date(candidateYear, candidateMonth, 1, 12) > monthEndLimit;

  const selectDate = (day) => {
    const iso = toIsoDate(new Date(year, month, day, 12));
    if (isBlocked(iso)) return;
    onChange?.({ target: { name, value: iso } });
    setOpen(false);
  };

  const displayValue = selectedDate
    ? selectedDate.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" })
    : "";

  return (
    <div className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (!open) setVisibleMonth(clampMonth(selectedDate || today));
          setOpen((current) => !current);
        }}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={`flex h-11 w-full items-center justify-between gap-3 rounded-[18px] border border-border bg-background px-4 text-left text-sm font-medium normal-case tracking-normal text-foreground outline-none transition hover:bg-muted focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
      >
        <span className={displayValue ? "truncate" : "truncate text-muted-foreground"}>
          {displayValue || placeholder}
        </span>
        <CalendarDays size={17} className="shrink-0 text-muted-foreground" aria-hidden="true" />
      </button>

      {open && !disabled && (
        <div
          role="dialog"
          aria-label={label}
          className={`absolute left-0 z-[85] w-[min(21rem,calc(100vw-3rem))] rounded-2xl border border-border bg-background p-3 text-foreground shadow-2xl ${
            placement === "top" ? "bottom-[calc(100%+8px)]" : "top-[calc(100%+8px)]"
          }`}
        >
          <div className="mb-3 grid grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)_auto] items-center gap-1.5">
            <button
              type="button"
              aria-label="Previous month"
              disabled={!canGoPrevious}
              onClick={() => setVisibleMonth(previousMonth)}
              className="grid h-9 w-9 place-items-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-30"
            >
              <ChevronLeft size={18} />
            </button>
            <label className="relative min-w-0">
              <span className="sr-only">Month</span>
              <select
                value={month}
                onChange={(event) => setVisibleMonth(new Date(year, Number(event.target.value), 1, 12))}
                className="h-9 w-full appearance-none rounded-lg border border-border bg-background pl-2 pr-6 text-xs font-semibold text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
              >
                {MONTHS.map((monthName, index) => (
                  <option key={monthName} value={index} disabled={monthBlocked(year, index)}>
                    {monthName}
                  </option>
                ))}
              </select>
              <ChevronDown size={13} className="pointer-events-none absolute right-1.5 top-3 text-muted-foreground" />
            </label>
            <label className="relative min-w-0">
              <span className="sr-only">Year</span>
              <select
                value={year}
                onChange={(event) => {
                  const nextYear = Number(event.target.value);
                  setVisibleMonth(clampMonth(new Date(nextYear, month, 1, 12)));
                }}
                className="h-9 w-full appearance-none rounded-lg border border-border bg-background pl-2 pr-6 text-xs font-semibold text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
              >
                {yearOptions.map((optionYear) => (
                  <option key={optionYear} value={optionYear}>
                    {optionYear}
                  </option>
                ))}
              </select>
              <ChevronDown size={13} className="pointer-events-none absolute right-1.5 top-3 text-muted-foreground" />
            </label>
            <button
              type="button"
              aria-label="Next month"
              disabled={!canGoNext}
              onClick={() => setVisibleMonth(nextMonth)}
              className="grid h-9 w-9 place-items-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-30"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center">
            {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
              <span key={day} className="py-1.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                {day}
              </span>
            ))}
            {cells.map((day, index) => {
              if (!day) return <span key={`blank-${index}`} className="h-9" />;
              const iso = toIsoDate(new Date(year, month, day, 12));
              const isSelected = iso === isoValue;
              const isToday = iso === todayIso;
              return (
                <button
                  key={day}
                  type="button"
                  disabled={isBlocked(iso)}
                  onClick={() => selectDate(day)}
                  aria-pressed={isSelected}
                  className={`h-9 rounded-lg text-xs font-medium transition focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-25 ${isSelected ? "bg-primary text-primary-foreground shadow-sm" : isToday ? "border border-primary/40 text-primary hover:bg-muted" : "text-foreground hover:bg-muted"}`}
                >
                  {day}
                </button>
              );
            })}
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
            {clearable && isoValue ? (
              <button
                type="button"
                onClick={() => {
                  onChange?.({ target: { name, value: "" } });
                  setOpen(false);
                }}
                className="rounded-lg px-3 py-1.5 text-xs font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground"
              >
                Clear
              </button>
            ) : (
              <span className="text-[11px] text-muted-foreground">Choose month, year, then day</span>
            )}
            <button type="button" onClick={() => setOpen(false)} className="rounded-lg px-3 py-1.5 text-xs font-semibold text-foreground transition hover:bg-muted">
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
