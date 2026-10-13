import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import { useSendEmail } from "../../Hooks/Emails/EmailSending";
import api from "../../../Services/Api";

const emptyForm = { to: "", subject: "", message: "" };

const ComposeEmail = ({ open, onClose, user = null }) => {
  const { sendEmail, loading } = useSendEmail();
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [attachments, setAttachments] = useState([]);
  const [notice, setNotice] = useState({ open: false, severity: "success", message: "" });

  useEffect(() => {
    if (!open) return undefined;
    let active = true;
    api.get("/api/email-users/")
      .then(({ data }) => {
        if (active) setUsers(Array.isArray(data) ? data : (data?.results || []));
      })
      .catch(() => {
        if (active) setUsers([]);
      });
    return () => { active = false; };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setForm({ ...emptyForm, to: user?.email || "" });
    setAttachments([]);
  }, [open, user]);

  const updateField = (field) => (event) => {
    setForm((previous) => ({ ...previous, [field]: event.target.value }));
  };

  const handleFiles = (event) => {
    setAttachments((previous) => [...previous, ...Array.from(event.target.files || [])]);
    event.target.value = "";
  };

  const handleSend = async (event) => {
    event.preventDefault();
    if (!form.to.trim() || !form.subject.trim() || !form.message.trim()) {
      setNotice({ open: true, severity: "warning", message: "Enter a recipient, subject, and message." });
      return;
    }

    const payload = new FormData();
    payload.append("to", form.to.trim());
    payload.append("subject", form.subject.trim());
    payload.append("message", form.message);
    attachments.forEach((file) => payload.append("attachments", file));

    const result = await sendEmail(payload);
    if (!result) {
      setNotice({ open: true, severity: "error", message: "Could not send the email. Please try again." });
      return;
    }

    setNotice({ open: true, severity: "success", message: "Email sent successfully." });
    setForm(emptyForm);
    setAttachments([]);
    window.setTimeout(() => onClose?.(), 500);
  };

  return (
    <>
      <Dialog open={open} onClose={loading ? undefined : onClose} fullWidth maxWidth="md">
        <Box component="form" onSubmit={handleSend}>
          <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2, borderBottom: 1, borderColor: "divider" }}>
            <Box>
              <Typography variant="h6" fontWeight={700}>Compose email</Typography>
              <Typography variant="body2" color="text.secondary">Send a message to a Maa Mara Market user.</Typography>
            </Box>
            <IconButton aria-label="Close compose email" onClick={onClose} disabled={loading}><CloseIcon /></IconButton>
          </DialogTitle>
          <DialogContent sx={{ pt: 2.5 }}>
            <Stack spacing={2} sx={{ mt: 0.5 }}>
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>Choose a contact</Typography>
                <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", maxHeight: 150, overflowY: "auto" }}>
                  {users.map((entry) => (
                    <Button key={entry.id ?? entry.email} size="small" variant={form.to === entry.email ? "contained" : "outlined"} onClick={() => setForm((previous) => ({ ...previous, to: entry.email || "" }))} disabled={!entry.email}>
                      {entry.username || entry.email}
                    </Button>
                  ))}
                  {!users.length && <Typography variant="body2" color="text.secondary">Contact list is unavailable; you can enter an email address manually.</Typography>}
                </Box>
              </Box>
              <TextField label="To" type="email" value={form.to} onChange={updateField("to")} required fullWidth />
              <TextField label="Subject" value={form.subject} onChange={updateField("subject")} required fullWidth />
              <TextField label="Message" value={form.message} onChange={updateField("message")} required fullWidth multiline minRows={6} />
              <Button component="label" variant="outlined" startIcon={<AttachFileIcon />} sx={{ alignSelf: "flex-start", textTransform: "none" }}>
                Attach files
                <input hidden type="file" multiple onChange={handleFiles} />
              </Button>
              {attachments.map((file, index) => (
                <Box key={file.name + file.size + index} sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2 }}>
                  <Typography variant="body2" sx={{ overflowWrap: "anywhere" }}>{file.name}</Typography>
                  <Button size="small" color="error" onClick={() => setAttachments((previous) => previous.filter((_, fileIndex) => fileIndex !== index))}>Remove</Button>
                </Box>
              ))}
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2.5 }}>
            <Button onClick={onClose} disabled={loading}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={loading} startIcon={loading ? <CircularProgress size={16} color="inherit" /> : null}>
              {loading ? "Sending…" : "Send email"}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
      <Snackbar open={notice.open} autoHideDuration={5000} onClose={() => setNotice((previous) => ({ ...previous, open: false }))} anchorOrigin={{ vertical: "top", horizontal: "right" }}>
        <Alert severity={notice.severity} variant="filled" onClose={() => setNotice((previous) => ({ ...previous, open: false }))}>{notice.message}</Alert>
      </Snackbar>
    </>
  );
};

export default ComposeEmail;
