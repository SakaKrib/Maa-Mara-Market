import React, { useEffect, useState, useRef } from 'react';
import { Box, Button, IconButton, Typography, useTheme } from '@mui/material';
import { tokens } from '../../theme';
import Header from '../../Header/Header';
import { useNavigate } from 'react-router-dom';

import EmailIcon from '@mui/icons-material/Email';
import PointOfSaleIcon from '@mui/icons-material/PointOfSale';
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined';
import PersonAddIcon from '@mui/icons-material/PersonAdd';

import LineChart from '../../cmponents/LineGraph/LineGraph';
import BarChart from '../../cmponents/BarChart/BarChart';
import PieGraph from '../../cmponents/PieChart/pieChart';
import StatBox from '../../cmponents/StatBox/Statbox';

import { vendor_transaction } from '../../data/Vendors_info/Vendors_info';
import UiForVendorRequest from "../../cmponents/Admin/VendorRequestUi"
import { Link } from 'react-router-dom';

import api from '../../Services/Api';
import { baseUrl } from '../../cmponents/Constant/Constant';

import { IonIcon } from '@ionic/react';
import { notificationsOutline } from "ionicons/icons";

import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { useToast } from '../../../components/ui/toast';
import VendorApprovalPanel from '../../cmponents/VENDORPAGE/VendorRegistration/HandleApproveDeny';
import { Unsubscribe } from '@mui/icons-material';
import { useAuth } from '../../cmponents/Auth/AuthContext/Context';
import { useEmailStats } from '../../cmponents/Hooks/Emails/DashboardEmailHook';
import EmailPanel from '../../cmponents/AdminPages/Notifications/EmailListing';
import useDashboardStats from '../../cmponents/Hooks/StockInventory/SalesStats';


dayjs.extend(relativeTime);

const Dashboard = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const { toast } = useToast();
  const {user} = useAuth();

  const userName = user.username

  // fetch sales data for stats
  const { stats, loading } = useDashboardStats();

   // email stat fuction
   const emailStats = useEmailStats();
   // email filter list
   const [openEmailPanel, setOpenEmailPanel] = useState(false);
   const [filter, setFilter] = useState("sent");
   // open email 



  const [selectedListView, setSelectedListView] = useState('activities');
  const [activityLogs, setActivityLogs] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [unseenCount, setUnseenCount] = useState(0);
  const [progress, setProgress] = useState(0);
  const [increase, setIncrease] = useState("+0%");

  // transaction variables
  const [transactions, setTransactions] = useState([]);
  const [transactionSummary, setTransactionSummary] = useState(null);

  const lastNotificationIdRef = useRef(null);

  const navigate = useNavigate();

  // revenue fetch funtions
  const [analytics, setAnalytics] = useState({
    total_revenue: 0,
    monthly_revenue: [],
  });
  
  useEffect(() => {
    api.get("/api/revenue-analytics/").then((res) => {
      setAnalytics(res.data);
    });
  }, []);

  useEffect(() => {
    fetchUnseenCount();
    fetchActivityLogs();
    fetchNotifications();

    const interval = setInterval(() => {
      fetchUnseenCount();
      fetchActivityLogs();
      fetchNotifications();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const markAsSeen = async (id) => {
    try {
      await api.post(`/api/notifications/${id}/mark_seen/`);
    } catch (err) {
      console.error("Failed to mark notification as seen", err);
    }
  };

  // function to fetch transactions
  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        const res = await api.get("/api/admin-transactions/");
  
        setTransactions(res.data?.results || []);
        setTransactionSummary(res.data?.summary || {
          total_transactions: 0,
          total_revenue: 0,
        });
  
      } catch (err) {
        console.error("Failed to load transactions", err);
        setTransactions([]);
        setTransactionSummary({
          total_transactions: 0,
          total_revenue: 0,
        });
      }
    };
  
    fetchTransactions();
  }, []);

  const handleNotificationClick = async (notification) => {
    // Navigate to the target page
    if (notification.url) {
      navigate(notification.url);
    }
  
    // Mark as seen if not already
    if (!notification.seen) {
      try {
        await markAsSeen(notification.id);
  
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notification.id ? { ...n, seen: true } : n
          )
        );
  
        setUnseenCount((prev) => Math.max(prev - 1, 0));
      } catch (error) {
        console.error("Failed to mark notification as seen:", error);
      }
    }
  };
  

  const fetchUnseenCount = async () => {
    try {
      const response = await api.get(`${baseUrl}/api/vendor/requests/unseen-count/`);
      const data = response.data;
      setUnseenCount(data?.unseen_count ?? 0);
      setProgress(data?.progress ?? 0);
      setIncrease(data?.increase ?? "+0%");
    } catch (error) {
      console.error("Failed to fetch unseen vendor requests count", error);
    }
  };

  

  const fetchActivityLogs = async () => {
    try {
      const response = await api.get(`/api/activity-logs/`);
      setActivityLogs(response.data || []);
    } catch (error) {
      console.error("Failed to fetch activity logs", error);
    }
  };

  const fetchNotifications = async () => {
    try {
      const response = await api.get(`/api/notifications/`);
      const data = response.data || [];

      if (data.length > 0 && data[0].id !== lastNotificationIdRef.current) {
        toast({
          title: "📬 New Notification",
          description: data[0].message,
          duration: 5000,
        });
        lastNotificationIdRef.current = data[0].id;
      }
      setNotifications(data);
    } catch (error) {
      console.error("Failed to fetch notifications", error);
    }
  };

 
  

  

  return (
    <Box m="0.5em" p="1em" sx={{ width:{
      xs:"calc(100% - 95px)",
      sm:"calc(100% - 80px)",
      md:"calc(100% - 50px)",
      lg:"calc(100% - 20px)",
    },p:{
      xs:" 0"
    }, maxWidth: "100%" }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" flexWrap="wrap" alignItems="center" mb={4} sx={{p:4}}>
        <Header title="" subtitle={`Welcome ${userName || "Welcome"}`} />
        <Button
          sx={{
            backgroundColor: colors.primary[600],
            color: colors.gray[100],
            fontSize: '14px',
            fontWeight: '700',
            p: "0.7em 1em",
            mt: { xs: 2, sm: 0 }
          }}
        >
          <DownloadOutlinedIcon />
        </Button>
      </Box>

      {/* Stats Grid */}
      <Box
  display="grid"
  gridTemplateColumns={{
    xs: "repeat(1, 1fr)",   // 1 per row on small screens
    sm: "repeat(2, 1fr)",   // 2 per row on tablets
    md: "repeat(2, 1fr)",    // 4 per row on desktop
    lg: "repeat(4, 1fr)"
  }}
  
  gap={2}
  sx={{
    alignItems: "stretch",   // ensure equal card height
  }}
>
    <Box
      bgcolor={colors.primary[600]}
      p={2}
      borderRadius="0.5em"
      display="flex"
      sx={{ cursor: "pointer" }}
      onClick={() => {
        setFilter("sent");
        setOpenEmailPanel(true);
      }}
    >
      <StatBox
        title={emailStats.total.toLocaleString()}
        subtitle="Emails Sent"
        progress={
          emailStats.last_month
            ? Math.min(emailStats.this_month / emailStats.last_month, 1)
            : 0
        }
        increase={`${emailStats.growth}%`}
        icon={<EmailIcon />}
      />
    </Box>

    <Link to='sales-stats'>
      <Box
        bgcolor={colors.primary[600]}
        p={2}
        borderRadius="0.5em"
        display="flex"
      >
        <StatBox
          title={`${Number(stats.total_sales).toLocaleString()}`}
          subtitle="Sales"
          progress={
            stats.total_orders > 0
              ? stats.completed_orders / stats.total_orders
              : 0
          }
          increase={`${stats.total_orders} Orders`}
          icon={
            <PointOfSaleIcon
              sx={{
                color: colors.greenAccent[600],
                fontSize: 24,
              }}
            />
          }
        />
      </Box>
    </Link>

<Link to="vendor-requests">
  <Box bgcolor={colors.primary[600]} p={2} borderRadius="0.5em" display="flex">
    <StatBox
      title={unseenCount.toString()}
      subtitle="Vendors Awaiting Approval"
      progress={progress}
      increase={increase}
      icon={<PersonAddIcon sx={{ color: colors.gray[100], fontSize: 24 }} />}
    />
  </Box>
  </Link>

  <Box bgcolor={colors.primary[600]} p={2} borderRadius="0.5em" display="flex">
    <StatBox
      title="100,123,631"
      subtitle="Traffic Inbound"
      progress="1.75"
      increase="+67%"
      icon={<PersonAddIcon sx={{ color: colors.gray[100], fontSize: 24 }} />}
    />
  </Box>
</Box>


      {/* Revenue + Activities */}
      <Box
        display="grid"
        gridTemplateColumns={{ xs: "1fr", md: "2fr 1fr" }}
        gap={2}
        mt={3}
      >
        {/* Revenue */}
       <Link to={'sales-Analytics'}>
       <Box
          sx={{ cursor: "pointer" }}
          bgcolor={colors.primary[600]}
          p={2}
          borderRadius="0.5em"
        >
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Box>
              <Typography variant="h6" fontWeight={600} color={colors.gray[100]}>
                Revenue Generated
              </Typography>

              <Typography variant="h5" fontWeight="bold" color={colors.greenAccent[500]}>
                KES
                {analytics.total_revenue
                  ? Number(analytics.total_revenue).toLocaleString()
                  : 0}
              </Typography>
            </Box>

            <IconButton>
              <DownloadOutlinedIcon sx={{ fontSize: 26, color: colors.greenAccent[500] }} />
            </IconButton>
          </Box>

          <Box  >
            <LineChart showSummary={false} data={analytics.monthly_revenue} isDashboard />
          </Box>
        </Box>
       </Link>

        {/* Activities / Notifications / Transactions */}
        <Box>
          <Box display="flex" justifyContent="space-between" mb={2}>
            <Typography
              fontSize="18px"
              color={selectedListView === 'activities' ? colors.greenAccent[700] : colors.gray[100]} 
              sx={{ cursor: 'pointer', flex: 1, textAlign: 'center' }}
              onClick={() => setSelectedListView('activities')}
            >
              Recent Activities <span className='relative left-0 top-0 px-3 rounded-full' style={{
                backgroundColor: selectedListView === 'activities' ? colors.greenAccent[900] : colors.gray[900],
                color: colors.gray[100],
                fontSize: '12px',
                padding: '2px 8px',
                borderRadius: '999px',
                lineHeight: 1,
                }}>{activityLogs.length}</span>
            </Typography>

            <Typography
              fontSize="24px"
              position={'relative'}
              color={selectedListView === 'notifications' ? colors.greenAccent[700] : colors.gray[100]}
              sx={{ cursor: 'pointer', flex: 1, textAlign: 'center' }}
              onClick={() => setSelectedListView('notifications')}
            >
              <IonIcon icon={notificationsOutline} />
              {notifications.filter(n => !n.seen).length > 0 && (
                <span className="bg-red-500 px-1 text-grey-500 -top-2 rounded-full text-sm absolute font-semibold">
                  {notifications.filter(n => !n.seen).length}
                </span>
              )}

            </Typography>

            <Typography
              fontSize="18px"
              position="relative"
              color={
                selectedListView === "transactions"
                  ? colors.greenAccent[700]
                  : colors.gray[100]
              }
              sx={{ cursor: "pointer", flex: 1, textAlign: "center" }}
              onClick={() => setSelectedListView("transactions")}
            >
              Transactions{" "}

              <span
                className="relative left-0 top-0 px-3 rounded-full"
                style={{
                  backgroundColor:
                    selectedListView === "transactions"
                      ? colors.greenAccent[900]
                      : colors.gray[900],
                  color: colors.gray[100],
                  fontSize: "12px",
                  padding: "2px 8px",
                  borderRadius: "999px",
                  lineHeight: 1,
                }}
              >
                {(transactions || []).length}
              </span>
            </Typography>
          </Box>
          <Box
            bgcolor={colors.primary[600]}
            borderRadius="8px"
            p={2}
            sx={{maxHeight:{
              xs:"450px",
              sm:"450px",
              md:"450px",
              lg:"350px",
            }}}
            overflow="auto"
          >
            {selectedListView === 'activities' &&
              (activityLogs.length ? activityLogs.map((log) => (
                <Typography key={log.id} color={colors.gray[100]} mb={1}>
                  {new Date(log.timestamp).toLocaleString()} — {log.description}
                </Typography>
              )) : <Typography color={colors.gray[300]}>No recent activity found.</Typography>)
            }

            {selectedListView === 'notifications' &&
              (notifications.length ? notifications.map((note, idx) => (
                <Box key={idx} display="flex" alignItems="center" mb={1}>
                  <Typography
                    onClick={() => handleNotificationClick(note)}
                    sx={{
                      cursor: "pointer",
                      fontWeight: note.seen ? "normal" : "bold",
                      "&:hover": { textDecoration: "underline" }
                    }}
                    color={colors.gray[100]}
                  >
                    {note.message} — <span style={{ fontSize: "0.8em", color: colors.gray[400] }}>
                      {dayjs(note.created_at).fromNow()}
                    </span>
                  </Typography>
                  {!note.seen && (
                    <Box width={8} height={8} borderRadius="50%" bgcolor={colors.greenAccent[500]} ml={1} />
                  )}
                </Box>
              )) : <Typography color={colors.gray[300]}>No new notifications.</Typography>)
            }

              {selectedListView === "transactions" &&
                (transactions.length ? (
                  transactions.map((transaction, i) => (
                    <Box
                      key={transaction.id || i}
                      display="flex"
                      justifyContent="space-between"
                      alignItems="center"
                      py={1}
                      borderBottom={`1px solid ${colors.primary[600]}`}
                    >
                      {/* LEFT SIDE */}
                      <Box>
                        <Typography color={colors.gray[100]}>
                          TX: {transaction.txid || transaction.id}
                        </Typography>

                        <Typography color={colors.gray[300]}>
                          {transaction.user?.username || "Unknown User"}
                        </Typography>
                      </Box>

                      {/* RIGHT SIDE */}
                      <Box textAlign="right">
                        <Typography color={colors.gray[300]}>
                          {new Date(transaction.created_at).toLocaleString()}
                        </Typography>

                        <Box
                          component="span"
                          bgcolor={colors.greenAccent[900]}
                          px={1.5}
                          py={0.5}
                          borderRadius="4px"
                          fontWeight="600"
                          display="inline-block"
                          sx={{ color: colors.gray[100] }}
                        >
                          ${Number(transaction.amount || 0).toLocaleString()}
                        </Box>
                      </Box>
                    </Box>
                  ))
                ) : (
                  <Typography color={colors.gray[300]}>
                    No transactions found.
                  </Typography>
                ))}
          </Box>
        </Box>
      </Box>

      {/* Pie & Bar */}
      <Box
        display="grid"
        gridTemplateColumns={{ xs: "1fr", md: "1fr 2fr" }}
        gap={2}
        mt={3}
      >
        <Box component={Link} to="pie-chart" bgcolor={colors.primary[600]} sx={{cursor:'pointer'}} p={2} borderRadius="0.5em">
          <PieGraph isDashboard />
        </Box>
        <Box component={Link} to="bar-chart" bgcolor={colors.primary[600]} sx={{cursor:'pointer'}} p={2} borderRadius="0.5em">
          <BarChart isDashboard />
        </Box>
      </Box>
      {/* <Box>
        <VendorApprovalPanel/>
      </Box> */}

    <EmailPanel
      open={openEmailPanel}
      onClose={() => setOpenEmailPanel(false)}
      filter={filter}
    />
    </Box>
  );
};

export default Dashboard;
