import {
    Drawer,
    Box,
    Tabs,
    Tab,
    Typography,
    List,
    ListItem,
    useTheme,
    Divider
  } from "@mui/material";
  import { useEffect, useState } from "react";
  import api from "../../../Services/Api";
  import { tokens } from "../../../theme";
  import { Button } from "../../../../components/ui/button";
  import ComposeEmail from "./AdminComposeEmail";
  
  const EmailPanel = ({ open, onClose }) => {
    const theme = useTheme();
    const colors = tokens(theme.palette.mode);
  
    const [tab, setTab] = useState("sent");
    const [emails, setEmails] = useState([]);
    const [users, setUsers] = useState([]);
    const [stats, setStats] = useState({ sent: 0, failed: 0, all: 0 });
  
    const [openCompose, setOpenCompose] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);

    // select email to view
    const [selectedEmail, setSelectedEmail] = useState(null);
  
    useEffect(() => {
      if (!open) return;
  
      const fetchData = async () => {
        const [emailRes, statsRes, usersRes] = await Promise.all([
          api.get(`api/email/list/?status=${tab}`),
          api.get(`api/email/stats/`),
          api.get(`api/email-users/`)
        ]);
  
        setEmails(emailRes.data);
        setStats(statsRes.data);
        setUsers(usersRes.data);
      };
  
      fetchData();
      const interval = setInterval(fetchData, 5000);
  
      return () => clearInterval(interval);
    }, [tab, open]);
  
    return (
      <Drawer anchor="right" open={open} onClose={onClose}>
        <Box display="flex" height="100%" width={900}>
  
          {/* 👤 USERS */}
          <Box width={220} bgcolor={colors.gray[800]} p={2}>
            <Typography variant="h6">Users</Typography>
            <Divider sx={{ my: 1 }} />
  
            <List>
              {users.map((user) => (
                <ListItem
                  key={user.id}
                  sx={{ cursor: "pointer" }}
                  onClick={() => {
                    setSelectedUser(user);
                    setOpenCompose(true);
                  }}
                >
                  <Box>
                    <strong>{user.username}</strong>
                    <br />
                    <small>{user.email}</small>
                  </Box>
                </ListItem>
              ))}
            </List>
          </Box>
  
          {/* 📧 MAIN */}
          <Box flex={1} p={2} sx={{ backgroundColor: colors.gray[700] }}>
  
            {/* HEADER */}
            <Typography variant="h6">Email Center</Typography>
  
            {/* STATS */}
            <Box display="flex" gap={2} mt={1}>
              <Box>📩 Sent: {stats.sent}</Box>
              <Box>❌ Failed: {stats.failed}</Box>
              <Box>📬 All: {stats.all}</Box>
            </Box>
  
            {/* TABS */}
            <Tabs value={tab} onChange={(e, v) => setTab(v)}>
              <Tab label="Sent" value="sent" />
              <Tab label="Failed" value="failed" />
              <Tab label="All" value="all" />
            </Tabs>
  
            {/* EMAIL LIST */}
            <List>
                {emails.map((email) => (
                    <ListItem
                    key={email.id}
                    divider
                    button
                    onClick={() => setSelectedEmail(email)}   // 🔥 CLICK TO OPEN
                    className="cursor-pointer"
                    >
                    <Box>
                        <strong>{email.subject}</strong>
                        <br />
                        {email.recipient}
                        <br />
                        <small>{email.status}</small>
                    </Box>
                    </ListItem>
                ))}
            </List>

            {/* email reader */}
            {selectedEmail && (
                <Box
                    mt={2}
                    p={2}
                    sx={{
                    backgroundColor: "#222",
                    borderRadius: "8px",
                    color: "white"
                    }}
                >
                    <Typography variant="h6">
                    {selectedEmail.subject}
                    </Typography>

                    <Typography variant="body2" sx={{ mt: 1 }}>
                    To: {selectedEmail.recipient}
                    </Typography>

                    <Typography sx={{ mt: 2 }}>
                    {selectedEmail.message}
                    </Typography>
                </Box>
                )}
  
            {/* COMPOSE BUTTON */}
            <Box position="absolute" bottom={16} right={16}>
              <Button
                onClick={() => {
                  setSelectedUser(null);
                  setOpenCompose(true);
                }}
              >
                Compose Email
              </Button>
            </Box>
  
            {/* COMPOSE (ONLY HANDLES USER DISPLAY NOW) */}
            <ComposeEmail
              open={openCompose}
              onClose={() => {
                setOpenCompose(false);
                setSelectedUser(null);
              }}
              user={selectedUser}
            />
  
          </Box>
        </Box>
      </Drawer>
    );
  };
  
  export default EmailPanel;