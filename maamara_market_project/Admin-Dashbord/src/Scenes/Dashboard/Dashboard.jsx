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

const StatCard = ({ icon, label, value, detail, to, onClick }) => {
  const card = (
    <div
      onClick={onClick}
      className="group flex min-h-32 cursor-pointer items-start justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="min-w-0">
        <div className="mb-4 grid h-10 w-10 place-items-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300">
          <IonIcon icon={icon} className="text-xl" />
        </div>
        <p className="truncate text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</p>
        <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{value}</p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{detail}</p>
      </div>
      <span className="mt-1 h-2 w-2 rounded-full bg-emerald-500 opacity-70 transition group-hover:scale-125" />
    </div>
  );

  return to ? <Link to={to}>{card}</Link> : card;
};

const Dashboard = () => {
  const { user } = useAuth();
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
  const [jobsCount, setJobsCount] = useState(0);
  const [supportCount, setSupportCount] = useState(0);
  const [analytics, setAnalytics] = useState({ total_revenue: 0, monthly_revenue: [] });
  const [selectedListView, setSelectedListView] = useState("activities");
  const lastNotificationIdRef = useRef(null);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const [revenue, vendorRequests, transactionsResponse, activity, notificationList] =
          await Promise.all([
            api.get("/api/revenue-analytics/"),
            api.get("/api/vendor/requests/unseen-count/"),
            api.get("/api/admin-transactions/"),
            api.get("/api/activity-logs/"),
            api.get("/api/notifications/"),
          ]);

        setAnalytics(revenue.data || { total_revenue: 0, monthly_revenue: [] });
        setUnseenVendorRequests(vendorRequests.data?.unseen_count ?? 0);
        setTransactions(transactionsResponse.data?.results || []);
        setTransactionSummary(
          transactionsResponse.data?.summary || { total_transactions: 0, total_revenue: 0 }
        );
        setActivityLogs(Array.isArray(activity.data) ? activity.data : []);
        setNotifications(Array.isArray(notificationList.data) ? notificationList.data : []);
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
        setActivityLogs(Array.isArray(activity.data) ? activity.data : []);
        const nextNotifications = Array.isArray(notificationList.data) ? notificationList.data : [];
        setNotifications(nextNotifications);
      } catch (error) {
        console.error("Admin dashboard refresh failed:", error);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const loadCounts = async () => {
      try {
        const [jobs, support] = await Promise.all([
          api.get("/api/applications/unseen-count/"),
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
    if (!latest || latest.id === lastNotificationIdRef.current) return;

    lastNotificationIdRef.current = latest.id;
    toast({
      title: "New notification",
      description: latest.message,
      duration: 5000,
    });
  }, [notifications, toast]);

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
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-600 dark:text-indigo-300">Admin workspace</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
            Welcome{user?.first_name ? `, ${user.first_name}` : user?.username ? `, ${user.username}` : ""}
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
            Monitor marketplace activity, vendors, revenue and customer operations from one place.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:flex">
          <button
            type="button"
            onClick={() => { setFilter("sent"); setOpenEmailPanel(true); }}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <IonIcon icon={mailOutline} />
            Email
          </button>
          <Link
            to="/admin-dashboard/sales-Analytics"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-indigo-700"
          >
            <IonIcon icon={statsChartOutline} />
            Analytics
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
          detail="Requests waiting for review"
          to="/admin-dashboard/vendor-requests"
        />
        <StatCard
          icon={notificationsOutline}
          label="Notifications"
          value={unreadNotifications.toLocaleString()}
          detail="Unread admin notifications"
          onClick={() => setSelectedListView("notifications")}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,0.8fr)]">
        <Link
          to="/admin-dashboard/sales-Analytics"
          className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Financial overview</p>
              <h2 className="mt-1 text-lg font-bold text-slate-900 dark:text-white">Revenue generated</h2>
            </div>
            <div className="text-left sm:text-right">
              <p className="text-xl font-bold text-slate-900 dark:text-white">
                KES {Number(analytics.total_revenue || 0).toLocaleString()}
              </p>
              <span className="text-xs text-slate-500">View full analytics →</span>
            </div>
          </div>
          <div className="h-[320px] p-3 sm:h-[360px] sm:p-5">
            <LineChart showSummary={false} data={analytics.monthly_revenue || []} isDashboard />
          </div>
        </Link>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-3 flex items-center gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
            {[
              ["activities", "Activity", activityLogs.length],
              ["notifications", "Notifications", unreadNotifications],
              ["transactions", "Transactions", transactions.length],
            ].map(([key, label, count]) => (
              <button
                key={key}
                type="button"
                onClick={() => setSelectedListView(key)}
                className={`min-w-0 flex-1 rounded-lg px-2 py-2 text-xs font-semibold transition ${selectedListView === key ? "bg-white text-indigo-700 shadow-sm dark:bg-slate-700 dark:text-indigo-200" : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"}`}
              >
                <span className="block truncate">{label}</span>
                <span className="text-[10px] opacity-70">{count}</span>
              </button>
            ))}
          </div>

          <div className="h-[300px] space-y-2 overflow-y-auto pr-1">
            {selectedListView === "activities" &&
              (activityLogs.length ? activityLogs.map((log) => (
                <div key={log.id} className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
                  <p className="text-xs font-medium text-slate-800 dark:text-slate-100">{log.description}</p>
                  <p className="mt-1 text-[10px] text-slate-400">{new Date(log.timestamp).toLocaleString()}</p>
                </div>
              )) : <p className="p-4 text-sm text-slate-400">No recent activity found.</p>)}

            {selectedListView === "notifications" &&
              (notifications.length ? notifications.map((note) => (
                <button
                  key={note.id}
                  type="button"
                  onClick={() => handleNotificationClick(note)}
                  className="block w-full rounded-xl bg-slate-50 p-3 text-left hover:bg-indigo-50 dark:bg-slate-800/60 dark:hover:bg-indigo-500/10"
                >
                  <div className="flex items-start gap-2">
                    <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${note.seen ? "bg-slate-300" : "bg-indigo-500"}`} />
                    <div className="min-w-0">
                      <p className={`text-xs ${note.seen ? "text-slate-600 dark:text-slate-300" : "font-semibold text-slate-900 dark:text-white"}`}>{note.message}</p>
                      <p className="mt-1 text-[10px] text-slate-400">{new Date(note.created_at).toLocaleString()}</p>
                    </div>
                  </div>
                </button>
              )) : <p className="p-4 text-sm text-slate-400">No notifications found.</p>)}

            {selectedListView === "transactions" &&
              (transactions.length ? transactions.map((transaction, index) => (
                <div key={transaction.id || index} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-slate-800 dark:text-white">
                      TX: {transaction.txid || transaction.id}
                    </p>
                    <p className="truncate text-[10px] text-slate-400">
                      {transaction.user?.username || transaction.payer_email || "Unknown user"}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-[10px] text-slate-400">{new Date(transaction.created_at).toLocaleString()}</p>
                    <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      KES {Number(transaction.amount || 0).toLocaleString()}
                    </p>
                  </div>
                </div>
              )) : <p className="p-4 text-sm text-slate-400">No transactions found.</p>)}
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-400">Transactions</p>
              <p className="text-sm font-bold text-slate-900 dark:text-white">{Number(transactionSummary.total_transactions || 0).toLocaleString()}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-wider text-slate-400">Revenue</p>
              <p className="text-sm font-bold text-slate-900 dark:text-white">KES {Number(transactionSummary.total_revenue || 0).toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Link
          to="/admin-dashboard/pie-chart"
          className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="mb-2 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Marketplace mix</p>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Category distribution</h2>
            </div>
            <IonIcon icon={statsChartOutline} className="text-indigo-500" />
          </div>
          <div className="h-[320px]"><PieGraph isDashboard /></div>
        </Link>

        <Link
          to="/admin-dashboard/bar-chart"
          className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="mb-2 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Performance</p>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Sales activity</h2>
            </div>
            <IonIcon icon={statsChartOutline} className="text-indigo-500" />
          </div>
          <div className="h-[320px]"><BarChart isDashboard /></div>
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <button onClick={() => setOpenCareerPanel(true)} className="rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm hover:border-indigo-300 dark:border-slate-800 dark:bg-slate-900">
          <IonIcon icon={briefcaseOutline} className="text-xl text-indigo-600" />
          <p className="mt-3 text-sm font-bold text-slate-900 dark:text-white">Careers</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{jobsCount} unseen applications</p>
        </button>
        <button onClick={() => setOpenSupportPanel(true)} className="rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm hover:border-indigo-300 dark:border-slate-800 dark:bg-slate-900">
          <IonIcon icon={helpCircleOutline} className="text-xl text-indigo-600" />
          <p className="mt-3 text-sm font-bold text-slate-900 dark:text-white">Support</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{supportCount} pending messages</p>
        </button>
        <button onClick={() => setOpenAboutPanel(true)} className="rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm hover:border-indigo-300 dark:border-slate-800 dark:bg-slate-900">
          <IonIcon icon={informationCircleOutline} className="text-xl text-indigo-600" />
          <p className="mt-3 text-sm font-bold text-slate-900 dark:text-white">About Maa Mara</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Update public company information</p>
        </button>
        <Link to="/admin-dashboard/vendor-payout/payment-trigger" className="rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm hover:border-indigo-300 dark:border-slate-800 dark:bg-slate-900">
          <IonIcon icon={downloadOutline} className="text-xl text-indigo-600" />
          <p className="mt-3 text-sm font-bold text-slate-900 dark:text-white">Payouts</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Generate vendor payments</p>
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
