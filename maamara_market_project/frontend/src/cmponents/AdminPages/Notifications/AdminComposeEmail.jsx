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
          backgroundColor: colors.primary[600],
          borderRadius: "12px"
        }
      }}
    >
      {snackbar.open && (<div className="fixed right-4 top-20 z-[1400] max-w-sm rounded-[20px] border border-gray-300 bg-card px-4 py-3 text-sm font-semibold text-card-foreground shadow-lg">{snackbar.message}<button type="button" onClick={() => setSnackbar((prev) => ({ ...prev, open: false }))} className="ml-3 text-xs text-muted-foreground hover:text-card-foreground" aria-label="Dismiss notification">×</button></div>)}
      {/* HEADER */}
      <DialogTitle
        sx={{
          display: "flex",
          justifyContent: "space-between",
          color: colors.gray[100]
        }}
      >
        <Typography variant="h6">Compose Email</Typography>

        <IconButton onClick={onClose} sx={{ color: colors.gray[100] }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent>
        <Box display="flex" gap={2}>

          {/* 👤 USER LIST SIDEBAR */}
          <Box
            width="40%"
            sx={{
              borderRight: `1px solid ${colors.primary[500]}`,
              pr: 2,
              maxHeight: 500,
              overflowY: "auto"
            }}
          >
            <Typography color={colors.gray[100]} mb={1}>
              Users
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
                    borderRadius: "6px",
                    mb: 1,
                    flexDirection: "column",
                    alignItems: "flex-start"
                  }}
                >
                  <Typography color={colors.gray[100]}>
                    {u.username}
                  </Typography>
                  <Typography variant="body2" color={colors.gray[300]}>
                    {u.email}
                  </Typography>
                </ListItem>
              ))}
            </List>
          </Box>

          {/* ✉️ FORM */}
          <Box width="60%" display="flex" flexDirection="column" gap={2} mt={'10px'}>

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
            >
              Attach Files
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