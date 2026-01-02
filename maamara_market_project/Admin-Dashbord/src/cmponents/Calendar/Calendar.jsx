import { useState, useEffect } from "react";
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
} from "@mui/material";
import Header from "../../Header/Header";
import { tokens } from "../../theme";

const Calendar = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const [currentEvents, setCurrentEvents] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [newEventTitle, setNewEventTitle] = useState("");
  const [selectedInfo, setSelectedInfo] = useState(null);

  // 🔹 Load events from Local Storage when component mounts
  useEffect(() => {
    const storedEvents = localStorage.getItem("calendarEvents");
    if (storedEvents) {
      setCurrentEvents(JSON.parse(storedEvents));
    }
  }, []);

  // 🔹 Save events to Local Storage whenever they change
  useEffect(() => {
    localStorage.setItem("calendarEvents", JSON.stringify(currentEvents));
  }, [currentEvents]);

  // Open modal when date is selected
  const handleDateClick = (selected) => {
    setSelectedInfo(selected);
    setOpenDialog(true);
  };

  // Add event to calendar + state
  const handleAddEvent = () => {
    if (newEventTitle && selectedInfo) {
      const calendarApi = selectedInfo.view.calendar;
      calendarApi.unselect();

      const newEvent = {
        id: `${selectedInfo.startStr}-${newEventTitle}`,
        title: newEventTitle,
        start: selectedInfo.startStr,
        end: selectedInfo.endStr,
        allDay: selectedInfo.allDay,
      };

      calendarApi.addEvent(newEvent);
      setCurrentEvents((prev) => [...prev, newEvent]);

      setNewEventTitle("");
      setOpenDialog(false);
    }
  };

  // Handle deleting an event
  const handleEventClick = (selected) => {
    if (window.confirm(`Are you sure you want to delete '${selected.event.title}'?`)) {
      selected.event.remove();
      setCurrentEvents((prev) =>
        prev.filter((event) => event.id !== selected.event.id)
      );
    }
  };

  return (
    <Box
      m="20px 0"
      padding="1em 1.5em"
      sx={{
        width: {
          xs: "calc(100% - 80px)",
          sm: "calc(100% - 80px)",
          md: "calc(100% - 80px)",
        },
      }}
    >
      <Header
        title="Calendar"
        subtitle="Full Calendar For Interactive Events & Functions"
      />

      <Box display="flex" flexDirection={isMobile ? "column" : "row"} gap={2}>
        {/* Sidebar */}
        <Box
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
            {currentEvents.map((event) => (
              <ListItem
                key={event.id}
                sx={{
                  backgroundColor: colors.greenAccent[500],
                  margin: "10px 0",
                  borderRadius: "4px",
                  color: colors.gray[100],
                }}
              >
                <ListItemText
                  primary={event.title}
                  secondary={
                    <Typography variant="body2" color={colors.gray[100]}>
                      {formatDate(event.start, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
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
            editable={true}
            selectable={true}
            selectMirror={true}
            dayMaxEvents={true}
            select={handleDateClick}
            dateClick={handleDateClick} 
            eventClick={handleEventClick}
            events={currentEvents}
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
            color={colors.gray[100]}
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
