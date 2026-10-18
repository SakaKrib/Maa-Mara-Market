import { useEffect, useMemo, useState } from "react";
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const FIRST_YEAR = 1900;

const toLocalDate = (value) => {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
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

export default function DateOfBirthPicker({ value = "", onChange, disabled = false }) {
  const today = new Date();
  const currentYear = today.getFullYear();
  const selectedDate = toLocalDate(value);
  const [open, setOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const initial = selectedDate || today;
    return new Date(initial.getFullYear(), initial.getMonth(), 1, 12);
  });

  useEffect(() => {
    if (!open) {
      const selected = toLocalDate(value);
      if (selected) setVisibleMonth(new Date(selected.getFullYear(), selected.getMonth(), 1, 12));
    }
  }, [value, open]);

  const yearOptions = useMemo(
    () => Array.from({ length: Math.max(1, currentYear - FIRST_YEAR + 1) }, (_, index) => currentYear - index),
    [currentYear]
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
  const canGoPrevious = previousMonth.getFullYear() >= FIRST_YEAR;
  const canGoNext = nextMonth <= new Date(currentYear, today.getMonth(), 1, 12);

  const changeMonth = (nextMonthIndex) => {
    setVisibleMonth(new Date(year, nextMonthIndex, 1, 12));
  };

  const selectDate = (day) => {
    const date = new Date(year, month, day, 12);
    const iso = toIsoDate(date);
    if (iso > todayIso) return;
    onChange?.({ target: { name: "date_of_birth", value: iso } });
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
          if (!open) {
            const selected = toLocalDate(value) || new Date();
            setVisibleMonth(new Date(selected.getFullYear(), selected.getMonth(), 1, 12));
          }
          setOpen((current) => !current);
        }}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="flex h-11 w-full items-center justify-between gap-3 rounded-[18px] border border-border bg-background px-4 text-left text-sm font-medium normal-case tracking-normal text-foreground outline-none transition hover:bg-muted focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span className={displayValue ? "truncate" : "truncate text-muted-foreground"}>
          {displayValue || "Select date of birth"}
        </span>
        <CalendarDays size={17} className="shrink-0 text-muted-foreground" aria-hidden="true" />
      </button>

      {open && !disabled && (
        <div
          role="dialog"
          aria-label="Choose date of birth"
          className="absolute left-0 top-[calc(100%+8px)] z-[85] w-[min(21rem,calc(100vw-3rem))] rounded-2xl border border-border bg-background p-3 text-foreground shadow-2xl"
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
                onChange={(event) => changeMonth(Number(event.target.value))}
                className="h-9 w-full appearance-none rounded-lg border border-border bg-background pl-2 pr-6 text-xs font-semibold text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
              >
                {MONTHS.map((name, index) => (
                  <option key={name} value={index} disabled={year === currentYear && index > today.getMonth()}>
                    {name}
                  </option>
                ))}
              </select>
              <ChevronDown size={13} className="pointer-events-none absolute right-1.5 top-3 text-muted-foreground" />
            </label>
            <label className="relative min-w-0">
              <span className="sr-only">Year</span>
              <select
                value={year}
                onChange={(event) => setVisibleMonth(new Date(Number(event.target.value), month, 1, 12))}
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
              const isSelected = iso === value;
              const isToday = iso === todayIso;
              const isFuture = iso > todayIso;
              return (
                <button
                  key={day}
                  type="button"
                  disabled={isFuture}
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
            <span className="text-[11px] text-muted-foreground">Choose month, year, then day</span>
            <button type="button" onClick={() => setOpen(false)} className="rounded-lg px-3 py-1.5 text-xs font-semibold text-foreground transition hover:bg-muted">
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
