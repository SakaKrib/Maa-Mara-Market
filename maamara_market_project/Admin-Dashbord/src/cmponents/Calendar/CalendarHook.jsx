import { useState, useEffect } from "react";
import api from "../../Services/Api"; // use your API instance

const useCalendarEvents = () => {
  const [events, setEvents] = useState([]);
  const API_URL = "/api/calendar-events/";

  // hooks/useCalendarEvents.js
    const fetchEvents = async () => {
        try {
        const response = await api.get(API_URL, { withCredentials: true });
        const formattedEvents = response.data.results.map((event) => ({
            id: event.id,
            title: event.title,
            start: event.start,
            end: event.end,
            allDay: event.all_day, // rename to FullCalendar's expected field
        }));
        setEvents(formattedEvents);
        } catch (err) {
        console.error(err);
        }
    };

  const addEvent = async (newEvent) => {
    try {
      const response = await api.post(API_URL, newEvent, { withCredentials: true });
      const e = response.data;
      setEvents((prev) => [
        ...prev,
        {
          id: e.id,
          title: e.title,
          start: e.start,
          end: e.end,
          allDay: e.all_day,
        },
      ]);
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  const deleteEvent = async (eventId) => {
    try {
      await api.delete(`${API_URL}${eventId}/`, { withCredentials: true });
      setEvents((prev) => prev.filter((e) => e.id !== eventId));
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  return { events, addEvent, deleteEvent };
};

export default useCalendarEvents;