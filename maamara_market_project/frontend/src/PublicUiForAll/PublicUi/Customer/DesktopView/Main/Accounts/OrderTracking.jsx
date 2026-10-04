import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, Loader2, MapPin } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "../../../../../../../components/ui/card";
import { Badge } from "../../../../../../../components/ui/badge";
import { Button } from "../../../../../../../components/ui/button";
import FormattedCurrency from "../Currency/FormattedCurrency";
import api from "../../../../../../Services/Api";

const TRACKING_STEPS = [
  "PAID",
  "PROCESSING",
  "PACKING",
  "READY_TO_SHIP",
  "SHIPPED",
  "IN_TRANSIT",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "AWAITING_CONFIRMATION",
  "COMPLETED",
];

const normalizeStatus = (status) => String(status || "").trim().toUpperCase();

const statusLabel = (status) =>
  String(status || "Processing")
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

export default function OrderTracking() {
  const navigate = useNavigate();
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const loadOrder = async () => {
      try {
        const response = await api.get("/api/user/account/", {
          withCredentials: true,
        });

        const orders = Array.isArray(response.data?.orders)
          ? response.data.orders
          : [];
        const found = orders.find(
          (candidate) => String(candidate?.id) === String(orderId)
        );

        if (active) setOrder(found || null);
      } catch (error) {
        console.error("Error fetching order tracking data:", error);
        if (active) setOrder(null);
      } finally {
        if (active) setLoading(false);
      }
    };

    loadOrder();

    return () => {
      active = false;
    };
  }, [orderId]);

  const currentStatus = normalizeStatus(order?.status);
  const currentIndex = useMemo(
    () => TRACKING_STEPS.indexOf(currentStatus),
    [currentStatus]
  );

  if (loading) {
    return (
      <section className="mm-page min-h-screen">
        <div className="mm-container flex min-h-[50vh] items-center justify-center">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
            Loading order tracking...
          </div>
        </div>
      </section>
    );
  }

  if (!order) {
    return (
      <section className="mm-page min-h-screen">
        <div className="mm-container px-4 py-8 sm:px-6">
          <Card className="mx-auto max-w-2xl rounded-3xl border-[#e5dfd4] bg-white shadow-sm">
            <CardContent className="space-y-4 p-6 text-center">
              <h1 className="text-xl font-bold">Order not found</h1>
              <p className="text-sm text-muted-foreground">
                This order is not available in your account.
              </p>
              <Button variant="outline" onClick={() => navigate("/customer-order")}>
                Back to Orders
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>
    );
  }

  return (
    <section className="mm-page min-h-screen text-[#29251f]">
      <div className="mm-container px-4 py-8 sm:px-6 sm:py-10">
        <div className="mx-auto max-w-4xl space-y-6">
          <Button
            variant="ghost"
            className="px-0"
            onClick={() => navigate("/customer-order")}
          >
            <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
            Back to Orders
          </Button>

          <Card className="rounded-3xl border-[#e5dfd4] bg-white shadow-sm">
            <CardHeader className="p-6 pb-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Order Tracking
                  </p>
                  <CardTitle className="mt-1 text-2xl">
                    Order #{order.id}
                  </CardTitle>
                </div>
                <Badge className="border border-[#e5dfd4] bg-white text-blue-700">
                  {statusLabel(currentStatus)}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="p-6 pt-3">
              <div className="mb-6 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-[#faf8f4] p-4">
                  <p className="text-xs text-muted-foreground">Items</p>
                  <p className="mt-1 font-semibold">
                    {(order.items || []).length} item(s)
                  </p>
                </div>
                <div className="rounded-2xl bg-[#faf8f4] p-4">
                  <p className="text-xs text-muted-foreground">Order total</p>
                  <p className="mt-1 font-semibold">
                    <FormattedCurrency value={order.final_total || 0} />
                  </p>
                </div>
              </div>

              {currentStatus === "PENDING_PAYMENT" ? (
                <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                  Payment for this order is still pending. Tracking will begin once payment is confirmed.
                </div>
              ) : (
                <div className="space-y-5">
                  {TRACKING_STEPS.map((step, index) => {
                    const completed = currentIndex >= index;
                    const current = currentIndex === index;

                    return (
                      <div key={step} className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <span
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border ${
                              completed
                                ? "border-green-200 bg-green-50 text-green-700"
                                : "border-[#e5dfd4] bg-white text-gray-400"
                            }`}
                          >
                            {completed ? (
                              <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                            ) : (
                              <MapPin className="h-4 w-4" aria-hidden="true" />
                            )}
                          </span>
                          {index < TRACKING_STEPS.length - 1 && (
                            <span
                              className={`mt-1 min-h-7 w-px ${
                                currentIndex > index ? "bg-green-300" : "bg-[#e5dfd4]"
                              }`}
                            />
                          )}
                        </div>

                        <div className="pb-4">
                          <p className={`font-semibold ${current ? "text-blue-700" : "text-gray-800"}`}>
                            {statusLabel(step)}
                          </p>
                          {current && (
                            <p className="mt-1 text-sm text-muted-foreground">
                              Your order is currently at this stage.
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
