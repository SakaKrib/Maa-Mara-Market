import { IonIcon } from "@ionic/react";
import {
  cashOutline,
  refreshOutline,
  walletOutline,
  checkmarkCircleOutline,
  timeOutline,
  arrowForwardOutline,
} from "ionicons/icons";
import { useGenerateMonthlyPayouts } from "../../Hooks/Payouts/GeneratePayoutHook";
import { useNavigate } from "react-router-dom";

const METHOD_LABELS = {
  MOBILE_MONEY: "M-Pesa",
  PAYPAL: "PayPal",
  BANK_TRANSFER: "Bank transfer",
};

const METHOD_ICONS = {
  MOBILE_MONEY: cashOutline,
  PAYPAL: walletOutline,
  BANK_TRANSFER: walletOutline,
};

export default function AdminPayoutTriggerPayment() {
  const { data, loading, error, generateMonthlyPayouts } = useGenerateMonthlyPayouts();
  const navigate = useNavigate();

  const groupedPayouts = data?.generated || {};
  const groups = Object.entries(groupedPayouts);
  const totalPayouts = groups.reduce((sum, [, payouts]) => sum + payouts.length, 0);
  const totalAmount = groups.reduce(
    (sum, [, payouts]) => sum + payouts.reduce((groupSum, payout) => groupSum + Number(payout.amount || 0), 0),
    0
  );

  const handlePayVendor = (payout) => {
    const vendor = payout.vendor_details || payout.vendor || {};
    const { payment_method, reference, amount } = payout;
    const phone = vendor.MpesaNo || vendor.mpesa_no || "";

    if (payment_method === "MOBILE_MONEY") {
      navigate("mpesa-payment/single-vendor", { state: { reference, amount, vendor, phone } });
    } else if (payment_method === "PAYPAL") {
      navigate("paypal-payment/single-vendor", { state: { reference, amount, vendor } });
    } else if (payment_method === "BANK_TRANSFER") {
      navigate("bank-transfer-payment-group", {
        state: {
          paymentMethod: payment_method,
          payments: [{ vendor, amount, reference }],
        },
      });
    }
  };

  const handlePayGroup = (paymentMethod, payouts) => {
    const payments = payouts.map((payout) => {
      const vendor = payout.vendor_details || payout.vendor || {};
      return {
        vendor,
        phone: vendor.MpesaNo || vendor.mpesa_no || "",
        amount: payout.amount,
        reference: payout.reference,
      };
    });

    if (paymentMethod === "MOBILE_MONEY") {
      navigate("mpesa-payment-group", { state: { paymentMethod, payments } });
    } else if (paymentMethod === "PAYPAL") {
      navigate("paypal-payment-group", { state: { paymentMethod, payments } });
    } else if (paymentMethod === "BANK_TRANSFER") {
      navigate("bank-transfer-payment-group", { state: { paymentMethod, payments } });
    }
  };

  return (
    <section className="min-w-0 space-y-5 p-2 sm:p-4 lg:p-6">
      <header className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <IonIcon icon={cashOutline} className="text-xl" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Vendor payments
              </p>
              <h1 className="mt-1 text-xl font-bold tracking-tight text-card-foreground sm:text-2xl">
                Generate &amp; Review Monthly Payouts
              </h1>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
                Generate the current payout period, review vendors and payment methods, then submit payments securely.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={generateMonthlyPayouts}
            disabled={loading}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50 lg:w-auto"
          >
            {loading ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
                Generating…
              </>
            ) : (
              <>
                <IonIcon icon={cashOutline} />
                Generate Payouts
              </>
            )}
          </button>
        </div>
      </header>

      {(error) && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {data && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <article className="rounded-2xl border border-border bg-card p-4 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Period</p>
              <p className="mt-1 truncate text-sm font-bold text-card-foreground">{data.period || "Current period"}</p>
            </article>
            <article className="rounded-2xl border border-border bg-card p-4 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Vendors</p>
              <p className="mt-1 text-2xl font-bold text-card-foreground">{totalPayouts.toLocaleString()}</p>
            </article>
            <article className="col-span-2 rounded-2xl border border-border bg-card p-4 shadow-sm sm:col-span-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total value</p>
              <p className="mt-1 text-xl font-bold text-card-foreground">
                KES {totalAmount.toLocaleString("en-KE", { minimumFractionDigits: 2 })}
              </p>
            </article>
          </div>

          {!groups.length ? (
            <section className="rounded-2xl border border-border bg-card p-8 text-center shadow-sm sm:p-12">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                <IonIcon icon={cashOutline} className="text-xl" />
              </div>
              <h2 className="mt-3 text-base font-semibold text-card-foreground">No payouts generated yet</h2>
              <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-muted-foreground">
                Generate the current monthly payout period to review vendor payment records here.
              </p>
            </section>
          ) : (
            <section className="space-y-4">
              {groups.map(([method, payouts]) => (
                <article key={method} className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                  <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-card-foreground">
                        <IonIcon icon={METHOD_ICONS[method] || walletOutline} />
                      </div>
                      <div>
                        <h2 className="text-base font-bold text-card-foreground">{METHOD_LABELS[method] || method.replaceAll("_", " ")}</h2>
                        <p className="text-xs text-muted-foreground">{payouts.length} vendor payment{payouts.length === 1 ? "" : "s"}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handlePayGroup(method, payouts)}
                      className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 py-2 text-xs font-semibold text-foreground transition hover:bg-muted sm:w-auto"
                    >
                      Pay all
                      <IonIcon icon={arrowForwardOutline} />
                    </button>
                  </div>

                  <div className="divide-y divide-border">
                    {payouts.map((payout) => {
                      const vendor = payout.vendor_details || payout.vendor || {};
                      const paid = Boolean(payout.payout_status);
                      return (
                        <div key={payout.reference} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="truncate text-sm font-semibold text-card-foreground">
                                {vendor.company_name || vendor.name || "Unknown vendor"}
                              </p>
                              {paid ? (
                                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-1 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
                                  <IonIcon icon={checkmarkCircleOutline} />
                                  Paid
                                </span>
                              ) : (
                                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-500/10 px-2 py-1 text-[10px] font-semibold text-amber-700 dark:text-amber-300">
                                  <IonIcon icon={timeOutline} />
                                  Review
                                </span>
                              )}
                            </div>
                            <p className="mt-1 truncate text-xs text-muted-foreground">
                              {vendor.email || vendor.company_email || "No vendor email"}
                            </p>
                            <p className="mt-1 text-[10px] text-muted-foreground">{payout.reference || "No reference"}</p>
                          </div>

                          <div className="flex items-center justify-between gap-3 sm:justify-end">
                            <p className="text-sm font-bold text-card-foreground">
                              KES {Number(payout.amount || 0).toLocaleString("en-KE", { minimumFractionDigits: 2 })}
                            </p>
                            <button
                              type="button"
                              disabled={paid}
                              onClick={() => handlePayVendor(payout)}
                              className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {paid ? "Paid" : "Review & pay"}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </article>
              ))}
            </section>
          )}
        </>
      )}
    </section>
  );
}
