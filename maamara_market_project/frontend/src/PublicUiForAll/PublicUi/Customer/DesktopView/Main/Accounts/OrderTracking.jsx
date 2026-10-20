import React, { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "../../../../../../../components/ui/card";
import { Button } from "../../../../../../../components/ui/button";
import api from "../../../../../../Services/Api";
import FulfillmentTrackingPanel from "../../../../../../cmponents/Hooks/Order/FulfillmentTrackingPanel";

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
  const updateTrackingStatus = useCallback((status) => {
    setOrder((current) => (
      current && current.status !== status ? { ...current, status } : current
    ));
  }, []);

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
                <span className="inline-flex rounded-full border border-[#e5dfd4] bg-white px-3 py-1 text-sm font-semibold text-blue-700">
                  {statusLabel(currentStatus)}
                </span>
              </div>
            </CardHeader>

            <CardContent className="p-6 pt-3">
              <FulfillmentTrackingPanel orderId={orderId} onOrderStatusChange={updateTrackingStatus} />
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
