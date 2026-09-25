import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { IonIcon } from "@ionic/react";
import {
  briefcaseOutline,
  downloadOutline,
  mailOutline,
  notificationsOutline,
  personAddOutline,
  statsChartOutline,
  helpCircleOutline,
  informationCircleOutline,
  cashOutline,
} from "ionicons/icons";
import { useAuth } from "../../cmponents/Auth/AuthContext/Context";
import { useToast } from "../../../components/ui/toast";
import api from "../../Services/Api";
import LineChart from "../../cmponents/LineGraph/LineGraph";
import BarChart from "../../cmponents/BarChart/BarChart";
import PieGraph from "../../cmponents/PieChart/pieChart";
import { useEmailStats } from "../../cmponents/Hooks/Emails/DashboardEmailHook";
import useDashboardStats from "../../cmponents/Hooks/StockInventory/SalesStats";
import EmailPanel from "../../cmponents/AdminPages/Notifications/EmailListing";
import CareerAdminPanel from "../../cmponents/AdminPages/Notifications/PostCareers/AdminPostCareer";
import SupportAdminPanel from "../../cmponents/AdminPages/Notifications/Support/SupportMessages";
import AboutAdminPanel from "../../cmponents/AdminPages/Notifications/UpdateAboutUs/AdminUpdateAboutUs";
import { useAdminPreferences } from "../../cmponents/Settings/AdminPreferencesContext";

const StatCard = ({ icon, label, value, detail, to, onClick }) => {
  const card = (
    <div
      onClick={onClick}
      className="group flex min-h-[148px] w-full cursor-pointer flex-col items-center justify-center rounded-2xl border border-border bg-card p-4 text-center shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:min-h-36 sm:p-5"
    >
      <div className="flex min-w-0 w-full flex-col items-center justify-center">
        <div className="mb-3 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <IonIcon icon={icon} className="text-xl" />
        </div>
        <p className="w-full truncate text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-bold tracking-tight text-card-foreground">{value}</p>
        <p className="mt-1 line-clamp-2 w-full text-xs text-muted-foreground">{detail}</p>
      </div>
      
    </div>
  );

  return to ? <Link to={to}>{card}</Link> : card;
};

const Dashboard = () => {
  const { user } = useAuth();
  const { preferences } = useAdminPreferences();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { stats } = useDashboardStats();
  const emailStats = useEmailStats();

  const [openEmailPanel, setOpenEmailPanel] = useState(false);
  const [openCareerPanel, setOpenCareerPanel] = useState(false);
  const [openSupportPanel, setOpenSupportPanel] = useState(false);
  const [openAboutPanel, setOpenAboutPanel] = useState(false);
  const [filter, setFilter] = useState("sent");

  const [activityLogs, setActivityLogs] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [transactionSummary, setTransactionSummary] = useState({
    total_transactions: 0,
    total_revenue: 0,
  });
  const [unseenVendorRequests, setUnseenVendorRequests] = useState(0);
  const [vendorProgress, setVendorProgress] = useState(0);
  const [vendorIncrease, setVendorIncrease] = useState("+0%");
  const [jobsCount, setJobsCount] = useState(0);
  const [supportCount, setSupportCount] = useState(0);
  const [analytics, setAnalytics] = useState({ total_revenue: 0, monthly_revenue: [] });
  const [chartData, setChartData] = useState({ sales_activity: [], category_distribution: [] });
  const [trafficData, setTrafficData] = useState({
    total_visits: 0,
    page_views: 0,
    unique_visitors: 0,
    sessions: 0,
    growth_percent: 0,
    item_views: 0,
    trend: [],
    sources: [],
    countries: [],
    devices: [],
    landing_pages: [],
  });
  const [selectedListView, setSelectedListView] = useState("activities");
  const lastNotificationIdRef = useRef(null);
  const notificationsHydratedRef = useRef(false);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const [revenue, vendorRequests, transactionsResponse, activity, notificationList] =
          await Promise.all([
            api.get("/api/revenue-analytics/"),
            api.get("/api/vendor/requests?status=verified"),
            api.get("/api/admin-transactions/"),
            api.get("/api/activity-logs/"),
            api.get("/api/notifications/"),
          ]);

        setAnalytics(revenue.data || { total_revenue: 0, monthly_revenue: [] });
        setUnseenVendorRequests(Array.isArray(vendorRequests.data) ? vendorRequests.data.length : Number(vendorRequests.data?.count ?? vendorRequests.data?.results?.length ?? 0));
        setVendorProgress(vendorRequests.data?.progress ?? 0);
        setVendorIncrease(vendorRequests.data?.increase ?? "+0%");
        setTransactions(transactionsResponse.data?.results || []);
        setTransactionSummary(
          transactionsResponse.data?.summary || { total_transactions: 0, total_revenue: 0 }
        );
        setActivityLogs(Array.isArray(activity.data) ? activity.data : []);
        const initialNotifications = Array.isArray(notificationList.data)
          ? notificationList.data
          : (Array.isArray(notificationList.data?.results) ? notificationList.data.results : []);
        setNotifications(initialNotifications);
        lastNotificationIdRef.current = initialNotifications[0]?.id ?? null;
        notificationsHydratedRef.current = true;
      } catch (error) {
        console.error("Admin dashboard data load failed:", error);
      }
    };

    loadDashboard();

    const interval = setInterval(async () => {
      try {
        const [vendorRequests, activity, notificationList] = await Promise.all([
          api.get("/api/vendor/requests/unseen-count/"),
          api.get("/api/activity-logs/"),
          api.get("/api/notifications/"),
        ]);
        setUnseenVendorRequests(vendorRequests.data?.unseen_count ?? 0);
        setVendorProgress(vendorRequests.data?.progress ?? 0);
        setVendorIncrease(vendorRequests.data?.increase ?? "+0%");
        setActivityLogs(Array.isArray(activity.data) ? activity.data : []);
        const nextNotifications = Array.isArray(notificationList.data) ? notificationList.data : (Array.isArray(notificationList.data?.results) ? notificationList.data.results : []);
        setNotifications(nextNotifications);
      } catch (error) {
        console.error("Admin dashboard refresh failed:", error);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, []);


  useEffect(() => {
    const loadChartData = async () => {
      try {
        const response = await api.get("/api/admin/dashboard-chart-data/");
        setChartData(response.data || { sales_activity: [], category_distribution: [] });
      } catch (error) {
        console.error("Admin chart data load failed:", error);
      }
    };
    loadChartData();
  }, []);

  useEffect(() => {
    const loadTrafficSummary = async () => {
      try {
        const response = await api.get("/api/admin/traffic-analytics/?days=30");
        setTrafficData(response.data || {});
      } catch (error) {
        console.error("Admin traffic summary load failed:", error);
      }
    };
    loadTrafficSummary();
    const interval = setInterval(loadTrafficSummary, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const loadCounts = async () => {
      try {
        const [jobs, support] = await Promise.all([
          api.get("/api/applications/unseen/"),
          api.get("/api/support/status-counts/"),
        ]);
        setJobsCount(jobs.data?.unseen ?? 0);
        setSupportCount(support.data?.pending ?? 0);
      } catch (error) {
        console.error("Admin dashboard notification counts failed:", error);
      }
    };
    loadCounts();
  }, []);

  useEffect(() => {
    const latest = notifications[0];
    if (!notificationsHydratedRef.current || !preferences.notifications || !latest) return;
    if (latest.id === lastNotificationIdRef.current) return;

    lastNotificationIdRef.current = latest.id;
    toast({
      title: latest.display_title || latest.title || "New notification",
      description: latest.display_message || latest.message,
      duration: 5000,
    });
  }, [notifications, toast, preferences.notifications]);

  const markAsSeen = async (id) => {
    try {
      await api.post(`/api/notifications/${id}/mark_seen/`);
    } catch (error) {
      console.error("Failed to mark notification as seen:", error);
    }
  };

  const handleNotificationClick = async (notification) => {
    if (notification.url) navigate(notification.url);
    if (!notification.seen) {
      await markAsSeen(notification.id);
      setNotifications((items) =>
        items.map((item) => (item.id === notification.id ? { ...item, seen: true } : item))
      );
    }
  };

  const unreadNotifications = notifications.filter((item) => !item.seen).length;
  const totalOrders = Number(stats?.total_orders || 0);
  const completedOrders = Number(stats?.completed_orders || 0);
  const emailGrowth = Number(emailStats?.growth || 0);

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm dark:border-border dark:bg-card sm:p-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary dark:text-primary">Admin workspace</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-card-foreground dark:text-card-foreground sm:text-3xl">
            Welcome{user?.first_name ? `, ${user.first_name}` : user?.username ? `, ${user.username}` : ""}
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground dark:text-muted-foreground">
            Monitor marketplace activity, vendors, revenue and customer operations from one place.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:flex">
          <button
            type="button"
            title="Dashboard export"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-xs font-semibold text-foreground transition hover:bg-muted"
          >
            <IonIcon icon={downloadOutline} />
            Export
          </button>
          <button
            type="button"
            onClick={() => { setFilter("sent"); setOpenEmailPanel(true); }}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-xs font-semibold text-foreground hover:bg-muted dark:border-border dark:bg-card dark:text-foreground dark:hover:bg-muted"
          >
            <IonIcon icon={mailOutline} />
            Email
          </button>
          <Link
            to="/admin-dashboard/sales-Analytics"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
          >
            <IonIcon icon={statsChartOutline} />
            Analytics
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard
          icon={mailOutline}
          label="Emails sent"
          value={Number(emailStats?.total || 0).toLocaleString()}
          detail={`${emailGrowth}% growth`}
          onClick={() => { setFilter("sent"); setOpenEmailPanel(true); }}
        />
        <StatCard
          icon={cashOutline}
          label="Sales"
          value={Number(stats?.total_sales || 0).toLocaleString()}
          detail={`${totalOrders} orders • ${completedOrders} completed`}
          to="/admin-dashboard/sales-Analytics"
        />
        <StatCard
          icon={personAddOutline}
          label="Vendor approvals"
          value={unseenVendorRequests.toLocaleString()}
          detail={`${vendorIncrease} • ${Math.round(Number(vendorProgress) * 100)}% progress`}
          to="/admin-dashboard/vendor-requests"
        />
        <StatCard
          icon={personAddOutline}
          label="Traffic inbound"
          value={Number(trafficData.unique_visitors || 0).toLocaleString()}
          detail="Customer journeys, pages, countries and goals"
          to="/admin-dashboard/inbound-traffic"
        />
      </div>


      <div className="grid min-w-0 grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,0.8fr)]">
        <Link
          to="/admin-dashboard/sales-Analytics"
          className="min-w-0 w-full overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition hover:shadow-md"
        >
          <div className="flex flex-col gap-3 border-b border-border p-5 sm:flex-row sm:items-center sm:justify-between dark:border-border">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Financial overview</p>
              <h2 className="mt-1 text-lg font-bold text-card-foreground dark:text-card-foreground">Revenue generated</h2>
            </div>
            <div className="text-left sm:text-right">
              <p className="text-xl font-bold text-card-foreground dark:text-card-foreground">
                KES {Number(analytics.total_revenue || 0).toLocaleString()}
              </p>
              <span className="text-xs text-muted-foreground">View full analytics →</span>
            </div>
          </div>
          <div className="h-[280px] min-w-0 p-2 sm:h-[360px] sm:p-5">
            <LineChart showSummary={false} data={analytics.monthly_revenue || []} isDashboard />
          </div>
        </Link>

        <div className="min-w-0 w-full rounded-2xl border border-border bg-card p-3 shadow-sm sm:p-4">
          <div className="mb-3 grid grid-cols-3 gap-1 rounded-xl bg-muted p-1">
            {[
              ["activities", "Activity", activityLogs.length],
              ["notifications", "Notifications", unreadNotifications],
              ["transactions", "Transactions", transactions.length],
            ].map(([key, label, count]) => (
              <button
                key={key}
                type="button"
                onClick={() => setSelectedListView(key)}
                className={`min-w-0 flex-1 rounded-lg px-2 py-2 text-xs font-semibold transition ${selectedListView === key ? "bg-card text-primary shadow-sm dark:bg-card dark:text-primary" : "text-muted-foreground hover:text-card-foreground dark:text-muted-foreground dark:hover:text-card-foreground"}`}
              >
                <span className="block truncate">{label}</span>
                <span className="text-[10px] opacity-70">{count}</span>
              </button>
            ))}
          </div>

          <div className="h-[300px] min-w-0 space-y-2 overflow-x-hidden overflow-y-auto pr-1">
            {selectedListView === "activities" &&
              (activityLogs.length ? activityLogs.map((log) => (
                <div key={log.id} className="rounded-xl bg-muted p-3 dark:bg-muted">
                  <p className="text-xs font-medium text-card-foreground dark:text-card-foreground">{log.display_message || log.description}</p>
                  <p className="mt-1 text-[10px] text-muted-foreground">{new Date(log.timestamp).toLocaleString()}</p>
                </div>
              )) : <p className="p-4 text-sm text-muted-foreground">No recent activity found.</p>)}

            {selectedListView === "notifications" &&
              (notifications.length ? notifications.map((note) => (
                <button
                  key={note.id}
                  type="button"
                  onClick={() => handleNotificationClick(note)}
                  className="block w-full rounded-xl bg-muted p-3 text-left hover:bg-primary/10 dark:bg-muted dark:hover:bg-primary/100/10"
                >
                  <div className="flex items-start gap-2">
                    <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${note.seen ? "bg-slate-300" : "bg-primary/100"}`} />
                    <div className="min-w-0">
                      <p className={`text-xs ${note.seen ? "text-foreground dark:text-muted-foreground" : "font-semibold text-card-foreground dark:text-card-foreground"}`}>{note.display_message || note.message}</p>
                      <p className="mt-1 text-[10px] text-muted-foreground">{new Date(note.created_at).toLocaleString()}</p>
                    </div>
                  </div>
                </button>
              )) : <p className="p-4 text-sm text-muted-foreground">No notifications found.</p>)}

            {selectedListView === "transactions" &&
              (transactions.length ? transactions.map((transaction, index) => (
                <div key={transaction.id || index} className="flex items-center justify-between gap-3 rounded-xl bg-muted p-3 dark:bg-muted">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-card-foreground dark:text-card-foreground">
                      TX: {transaction.txid || transaction.id}
                    </p>
                    <p className="truncate text-[10px] text-muted-foreground">
                      {transaction.user?.username || transaction.payer_email || "Unknown user"}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-[10px] text-muted-foreground">{new Date(transaction.created_at).toLocaleString()}</p>
                    <p className="text-xs font-bold text-[hsl(var(--chart-2))] dark:text-[hsl(var(--chart-2))]">
                      KES {Number(transaction.amount || 0).toLocaleString()}
                    </p>
                  </div>
                </div>
              )) : <p className="p-4 text-sm text-muted-foreground">No transactions found.</p>)}
          </div>

          <div className="mt-3 border-t border-border pt-3 dark:border-border">
            <div className="rounded-xl bg-muted px-3 py-2.5">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {selectedListView === "activities"
                  ? "Activity"
                  : selectedListView === "notifications"
                    ? "Notifications"
                    : "Transactions"}
              </p>
              <p className="text-sm font-bold text-card-foreground dark:text-card-foreground">
                {selectedListView === "activities"
                  ? activityLogs.length
                  : selectedListView === "notifications"
                    ? unreadNotifications
                    : transactions.length}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-5">
        <Link
          to="/admin-dashboard/pie-chart"
          className="rounded-2xl border border-border bg-card p-4 shadow-sm transition hover:shadow-md dark:border-border dark:bg-card"
        >
          <div className="mb-2 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Marketplace mix</p>
              <h2 className="text-lg font-bold text-card-foreground dark:text-card-foreground">Category distribution</h2>
            </div>
            <IonIcon icon={statsChartOutline} className="text-primary" />
          </div>
          <div className="h-[320px] min-w-0 overflow-hidden"><PieGraph data={chartData.category_distribution || []} /></div>
        </Link>

        <Link
          to="/admin-dashboard/bar-chart"
          className="rounded-2xl border border-border bg-card p-4 shadow-sm transition hover:shadow-md dark:border-border dark:bg-card"
        >
          <div className="mb-2 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Performance</p>
              <h2 className="text-lg font-bold text-card-foreground dark:text-card-foreground">Sales activity</h2>
            </div>
            <IonIcon icon={statsChartOutline} className="text-primary" />
          </div>
          <div className="h-[320px] min-w-0 overflow-hidden"><BarChart data={chartData.sales_activity || []} /></div>
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <button onClick={() => setOpenCareerPanel(true)} className="rounded-2xl border border-border bg-card p-4 text-left shadow-sm hover:border-primary dark:border-border dark:bg-card">
          <IonIcon icon={briefcaseOutline} className="text-xl text-primary" />
          <p className="mt-3 text-sm font-bold text-card-foreground dark:text-card-foreground">Careers</p>
          <p className="mt-1 text-xs text-muted-foreground dark:text-muted-foreground">{jobsCount} unseen applications</p>
        </button>
        <Link to="/admin-dashboard/support" className="rounded-2xl border border-border bg-card p-4 text-left shadow-sm hover:border-primary dark:border-border dark:bg-card">          <IonIcon icon={helpCircleOutline} className="text-xl text-primary" />          <p className="mt-3 text-sm font-bold text-card-foreground dark:text-card-foreground">Support</p>          <p className="mt-1 text-xs text-muted-foreground dark:text-muted-foreground">{supportCount} pending messages</p>        </Link>
        <button onClick={() => setOpenAboutPanel(true)} className="rounded-2xl border border-border bg-card p-4 text-left shadow-sm hover:border-primary dark:border-border dark:bg-card">
          <IonIcon icon={informationCircleOutline} className="text-xl text-primary" />
          <p className="mt-3 text-sm font-bold text-card-foreground dark:text-card-foreground">About Maa Mara</p>
          <p className="mt-1 text-xs text-muted-foreground dark:text-muted-foreground">Update public company information</p>
        </button>
        <Link to="/admin-dashboard/vendor-payout/payment-trigger" className="rounded-2xl border border-border bg-card p-4 text-left shadow-sm hover:border-primary dark:border-border dark:bg-card">
          <IonIcon icon={downloadOutline} className="text-xl text-primary" />
          <p className="mt-3 text-sm font-bold text-card-foreground dark:text-card-foreground">Payouts</p>
          <p className="mt-1 text-xs text-muted-foreground dark:text-muted-foreground">Generate vendor payments</p>
        </Link>
      </div>

      <EmailPanel open={openEmailPanel} onClose={() => setOpenEmailPanel(false)} filter={filter} />
      <CareerAdminPanel open={openCareerPanel} onClose={() => setOpenCareerPanel(false)} />
      <SupportAdminPanel open={openSupportPanel} onClose={() => setOpenSupportPanel(false)} />
      <AboutAdminPanel open={openAboutPanel} onClose={() => setOpenAboutPanel(false)} />
    </section>
  );
};

export default Dashboard;
