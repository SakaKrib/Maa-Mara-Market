import { useState } from "react";
import { CalendarDays, X } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import FullCalendar from "@fullcalendar/react";
import { formatDate } from "@fullcalendar/core";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import listPlugin from "@fullcalendar/list";
import interactionPlugin from "@fullcalendar/interaction";
import useCalendarEvents from "./CalendarHook";

const Calendar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isVendorCalendar = location.pathname.includes("/vendors-dashboard/");

  const { events: currentEvents, addEvent, deleteEvent } = useCalendarEvents();

  const [openDialog, setOpenDialog] = useState(false);
  const [newEventTitle, setNewEventTitle] = useState("");
  const [eventStart, setEventStart] = useState(null);
  const [eventEnd, setEventEnd] = useState(null);
  const [allDay, setAllDay] = useState(false);

  const isValidDate = (date) => date instanceof Date && !Number.isNaN(date.getTime());

  const formatInputDate = (date) => {
    if (!isValidDate(date)) return "";
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 16);
  };

  const handleDateClick = (selected) => {
    const startDate = selected.start || selected.date;
    const endDate = selected.end || startDate;

    if (!startDate) {
      console.error("No start date provided by FullCalendar", selected);
      return;
    }

    setEventStart(startDate);
    setEventEnd(endDate);
    setAllDay(Boolean(selected.allDay));
    setNewEventTitle("");
    setOpenDialog(true);
  };

  const resetDialog = () => {
    setNewEventTitle("");
    setEventStart(null);
    setEventEnd(null);
    setAllDay(false);
    setOpenDialog(false);
  };

  const handleAddEvent = async () => {
    if (
      !newEventTitle.trim() ||
      !isValidDate(eventStart) ||
      (!isValidDate(eventEnd) && !allDay)
    ) {
      alert("Please enter a title, start date, and end date (unless all-day event).");
      return;
    }

    const start = allDay
      ? eventStart.toISOString().split("T")[0]
      : eventStart.toISOString();

    const end = allDay
      ? (eventEnd || eventStart).toISOString().split("T")[0]
      : (eventEnd || eventStart).toISOString();

    try {
      await addEvent({
        title: newEventTitle.trim(),
        start,
        end,
        allDay,
      });
      resetDialog();
    } catch (err) {
      console.error(err);
      alert("Failed to add event. Please try again.");
    }
  };

  const handleEventClick = async (selected) => {
    if (window.confirm(`Are you sure you want to delete '${selected.event.title}'?`)) {
      try {
        await deleteEvent(selected.event.id);
      } catch (err) {
        console.error(err);
        alert("Failed to delete event. Please try again.");
      }
    }
  };

  const closePath = isVendorCalendar ? "/vendors-dashboard" : "/admin-dashboard";

  return (
    <section className="w-full space-y-6">
      <header className="flex items-start justify-between gap-4 rounded-2xl border border-[#e6e6e4] bg-white p-5 shadow-sm sm:p-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#2563eb]">
            <CalendarDays size={15} />
            Schedule
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#222]">Calendar</h1>
          <p className="mt-1 text-sm text-[#595959]">
            Plan, review and manage your marketplace events.
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate(closePath)}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#e6e6e4] bg-white text-[#595959] transition hover:border-[#2563eb] hover:bg-[#eff6ff] hover:text-[#2563eb]"
          aria-label="Close calendar"
        >
          <X size={18} />
        </button>
      </header>

      <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="rounded-2xl border border-[#e6e6e4] bg-white p-4 shadow-sm">
          <div className="rounded-xl bg-[#f8f8f6] px-4 py-3">
            <h2 className="text-sm font-bold text-[#222]">Events</h2>
            <p className="mt-1 text-xs text-[#777]">
              {currentEvents.length} event{currentEvents.length === 1 ? "" : "s"} scheduled
            </p>
          </div>

          <div className="mt-3 max-h-[52vh] space-y-2 overflow-y-auto pr-1">
            {currentEvents.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[#d7d7d3] bg-[#fcfcfa] p-4 text-sm text-[#595959]">
                No events yet. Select a date on the calendar to add one.
              </div>
            ) : (
              currentEvents.map((event) => (
                <div key={event.id} className="rounded-xl border border-[#eeeeeb] bg-white p-3">
                  <p className="font-semibold text-[#222]">{event.title}</p>
                  <p className="mt-1 text-xs leading-5 text-[#777]">
                    {formatDate(event.start, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                    {event.end && !event.allDay
                      ? ` - ${formatDate(event.end, {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}`
                      : ""}
                  </p>
                </div>
              ))
            )}
          </div>
        </aside>

        <section className="min-w-0 overflow-hidden rounded-2xl border border-[#e6e6e4] bg-white p-2 shadow-sm sm:p-4">
          <div className="overflow-x-auto">
            <div className="min-w-[680px]">
              <FullCalendar
                height="auto"
                aspectRatio={isVendorCalendar ? 1.35 : 1.5}
                plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
                headerToolbar={{
                  left: "prev,next today",
                  center: "title",
                  right: "dayGridMonth,timeGridWeek,timeGridDay,listMonth",
                }}
                initialView="dayGridMonth"
                editable
                selectable
                selectMirror
                dayMaxEvents
                select={handleDateClick}
                dateClick={handleDateClick}
                eventClick={handleEventClick}
                events={currentEvents}
                dayCellDidMount={(info) => {
                  info.el.style.borderColor = "#e6e6e4";
                  info.el.style.borderWidth = "1px";
                  info.el.style.borderStyle = "solid";
                }}
              />
            </div>
          </div>
        </section>
      </div>

      {openDialog && (
        <div
          className="fixed inset-0 z-[1400] flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="calendar-dialog-title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpenDialog(false);
          }}
        >
          <div className="w-full max-w-lg rounded-2xl border border-[#e6e6e4] bg-white p-5 shadow-2xl sm:p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#2563eb]">
                  Schedule
                </p>
                <h2 id="calendar-dialog-title" className="mt-1 text-xl font-bold text-[#222]">
                  Add New Event
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setOpenDialog(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[#e6e6e4] text-[#595959] hover:bg-[#f8f8f6]"
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-5 space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold text-[#222]">Event title</span>
                <input
                  autoFocus
                  type="text"
                  value={newEventTitle}
                  onChange={(e) => setNewEventTitle(e.target.value)}
                  className="w-full rounded-xl border border-[#d9d9d6] bg-white px-3 py-2.5 text-sm text-[#222] outline-none transition focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/15"
                  placeholder="e.g. Vendor market day"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold text-[#222]">Start date</span>
                <input
                  type="datetime-local"
                  value={formatInputDate(eventStart)}
                  onChange={(e) => setEventStart(new Date(e.target.value))}
                  className="w-full rounded-xl border border-[#d9d9d6] bg-white px-3 py-2.5 text-sm text-[#222] outline-none transition focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/15"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold text-[#222]">End date</span>
                <input
                  type="datetime-local"
                  value={formatInputDate(eventEnd)}
                  onChange={(e) => setEventEnd(new Date(e.target.value))}
                  className="w-full rounded-xl border border-[#d9d9e6] bg-white px-3 py-2.5 text-sm text-[#222] outline-none transition focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/15"
                />
              </label>

              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-[#e6e6e4] bg-[#f8f8f6] p-3">
                <input
                  type="checkbox"
                  checked={allDay}
                  onChange={(e) => setAllDay(e.target.checked)}
                  className="h-4 w-4 accent-[#2563eb]"
                />
                <span className="text-sm font-semibold text-[#222]">All Day Event</span>
              </label>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setOpenDialog(false)}
                className="rounded-xl border border-[#d9d9d6] bg-white px-4 py-2.5 text-sm font-semibold text-[#222] hover:bg-[#f8f8f6]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddEvent}
                className="rounded-xl bg-[#2563eb] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#1d4ed8]"
              >
                Add Event
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default Calendar;
