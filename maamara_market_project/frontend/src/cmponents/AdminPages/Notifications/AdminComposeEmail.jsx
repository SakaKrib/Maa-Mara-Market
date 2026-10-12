import { useEffect, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  TextField,
  Button,
  IconButton,
  Typography,
  useTheme,
  List,
  ListItem
} from "@mui/material";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import CloseIcon from "@mui/icons-material/Close";
import { tokens } from "../../../theme";
import { useSendEmail } from "../../Hooks/Emails/EmailSending";
import api from "../../../Services/Api";

const ComposeEmail = ({ open, onClose, user }) => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  const { sendEmail, loading } = useSendEmail();

  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(null);

  const [form, setForm] = useState({
    to: "",
    subject: "",
    message: ""
  });

  const [attachments, setAttachments] = useState([]);
  const [snackbar, setSnackbar] = useState({ open: false, message: "" });
  const showSnackbar = (message) => setSnackbar({ open: true, message });

  // 👤 FETCH USERS
  useEffect(() => {
    if (!open) return;

    const fetchUsers = async () => {
      try {
        const res = await api.get("api/email-users/");
        setUsers(res.data);
      } catch (err) {
        console.error("Failed to fetch users", err);
      }
    };

    fetchUsers();
  }, [open]);

  // ✅ AUTO POPULATE USER WHEN DIALOG OPENS
  useEffect(() => {
    if (open && user?.email) {
      setForm((prev) => ({
        ...prev,
        to: user.email
      }));
    }
  }, [open, user]);

  // 📎 FILE HANDLING
  const handleFileChange = (e) => {
    setAttachments([...attachments, ...e.target.files]);
  };

  const removeFile = (index) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  // 👤 SELECT USER
  const selectUser = (u) => {
    setSelectedUserId(u.id);
    setForm((prev) => ({
      ...prev,
      to: u.email
    }));
  };

  // 📤 SEND EMAIL
  const handleSend = async () => {
    const formData = new FormData();

    formData.append("to", form.to);
    formData.append("subject", form.subject);
    formData.append("message", form.message);

    attachments.forEach((file) => {
      formData.append("attachments", file);
    });

    const result = await sendEmail(formData);
    if (!result) {
      showSnackbar("Could not send the email. Please try again.");
      return;
    }
    showSnackbar("Email sent successfully.");

    setForm({ to: "", subject: "", message: "" });
    setAttachments([]);
    setSelectedUserId(null);

    window.setTimeout(onClose, 300);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="md"
      PaperProps={{
        sx: {
          backgroundColor: theme.palette.background.paper,
          color: theme.palette.text.primary,
          border: "1px solid " + theme.palette.divider,
          borderRadius: "16px",
          boxShadow: theme.shadows[12],
          backgroundImage: "none"
        }
      }}
    >
      {snackbar.open && (<div className="fixed right-4 top-20 z-[1400] max-w-sm rounded-[20px] border border-gray-300 bg-card px-4 py-3 text-sm font-semibold text-card-foreground shadow-lg">{snackbar.message}<button type="button" onClick={() => setSnackbar((prev) => ({ ...prev, open: false }))} className="ml-3 text-xs text-muted-foreground hover:text-card-foreground" aria-label="Dismiss notification">×</button></div>)}
      {/* HEADER */}
      <DialogTitle
        sx={{
          display: "flex",
          justifyContent: "space-between",
          color: theme.palette.text.primary,
          borderBottom: "1px solid " + theme.palette.divider,
          px: { xs: 2, sm: 3 },
          py: 2
        }}
      >
        <Typography variant="h6">Compose Email</Typography>

        <IconButton onClick={onClose} sx={{ color: colors.gray[100] }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: { xs: 2, sm: 3 } }}>
        <Box display="flex" flexDirection={{ xs: "column", sm: "row" }} gap={{ xs: 2, sm: 3 }}>

          {/* 👤 USER LIST SIDEBAR */}
          <Box
            width={{ xs: "100%", sm: "34%" }}
            sx={{
              borderRight: { xs: "none", sm: "1px solid " + theme.palette.divider },
              borderBottom: { xs: "1px solid " + theme.palette.divider, sm: "none" },
              pr: { xs: 0, sm: 2 },
              pb: { xs: 2, sm: 0 },
              maxHeight: { xs: 190, sm: 500 },
              overflowY: "auto",
              minWidth: 0
            }}
          >
            <Typography sx={{ color: "text.primary", fontWeight: 700, fontSize: 14 }} mb={1}>
              Choose a recipient
            </Typography>

            <List>
              {users.map((u) => (
                <ListItem
                  key={u.id}
                  onClick={() => selectUser(u)}
                  sx={{
                    cursor: "pointer",
                    backgroundColor:
                      selectedUserId === u.id
                        ? colors.primary[500]
                        : "transparent",
                    borderRadius: "10px",
                    mb: 1,
                    flexDirection: "column",
                    alignItems: "flex-start",
                    transition: "background-color 150ms ease",
                    "&:hover": { backgroundColor: theme.palette.action.hover }
                  }}
                >
                  <Typography sx={{ color: "text.primary", fontWeight: 600, fontSize: 13 }}>
                    {u.username}
                  </Typography>
                  <Typography variant="body2" sx={{ color: "text.secondary", fontSize: 12, overflowWrap: "anywhere" }}>
                    {u.email}
                  </Typography>
                </ListItem>
              ))}
            </List>
          </Box>

          {/* ✉️ FORM */}
          <Box width={{ xs: "100%", sm: "66%" }} minWidth={0} display="flex" flexDirection="column" gap={2} mt={{ xs: 0, sm: "4px" }}>

            <TextField
              label="To"
              value={form.to}
              onChange={(e) =>
                setForm({ ...form, to: e.target.value })
              }
              fullWidth
            />

            <TextField
              label="Subject"
              value={form.subject}
              onChange={(e) =>
                setForm({ ...form, subject: e.target.value })
              }
              fullWidth
            />

            <TextField
              label="Message"
              multiline
              rows={6}
              value={form.message}
              onChange={(e) =>
                setForm({ ...form, message: e.target.value })
              }
              fullWidth
            />

            {/* ATTACHMENTS */}
            <Button
              component="label"
              startIcon={<AttachFileIcon />}
              variant="outlined"
              sx={{ borderRadius: "10px", textTransform: "none", justifyContent: "center", py: 1.1 }}
            >
              Attach files
              <input type="file" hidden multiple onChange={handleFileChange} />
            </Button>

            {/* FILE LIST */}
            {attachments.map((file, index) => (
              <Box
                key={index}
                display="flex"
                justifyContent="space-between"
              >
                <Typography>{file.name}</Typography>
                <Button
                  size="small"
                  color="error"
                  onClick={() => removeFile(index)}
                >
                  Remove
                </Button>
              </Box>
            ))}

            {/* SEND */}
            <Button
              variant="contained"
              sx={{ borderRadius: "10px", py: 1.2, fontWeight: 700, textTransform: "none", boxShadow: "none" }}
              onClick={handleSend}
              disabled={loading}
            >
              {loading ? "Sending..." : "Send Email"}
            </Button>

          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default ComposeEmail;