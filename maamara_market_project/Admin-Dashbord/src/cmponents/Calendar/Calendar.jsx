import { useState } from "react";
import FullCalendar from "@fullcalendar/react";
import { formatDate } from "@fullcalendar/core";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import listPlugin from "@fullcalendar/list";
import interactionPlugin from "@fullcalendar/interaction";
import {
  Box,
  List,
  ListItem,
  ListItemText,
  Typography,
  useTheme,
  useMediaQuery,
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  DialogActions,
  Button,
  FormControlLabel,
  Checkbox,
} from "@mui/material";
import Header from "../../Header/Header";
import { tokens } from "../../theme";
import useCalendarEvents from "./CalendarHook";

const Calendar = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  // Hook provides events + API functions
  const { events: currentEvents, addEvent, deleteEvent } = useCalendarEvents();

  // Modal state
  const [openDialog, setOpenDialog] = useState(false);
  const [newEventTitle, setNewEventTitle] = useState("");
  const [eventStart, setEventStart] = useState(null);
  const [eventEnd, setEventEnd] = useState(null);
  const [allDay, setAllDay] = useState(false);

  // --- Helper to check valid Date ---
  const isValidDate = (d) => d instanceof Date && !isNaN(d);

  // --- Handle date click or selection ---
  const handleDateClick = (selected) => {
    const startDate = selected.start || selected.date;
    const endDate = selected.end || startDate;

    if (!startDate) {
      console.error("No start date provided by FullCalendar", selected);
      return;
    }

    setEventStart(startDate);
    setEventEnd(endDate);
    setAllDay(selected.allDay || false);
    setNewEventTitle("");
    setOpenDialog(true);
  };

  // --- Add event via hook ---
  const handleAddEvent = async () => {
    if (!newEventTitle || !isValidDate(eventStart) || (!isValidDate(eventEnd) && !allDay)) {
      alert("Please enter a title, start date, and end date (unless all-day event)");
      return;
    }
  
    const start = allDay
      ? eventStart.toISOString().split("T")[0]
      : eventStart.toISOString();
  
    const end = allDay
      ? (eventEnd || eventStart).toISOString().split("T")[0]
      : (eventEnd || eventStart).toISOString();
  
    const newEvent = {
      title: newEventTitle,
      start,
      end,
      allDay,
    };
  
    try {
      await addEvent(newEvent); // sends to backend
  
      // Reset modal
      setNewEventTitle("");
      setEventStart(null);
      setEventEnd(null);
      setAllDay(false);
      setOpenDialog(false);
    } catch (err) {
      console.error(err);
      alert("Failed to add event. Please try again.");
    }
  };

  // --- Delete event via hook ---
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

  return (
    <Box className="mm-calendar-page" m="20px 0" padding="1em 1.5em">
      <Header title="Calendar" subtitle="Full Calendar For Interactive Events & Functions" />

      <Box display="flex" flexDirection={isMobile ? "column" : "row"} gap={2}>
        {/* Sidebar */}
        <Box
          className="mm-calendar-sidebar"
          flex={isMobile ? "1 1 auto" : "1 1 20%"}
          backgroundColor={colors.primary[600]}
          padding="15px"
          borderRadius="4px"
          mb={isMobile ? 2 : 0}
        >
          <Typography
            variant="h6"
            align="center"
            sx={{
              backgroundColor: colors.primary[500],
              padding: "0.5em",
              borderRadius: "4px",
              fontWeight: "bold",
              color: colors.blueAccent[100],
            }}
          >
            Events
          </Typography>
          <List sx={{ maxHeight: "40vh", overflowY: "auto" }}>
            {currentEvents.length === 0 ? (
              <ListItem className="mm-calendar-empty-event">
                <ListItemText
                  primary="No events yet"
                  secondary="Select a date on the calendar to add one."
                />
              </ListItem>
            ) : currentEvents.map((event) => (
              <ListItem
                key={event.id}
                sx={{
                  backgroundColor: colors.greenAccent[800],
                  margin: "10px 0",
                  borderRadius: "4px",
                  color: colors.gray[100],
                }}
              >
                <ListItemText
                  primary={event.title}
                  secondary={
                    <Typography variant="body2" color={colors.gray[100]}>
                      {formatDate(event.start, { year: "numeric", month: "short", day: "numeric" })}
                      {event.end && !event.allDay
                        ? ` - ${formatDate(event.end, { year: "numeric", month: "short", day: "numeric" })}`
                        : ""}
                    </Typography>
                  }
                />
              </ListItem>
            ))}
          </List>
        </Box>

        {/* Calendar */}
        <Box flex="1 1 100%" color={colors.gray[100]}>
          <FullCalendar
            height={isMobile ? "65vh" : "75vh"}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
            headerToolbar={{
              left: "prev,next today",
              center: "title",
              right: isMobile
                ? "dayGridMonth,listMonth"
                : "dayGridMonth,timeGridWeek,timeGridDay,listMonth",
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
              // 🎨 Apply theme color to day borders
              info.el.style.borderColor = colors.gray[500]; 
              info.el.style.borderWidth = "1px";
              info.el.style.borderStyle = "solid";
            }}
          />
        </Box>
      </Box>

      {/* Add Event Modal */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} fullWidth>
        <DialogTitle>Add New Event</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Event Title"
            type="text"
            fullWidth
            variant="outlined"
            value={newEventTitle}
            onChange={(e) => setNewEventTitle(e.target.value)}
          />
          <TextField
            margin="dense"
            label="Start Date"
            type="datetime-local"
            fullWidth
            variant="outlined"
            value={eventStart ? new Date(eventStart).toISOString().slice(0,16) : ""}
            onChange={(e) => setEventStart(new Date(e.target.value))}
            sx={{ mt: 2 }}
          />
          <TextField
            margin="dense"
            label="End Date"
            type="datetime-local"
            fullWidth
            variant="outlined"
            value={eventEnd ? new Date(eventEnd).toISOString().slice(0,16) : ""}
            onChange={(e) => setEventEnd(new Date(e.target.value))}
            sx={{ mt: 2 }}
          />
          <FormControlLabel
            control={<Checkbox checked={allDay} onChange={(e) => setAllDay(e.target.checked)} />}
            label="All Day Event"
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)} color="error">
            Cancel
          </Button>
          <Button onClick={handleAddEvent} variant="contained" color="primary">
            Add Event
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Calendar;