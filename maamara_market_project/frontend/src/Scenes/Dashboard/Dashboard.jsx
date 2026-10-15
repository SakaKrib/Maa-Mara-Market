import React, { useEffect, useRef, useState } from "react";
import { Trash2 } from "lucide-react";
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
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [exportingKey, setExportingKey] = useState("");

  const [activityLogs, setActivityLogs] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [transactionSummary, setTransactionSummary] = useState({
    total_transactions: 0,
    total_revenue: 0,
  });
  const [unseenVendorRequests, setUnseenVendorRequests] = useState(0);
  const [approvalRequestTotal, setApprovalRequestTotal] = useState(0);
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
  const [activityActionError, setActivityActionError] = useState("");
  const [notificationActionError, setNotificationActionError] = useState("");
  const lastNotificationIdRef = useRef(null);
  const notificationsHydratedRef = useRef(false);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const [revenue, vendorRequests, itemRequests, blogs, prices, banners, transactionsResponse, activity, notificationList] =
          await Promise.all([
            api.get("/api/revenue-analytics/"),
            api.get("/api/vendor/requests?status=verified"),
            api.get("/api/vendor/requests/?status=pending"),
            api.get("/api/admin/blogs/"),
            api.get("/api/price-change-requests/?status=pending"),
            api.get("/api/moderation/banners/"),
            api.get("/api/admin-transactions/"),
            api.get("/api/activity-logs/", { params: { scope: "admin" } }),
            api.get("/api/notifications/"),
          ]);

        setAnalytics(revenue.data || { total_revenue: 0, monthly_revenue: [] });
        const requestCount = (response) => Array.isArray(response.data) ? response.data.length : Number(response.data?.count ?? response.data?.results?.length ?? 0);
        setUnseenVendorRequests(requestCount(vendorRequests));
        setApprovalRequestTotal([vendorRequests, itemRequests, blogs, prices, banners].reduce((total, response) => total + requestCount(response), 0));
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
          api.get("/api/activity-logs/", { params: { scope: "admin" } }),
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

  const deleteActivityLog = async (activityId) => {
    if (!window.confirm("Delete this administrator activity? This cannot be undone.")) return;
    try {
      setActivityActionError("");
      await api.delete(`/api/activity-logs-item/${activityId}/delete/`, { withCredentials: true });
      setActivityLogs((items) => items.filter((item) => item.id !== activityId));
    } catch (error) {
      setActivityActionError("We couldn't delete that activity. Please try again.");
    }
  };

  const clearAllActivityLogs = async () => {
    if (!window.confirm("Clear all administrator activities? Vendor and customer activity records will be kept.")) return;
    try {
      setActivityActionError("");
      await api.delete("/api/activity-logs-item/clear-all-logs/", { withCredentials: true });
      setActivityLogs([]);
    } catch (error) {
      setActivityActionError("We couldn't clear administrator activities. Please try again.");
    }
  };

  const deleteNotification = async (notificationId) => {
    if (!window.confirm("Delete this notification? This cannot be undone.")) return;
    try {
      setNotificationActionError("");
      await api.delete(`/api/notifications/${notificationId}/`, { withCredentials: true });
      setNotifications((items) => items.filter((item) => item.id !== notificationId));
      if (lastNotificationIdRef.current === notificationId) {
        lastNotificationIdRef.current = notifications.filter((item) => item.id !== notificationId)[0]?.id ?? null;
      }
    } catch (error) {
      setNotificationActionError("We couldn't delete that notification. Please try again.");
    }
  };

  const clearAllNotifications = async () => {
    if (!window.confirm("Clear every notification visible to administrators? This permanently removes notifications for all accounts, not just the admin dashboard.")) return;
    try {
      setNotificationActionError("");
      await api.delete("/api/notifications/clear-all/", { withCredentials: true });
      setNotifications([]);
      lastNotificationIdRef.current = null;
    } catch (error) {
      setNotificationActionError("We couldn't clear notifications. Please try again.");
    }
  };

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

  const exportDashboardData = async (reportType) => {
    const csvCell = (value) => {
      const normalized = value == null
        ? ""
        : typeof value === "object"
          ? JSON.stringify(value)
          : String(value);
      // Prevent spreadsheet applications from treating exported text as formulas.
      const safeValue = /^[=+@\\-]/.test(normalized) ? `'${normalized}` : normalized;
      return '"' + safeValue.replace(/"/g, '""') + '"';
    };

    const getNairobiTimestamp = () => {
      const now = new Date();
      const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Africa/Nairobi",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).formatToParts(now);
      const dateParts = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
      const dateStamp = `${dateParts.year}-${dateParts.month}-${dateParts.day}`;
      const producedAt = new Intl.DateTimeFormat("en-KE", {
        timeZone: "Africa/Nairobi",
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
        timeZoneName: "short",
      }).format(now);
      return { dateStamp, producedAt };
    };

    const downloadCsv = (filename, reportTitle, headers, rows, producedAt, dateStamp) => {
      const reportRows = [
        ["MAA MARA MARKET"],
        ["Email", "hello@maamaramarket.com"],
        ["Location", "Nairobi, Kenya"],
        ["Report", reportTitle],
        ["Date produced (Africa/Nairobi)", producedAt],
        ["Report date (Africa/Nairobi)", dateStamp],
        [],
        [...headers, "Export generated at (Africa/Nairobi)"],
        ...rows.map((row) => [...row, producedAt]),
      ];
      const csv = reportRows.map((row) => row.map(csvCell).join(",")).join("\\r\\n");
      const blob = new Blob(["\\uFEFF", csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      anchor.style.display = "none";
      document.body.appendChild(anchor);
      try {
        anchor.click();
      } finally {
        anchor.remove();
        // Do not revoke the object URL synchronously; browsers may not have
        // started consuming it yet, especially on mobile.
        window.setTimeout(() => URL.revokeObjectURL(url), 1500);
      }
    };

    const listFromResponse = (data) =>
      Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : [];

    const fetchAllPages = async (initialUrl) => {
      const records = [];
      let nextUrl = initialUrl;
      let pageCount = 0;
      while (nextUrl && pageCount < 100) {
        const response = await api.get(nextUrl);
        const data = response.data;
        records.push(...listFromResponse(data));
        nextUrl = Array.isArray(data) ? null : (data?.next || null);
        pageCount += 1;
      }
      if (nextUrl) {
        throw new Error("The report contains more than 100 pages. Please narrow the report and try again.");
      }
      return records;
    };

    const { dateStamp, producedAt } = getNairobiTimestamp();
    setExportingKey(reportType);
    try {
      if (reportType === "summary") {
        const rows = [
          ["Total revenue (KES)", Number(analytics.total_revenue || transactionSummary.total_revenue || 0)],
          ["Total transactions", Number(transactionSummary.total_transactions || transactions.length || 0)],
          ["Total sales", Number(stats?.total_sales || 0)],
          ["Total orders", totalOrders],
          ["Completed orders", completedOrders],
          ["Vendor approval/request count", approvalRequestTotal],
          ["Unseen vendor requests", unseenVendorRequests],
          ["Unique visitors (last 30 days)", Number(trafficData.unique_visitors || 0)],
          ["Page views (last 30 days)", Number(trafficData.page_views || 0)],
          ["Total visits (last 30 days)", Number(trafficData.total_visits || 0)],
          ["Emails sent", Number(emailStats?.total || 0)],
          ["Email growth (%)", emailGrowth],
          ["Unseen job applications", jobsCount],
          ["Pending support messages", supportCount],
        ];
        downloadCsv(
          `maa-mara-dashboard-summary-${dateStamp}.csv`,
          "Dashboard summary",
          ["Metric", "Value"],
          rows,
          producedAt,
          dateStamp
        );
      } else if (reportType === "transactions") {
        const records = await fetchAllPages("/api/admin-transactions/");
        if (!records.length) throw new Error("No transaction records were returned for export.");
        downloadCsv(
          `maa-mara-payment-transactions-${dateStamp}.csv`,
          "Payment transactions",
          ["Transaction ID", "Reference", "Date", "Customer", "Email", "Amount (KES)", "Status", "Payment method"],
          records.map((item) => [
            item.id ?? "",
            item.txid ?? item.reference ?? item.transaction_reference ?? "",
            item.created_at ?? item.date ?? "",
            item.user?.username ?? item.username ?? "",
            item.payer_email ?? item.user?.email ?? "",
            item.amount ?? "",
            item.status ?? item.payment_status ?? "",
            item.payment_method ?? item.method ?? "",
          ]),
          producedAt,
          dateStamp
        );
      } else if (reportType === "emails") {
        const records = await fetchAllPages("/api/email/list/?status=all");
        if (!records.length) throw new Error("No email records were returned for export.");
        downloadCsv(
          `maa-mara-email-delivery-${dateStamp}.csv`,
          "Email delivery report",
          ["Email ID", "Recipient", "Subject", "Status", "Created", "Sent", "Message"],
          records.map((item) => [
            item.id ?? "",
            item.recipient ?? item.to ?? "",
            item.subject ?? "",
            item.status ?? "",
            item.created_at ?? "",
            item.sent_at ?? "",
            item.message ?? item.body ?? "",
          ]),
          producedAt,
          dateStamp
        );
      } else if (reportType === "vendors") {
        const [pendingRecords, verifiedRecords] = await Promise.all([
          fetchAllPages("/api/vendor/requests/?status=pending"),
          fetchAllPages("/api/vendor/requests?status=verified"),
        ]);
        const records = [
          ...pendingRecords.map((item) => ({ ...item, export_status: item.status || "pending" })),
          ...verifiedRecords.map((item) => ({ ...item, export_status: item.status || "verified" })),
        ];
        if (!records.length) throw new Error("No vendor approval requests were returned for export.");
        const uniqueRecords = [...new Map(
          records.map((item) => [item.id ?? item.request_id ?? JSON.stringify(item), item])
        ).values()];
        downloadCsv(
          `maa-mara-vendor-requests-${dateStamp}.csv`,
          "Vendor approval requests",
          ["Request ID", "Vendor", "Email", "Status", "Submitted", "Business name"],
          uniqueRecords.map((item) => [
            item.id ?? item.request_id ?? "",
            item.username ?? item.vendor_name ?? item.vendor?.username ?? item.name ?? "",
            item.email ?? item.vendor_email ?? item.vendor?.email ?? "",
            item.export_status ?? item.status ?? "",
            item.created_at ?? item.submitted_at ?? "",
            item.business_name ?? item.vendor_data?.business_name ?? "",
          ]),
          producedAt,
          dateStamp
        );
      } else {
        throw new Error("That report type is not supported.");
      }

      setExportMenuOpen(false);
      toast({
        title: "Export ready",
        description: "Your Maa Mara Market CSV spreadsheet has been prepared for download.",
        duration: 4000,
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description: error?.response?.data?.detail || error?.response?.data?.error || error?.message || "We couldn't prepare this report. Please try again.",
        duration: 6000,
      });
    } finally {
      setExportingKey("");
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
          <div className="relative">
            <button
              type="button"
              title="Export dashboard data"
              aria-haspopup="menu"
              aria-expanded={exportMenuOpen}
              onClick={() => setExportMenuOpen((open) => !open)}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-xs font-semibold text-foreground transition hover:bg-muted"
            >
              <IonIcon icon={downloadOutline} />
              {exportingKey ? "Exporting…" : "Export"}
            </button>
            {exportMenuOpen && (
              <div role="menu" aria-label="Dashboard export options" className="absolute left-0 right-auto z-30 mt-2 w-72 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-border bg-card p-1.5 shadow-xl">
                <p className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Download report</p>
                {[
                  ["summary", "Dashboard summary", "Revenue, orders, visitors and email totals"],
                  ["transactions", "Payment transactions", "Transaction references, amounts and statuses"],
                  ["emails", "Email delivery report", "Recipients, subjects, statuses and dates"],
                  ["vendors", "Vendor approval requests", "Vendor requests and their current statuses"],
                ].map(([key, label, description]) => (
                  <button
                    key={key}
                    type="button"
                    role="menuitem"
                    disabled={Boolean(exportingKey)}
                    onClick={() => { setExportMenuOpen(false); exportDashboardData(key); }}
                    className="flex w-full flex-col gap-1 rounded-xl px-3 py-2.5 text-left transition hover:bg-muted disabled:cursor-wait disabled:opacity-60"
                  >
                    <span className="text-sm font-semibold text-card-foreground">{label}</span>
                    <span className="text-xs leading-4 text-muted-foreground">{description}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
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
          value={approvalRequestTotal.toLocaleString()}
          detail={`${unseenVendorRequests.toLocaleString()} vendor requests • ${Math.round(Number(vendorProgress) * 100)}% progress`}
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

          {(selectedListView === "activities" && activityLogs.length > 0) || (selectedListView === "notifications" && notifications.length > 0) ? (
            <div className="mb-3 flex justify-end">
              {selectedListView === "activities" && activityLogs.length > 0 && (
                <button
                  type="button"
                  onClick={clearAllActivityLogs}
                  className="inline-flex items-center gap-1.5 rounded-full border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-200"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Clear all activities
                </button>
              )}
              {selectedListView === "notifications" && notifications.length > 0 && (
                <button
                  type="button"
                  onClick={clearAllNotifications}
                  className="inline-flex items-center gap-1.5 rounded-full border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-200"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Clear all notifications
                </button>
              )}
            </div>
          ) : null}

          {selectedListView === "activities" && activityActionError && (
            <p role="alert" className="mb-2 text-xs text-red-700">{activityActionError}</p>
          )}
          {selectedListView === "notifications" && notificationActionError && (
            <p role="alert" className="mb-2 text-xs text-red-700">{notificationActionError}</p>
          )}

          <div className="h-[300px] min-w-0 space-y-2 overflow-x-hidden overflow-y-auto pr-1">
            {selectedListView === "activities" &&
              (activityLogs.length ? activityLogs.map((log) => (
                <div key={log.id} className="flex items-start gap-3 rounded-xl bg-muted p-3 dark:bg-muted">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-card-foreground dark:text-card-foreground">{log.display_message || log.description}</p>
                    <p className="mt-1 text-[10px] text-muted-foreground">{new Date(log.timestamp).toLocaleString()}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => deleteActivityLog(log.id)}
                    aria-label="Delete activity"
                    title="Delete activity"
                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-red-200 text-red-700 transition hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-200"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              )) : <p className="p-4 text-sm text-muted-foreground">No administrator activity found.</p>)}

            {selectedListView === "notifications" &&
              (notifications.length ? notifications.map((note) => (
                <div key={note.id} className="flex items-start gap-2 rounded-xl bg-muted p-3 dark:bg-muted">
                  <button
                    type="button"
                    onClick={() => handleNotificationClick(note)}
                    className="min-w-0 flex-1 rounded-lg p-1 text-left hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-primary/20 dark:hover:bg-primary/100/10"
                  >
                    <div className="flex items-start gap-2">
                      <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${note.seen ? "bg-slate-300" : "bg-primary/100"}`} />
                      <div className="min-w-0">
                        <p className={`text-xs ${note.seen ? "text-foreground dark:text-muted-foreground" : "font-semibold text-card-foreground dark:text-card-foreground"}`}>{note.display_title || note.title || note.display_message || note.message}</p>
                        <p className="mt-1 text-[10px] text-muted-foreground">{new Date(note.created_at).toLocaleString()}</p>
                      </div>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteNotification(note.id)}
                    aria-label="Delete notification"
                    title="Delete notification"
                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-red-200 text-red-700 transition hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-200"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
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
