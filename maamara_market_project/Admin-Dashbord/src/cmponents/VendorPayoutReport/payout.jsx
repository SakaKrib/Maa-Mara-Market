import { useCallback, useEffect, useMemo, useState } from "react";
import { IonIcon } from "@ionic/react";
import {
  alertCircleOutline,
  cardOutline,
  checkmarkCircleOutline,
  cashOutline,
  phonePortraitOutline,
  refreshOutline,
  timeOutline,
  walletOutline,
} from "ionicons/icons";
import api from "../../Services/Api";
import { useGenerateMonthlyPayouts } from "../Hooks/Payouts/GeneratePayoutHook";

const METHOD_META = {
  MOBILE_MONEY: {
    label: "M-Pesa",
    icon: phonePortraitOutline,
    iconClass: "bg-green-500/10 text-green-600 dark:text-green-300",
  },
  BANK_TRANSFER: {
    label: "Bank",
    icon: cardOutline,
    iconClass: "bg-primary/10 text-primary",
  },
  PAYPAL: {
    label: "PayPal",
    icon: walletOutline,
    iconClass: "bg-blue-500/10 text-blue-600 dark:text-blue-300",
  },
};

const getMethodMeta = (method) =>
  METHOD_META[String(method || "").toUpperCase()] || {
    label: "Unavailable",
    icon: walletOutline,
    iconClass: "bg-muted text-muted-foreground",
  };

const getVendorName = (payout) => {
  const vendor = payout?.vendor || {};
  return (
    payout?.vendor_name ||
    vendor.company_name ||
    [vendor.first_name, vendor.surname_name]
      .filter(Boolean)
      .join(" ")
      .trim() ||
    "Unnamed vendor"
  );
};

const getProviderStatus = (payout) => {
  if (payout?.paid) return "Completed";

  const method = String(payout?.vendor?.payment_method || "").toUpperCase();

  if (
    method === "MOBILE_MONEY" &&
    (payout?.mpesa_conversation_id || payout?.mpesa_originator_conversation_id)
  ) {
    return "Processing";
  }

  if (
    method === "BANK_TRANSFER" &&
    payout?.kcb_transaction_reference
  ) {
    return payout?.kcb_provider_status || "Processing";
  }

  if (
    method === "PAYPAL" &&
    (payout?.paypal_batch_id || payout?.paypal_payout_item_id)
  ) {
    return payout?.paypal_transaction_status || "Processing";
  }

  return "Pending";
};

const statusMeta = (status) => {
  const normalized = String(status || "").toUpperCase();

  if (normalized === "COMPLETED" || normalized === "SUCCESS") {
    return {
      icon: checkmarkCircleOutline,
      className:
        "bg-green-500/10 text-green-700 dark:text-green-300 border-green-500/20",
    };
  }

  if (
    normalized === "PROCESSING" ||
    normalized === "PENDING" ||
    normalized === "SUBMITTED"
  ) {
    return {
      icon: timeOutline,
      className:
        "bg-yellow-500/10 text-yellow-700 dark:text-yellow-300 border-yellow-500/20",
    };
  }

  return {
    icon: alertCircleOutline,
    className:
      "bg-destructive/10 text-destructive border-destructive/20",
  };
};

const formatKES = (value) =>
  new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    minimumFractionDigits: 2,
  }).format(Number(value || 0));

const formatPeriod = (start, end) => {
  if (!start) return "Period unavailable";

  const startDate = new Date(start);
  const endDate = end ? new Date(end) : null;

  if (Number.isNaN(startDate.getTime())) return "Period unavailable";

  const month = startDate.toLocaleDateString("en-KE", {
    month: "long",
    year: "numeric",
  });

  return endDate && !Number.isNaN(endDate.getTime())
    ? `${month} · ${start} → ${end}`
    : month;
};

const PayoutStatusBadge = ({ payout }) => {
  const status = getProviderStatus(payout);
  const meta = statusMeta(status);

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${meta.className}`}
    >
      <IonIcon icon={meta.icon} />
      {status}
    </span>
  );
};

const PaymentMethodBadge = ({ method }) => {
  const meta = getMethodMeta(method);

  return (
    <span className="inline-flex items-center gap-2 text-xs font-semibold text-card-foreground">
      <span
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${meta.iconClass}`}
      >
        <IonIcon icon={meta.icon} />
      </span>
      <span>{meta.label}</span>
    </span>
  );
};

const PayoutAction = ({ payout, processingReference, onPay }) => {
  const status = getProviderStatus(payout);
  const method = String(payout?.vendor?.payment_method || "").toUpperCase();
  const meta = getMethodMeta(method);
  const busy = processingReference === payout.reference;
  const disabled =
    busy ||
    status === "Completed" ||
    status === "Processing" ||
    !payout.reference ||
    !METHOD_META[method];

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onPay(payout)}
      className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
    >
      {busy ? (
        <>
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
          Processing
        </>
      ) : status === "Completed" ? (
        "Paid"
      ) : status === "Processing" ? (
        "Awaiting confirmation"
      ) : (
        `Pay via ${meta.label}`
      )}
    </button>
  );
};

export default function VendorReport() {
  const [report, setReport] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingReference, setProcessingReference] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [noticeType, setNoticeType] = useState("success");
  const [filter, setFilter] = useState("all");

  const {
    data: generatedData,
    loading: generating,
    error: generationError,
    generateMonthlyPayouts,
  } = useGenerateMonthlyPayouts();

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("/api/admin-payouts/");
      const payouts = Array.isArray(response.data)
        ? response.data
        : response.data?.results || [];

      setReport(payouts);
    } catch (requestError) {
      console.error("Error fetching payout report:", requestError);
      setError(
        requestError.response?.data?.detail ||
          "Unable to load vendor payments."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  useEffect(() => {
    if (generationError) {
      setNotice(generationError);
      setNoticeType("error");
    }
  }, [generationError]);

  const handleGeneratePayments = async () => {
    setNotice("");
    const result = await generateMonthlyPayouts();

    if (result?.success) {
      await fetchReport();

      const count = Number(result?.data?.generated_count || 0);
      setNotice(
        count
          ? `${count} vendor payment${count === 1 ? "" : "s"} generated. Review the payment methods below before paying.`
          : "Payments generated. Review the payment list below before paying."
      );
      setNoticeType("success");
    }
  };

  const handlePayVendor = async (payout) => {
    if (!payout?.reference) return;

    const method = String(payout?.vendor?.payment_method || "").toUpperCase();
    if (!METHOD_META[method]) {
      setNotice("This vendor does not have a supported payment method configured.");
      setNoticeType("error");
      return;
    }

    const vendorName = getVendorName(payout);
    const confirmed = window.confirm(
      `Submit ${formatKES(payout.amount)} to ${vendorName} via ${getMethodMeta(method).label}? The provider must confirm settlement before the payment is marked completed.`
    );

    if (!confirmed) return;

    setProcessingReference(payout.reference);
    setNotice("");

    try {
      const response = await api.post(
        `/api/vendor/payout/${encodeURIComponent(payout.reference)}/pay/`
      );

      setNotice(
        response.data?.message ||
          `Payment submitted for ${vendorName}. Awaiting provider confirmation.`
      );
      setNoticeType("success");
      await fetchReport();
    } catch (requestError) {
      const message =
        requestError.response?.data?.error ||
        requestError.response?.data?.detail ||
        `Payment submission failed for ${vendorName}.`;

      console.error("Vendor payment submission failed:", requestError);
      setNotice(message);
      setNoticeType("error");
    } finally {
      setProcessingReference(null);
    }
  };

  const visiblePayouts = useMemo(() => {
    const sorted = [...report].sort((a, b) => {
      const aTime = new Date(a.payout_period_start || a.created_at || 0).getTime();
      const bTime = new Date(b.payout_period_start || b.created_at || 0).getTime();
      return bTime - aTime;
    });

    if (filter === "pending") {
      return sorted.filter((payout) => getProviderStatus(payout) === "Pending");
    }

    if (filter === "processing") {
      return sorted.filter((payout) => getProviderStatus(payout) === "Processing");
    }

    if (filter === "completed") {
      return sorted.filter((payout) => getProviderStatus(payout) === "Completed");
    }

    return sorted;
  }, [report, filter]);

  const summary = useMemo(() => {
    return {
      total: report.length,
      pending: report.filter((payout) => getProviderStatus(payout) === "Pending").length,
      processing: report.filter((payout) => getProviderStatus(payout) === "Processing").length,
      completed: report.filter((payout) => getProviderStatus(payout) === "Completed").length,
    };
  }, [report]);

  return (
    <section className="min-w-0 space-y-5 p-2 sm:p-4">
      <header className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <IonIcon icon={cashOutline} className="text-xl" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold text-card-foreground sm:text-2xl">
              Vendor Payments
            </h1>
            <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
              Generate vendor payments, review the configured payment method, and submit each payment securely.
            </p>
          </div>
        </div>

        <div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto">
          <button
            type="button"
            onClick={fetchReport}
            disabled={loading || generating}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-semibold text-card-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            <IonIcon icon={refreshOutline} />
            Refresh
          </button>

          <button
            type="button"
            onClick={handleGeneratePayments}
            disabled={generating || loading}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            {generating ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
                Generating…
              </>
            ) : (
              <>
                <IonIcon icon={cashOutline} />
                Generate Payments
              </>
            )}
          </button>
        </div>
      </header>

      {notice && (
        <div
          className={`rounded-xl border p-3 text-sm ${
            noticeType === "error"
              ? "border-destructive/30 bg-destructive/5 text-destructive"
              : "border-green-500/20 bg-green-500/5 text-green-700 dark:text-green-300"
          }`}
        >
          {notice}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["Total", summary.total, "bg-primary/10 text-primary"],
          ["Pending", summary.pending, "bg-yellow-500/10 text-yellow-700 dark:text-yellow-300"],
          ["Processing", summary.processing, "bg-blue-500/10 text-blue-700 dark:text-blue-300"],
          ["Completed", summary.completed, "bg-green-500/10 text-green-700 dark:text-green-300"],
        ].map(([label, value, tone]) => (
          <article key={label} className="rounded-2xl border border-border bg-card p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              {label}
            </p>
            <p className={`mt-1 text-2xl font-bold ${tone.split(" ").slice(1).join(" ")}`}>
              {value.toLocaleString()}
            </p>
          </article>
        ))}
      </div>

      <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div>
            <h2 className="text-base font-bold text-card-foreground sm:text-lg">
              Generated vendor payments
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Payment method and amount come from the vendor and payout records on the server.
            </p>
          </div>

          <select
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            className="min-h-10 rounded-xl border border-border bg-background px-3 text-xs font-semibold text-foreground outline-none focus:ring-2 focus:ring-primary/30"
            aria-label="Filter vendor payments"
          >
            <option value="all">All payments</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="completed">Completed</option>
          </select>
        </div>

        {loading ? (
          <div className="space-y-3 p-4 sm:p-5">
            {[1, 2, 3].map((item) => (
              <div key={item} className="h-24 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        ) : visiblePayouts.length === 0 ? (
          <div className="p-8 text-center sm:p-12">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
              <IonIcon icon={cashOutline} className="text-xl" />
            </div>
            <h3 className="mt-3 text-sm font-semibold text-card-foreground">
              No vendor payments to display
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Use Generate Payments to create the current payout-period records.
            </p>
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full min-w-[980px] text-left">
                <thead className="border-b border-border bg-background">
                  <tr className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    <th className="px-5 py-3">Vendor</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">Method</th>
                    <th className="px-4 py-3">Period</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-5 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {visiblePayouts.map((payout) => (
                    <tr key={payout.reference || payout.id} className="transition hover:bg-muted/40">
                      <td className="px-5 py-4">
                        <p className="truncate text-sm font-semibold text-card-foreground">
                          {getVendorName(payout)}
                        </p>
                        <p className="mt-1 truncate text-xs text-muted-foreground">
                          {payout.vendor?.email || payout.vendor_email || "No email"}
                        </p>
                        <p className="mt-1 text-[10px] text-muted-foreground">
                          {payout.reference || "No reference"}
                        </p>
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-sm font-bold text-card-foreground">
                        {formatKES(payout.amount)}
                      </td>
                      <td className="px-4 py-4">
                        <PaymentMethodBadge method={payout.vendor?.payment_method} />
                      </td>
                      <td className="px-4 py-4 text-xs text-muted-foreground">
                        {formatPeriod(payout.payout_period_start, payout.payout_period_end)}
                      </td>
                      <td className="px-4 py-4">
                        <PayoutStatusBadge payout={payout} />
                      </td>
                      <td className="px-5 py-4 text-right">
                        <PayoutAction
                          payout={payout}
                          processingReference={processingReference}
                          onPay={handlePayVendor}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="space-y-3 p-3 lg:hidden">
              {visiblePayouts.map((payout) => (
                <article
                  key={payout.reference || payout.id}
                  className="rounded-2xl border border-border bg-background p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-bold text-card-foreground">
                        {getVendorName(payout)}
                      </h3>
                      <p className="mt-1 truncate text-xs text-muted-foreground">
                        {payout.vendor?.email || payout.vendor_email || "No email"}
                      </p>
                    </div>
                    <PayoutStatusBadge payout={payout} />
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-3">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                        Amount
                      </p>
                      <p className="mt-1 text-sm font-bold text-card-foreground">
                        {formatKES(payout.amount)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                        Method
                      </p>
                      <div className="mt-1">
                        <PaymentMethodBadge method={payout.vendor?.payment_method} />
                      </div>
                    </div>
                    <div className="col-span-2">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                        Period
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatPeriod(payout.payout_period_start, payout.payout_period_end)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 border-t border-border pt-3">
                    <PayoutAction
                      payout={payout}
                      processingReference={processingReference}
                      onPay={handlePayVendor}
                    />
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </section>

      {generatedData?.period && (
        <p className="px-1 text-[11px] text-muted-foreground">
          Last generated period: {generatedData.period}
        </p>
      )}
    </section>
  );
}
