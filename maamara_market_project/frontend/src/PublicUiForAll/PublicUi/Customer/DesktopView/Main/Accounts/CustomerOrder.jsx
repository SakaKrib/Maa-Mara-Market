import React, { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Clock3, Download, Gift, Loader2, MapPin, ShoppingBag, Undo2, Wallet } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "../../../../../../../components/ui/card";
import { Badge } from "../../../../../../../components/ui/badge";
import { Button } from "../../../../../../../components/ui/button";
import RequestReturnForm from "../Return/Return";
import FormattedCurrency from "../Currency/FormattedCurrency";
import api from "../../../../../../Services/Api";
import { downloadFile } from "../../../../../../Services/DownloadFile";

const csvCell = (value) => {
  const text = value == null
    ? ""
    : typeof value === "object"
      ? JSON.stringify(value)
      : String(value);
  const safeText = /^[=+@-]/.test(text) ? `'${text}` : text;
  return '"' + safeText.replace(/"/g, '""') + '"';
};

const downloadOrderHistory = (orders, filename = null) => {
  const generatedAt = new Date().toLocaleString("en-KE", { timeZone: "Africa/Nairobi" });
  const rows = [
    [orders.length === 1 ? "MAA MARA MARKET — ORDER DETAILS" : "MAA MARA MARKET — CUSTOMER ORDER HISTORY"],
    ["Generated at (Africa/Nairobi)", generatedAt],
    [],
    ["Order ID", "Order date", "Order status", "Payment status", "Item ID", "Item", "Quantity", "Unit price (KES)", "Line total (KES)", "Order total (KES)"],
  ];

  orders.forEach((order) => {
    const items = Array.isArray(order.items) ? order.items : [];
    const paymentStatus = order.payment?.status || order.payment_status || "";
    if (!items.length) {
      rows.push([
        order.id ?? order.paypal_order_id ?? "",
        order.ordered_date ?? order.created_at ?? "",
        order.status ?? "",
        paymentStatus,
        "", "No item details returned", "", "", "",
        order.final_total ?? "",
      ]);
      return;
    }
    items.forEach((line) => {
      const product = line.product || line.item || {};
      const unitPrice = line.price_at_purchase ?? line.price ?? product.price ?? "";
      const quantity = Number(line.quantity) || 0;
      const lineTotal = line.final_price ?? line.total_item_price ?? (unitPrice !== "" ? Number(unitPrice) * quantity : "");
      rows.push([
        order.id ?? order.paypal_order_id ?? "",
        order.ordered_date ?? order.created_at ?? "",
        order.status ?? "",
        paymentStatus,
        line.id ?? product.id ?? "",
        product.name ?? line.item_name ?? line.name ?? "Product",
        line.quantity ?? "",
        unitPrice,
        lineTotal,
        order.final_total ?? "",
      ]);
    });
  });

  const csv = rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
  return downloadFile({
    filename: filename || `maa-mara-customer-order-history-${new Date().toISOString().slice(0, 10)}.csv`,
    content: "\uFEFF" + csv,
    mimeType: "text/csv;charset=utf-8;",
  });
};

const downloadSingleOrder = (order) => {
  if (!order) return;
  const orderNumber = order.id ?? order.paypal_order_id ?? "order";
  downloadOrderHistory([order], `maa-mara-order-${orderNumber}.csv`);
};

const normalizeStatus = (status) => String(status || "").trim().toUpperCase();

const IN_PROCESS_STATUSES = [
  "PAID",
  "PROCESSING",
  "PACKING",
  "READY_TO_SHIP",
  "SHIPPED",
  "IN_TRANSIT",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "AWAITING_CONFIRMATION",
];

const statusLabel = (status) =>
  String(status || "Processing")
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const CustomerOrdersDashboard = ({ wallet: walletProp, vouchers: vouchersProp, orders: ordersProp }) => {
  const navigate = useNavigate();
  const [selectedItem, setSelectedItem] = useState(null);
  const [accountData, setAccountData] = useState(null);
  const [loading, setLoading] = useState(true);

  const hasProvidedOrders = Array.isArray(ordersProp);
  const safeOrders = hasProvidedOrders
    ? ordersProp
    : Array.isArray(accountData?.orders)
      ? accountData.orders
      : [];
  const safeVouchers = Array.isArray(vouchersProp)
    ? vouchersProp
    : Array.isArray(accountData?.vouchers)
      ? accountData.vouchers
      : [];
  const wallet = walletProp ?? accountData?.wallet;

  useEffect(() => {
    if (hasProvidedOrders && walletProp !== undefined) {
      setLoading(false);
      return;
    }

    let active = true;

    const loadOrders = async () => {
      try {
        const response = await api.get("/api/user/account/", {
          withCredentials: true,
        });

        if (active && response.data?.success) {
          setAccountData(response.data);
        }
      } catch (error) {
        console.error("Error fetching customer orders:", error);
      } finally {
        if (active) setLoading(false);
      }
    };

    loadOrders();

    return () => {
      active = false;
    };
  }, [hasProvidedOrders, walletProp]);

  const pendingOrders = useMemo(
    () =>
      safeOrders.filter(
        (order) => ["PENDING_PAYMENT", "PENDING"].includes(normalizeStatus(order.status))
      ),
    [safeOrders]
  );

  const inProcessOrders = useMemo(
    () =>
      safeOrders.filter((order) =>
        IN_PROCESS_STATUSES.includes(normalizeStatus(order.status))
      ),
    [safeOrders]
  );

  const completedOrders = useMemo(
    () =>
      safeOrders.filter(
        (order) => normalizeStatus(order.status) === "COMPLETED"
      ),
    [safeOrders]
  );

  if (loading) {
    return (
      <section className="mm-page min-h-screen text-[#29251f]">
        <div className="mm-container flex min-h-[50vh] items-center justify-center px-4 py-8">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
            Loading your orders...
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="mm-page min-h-screen text-[#29251f]">
      <div className="mm-container px-4 py-8 sm:px-6 sm:py-10">
        <div className="space-y-6">
          <div className="flex flex-col gap-3 rounded-2xl border border-[#e5dfd4] bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-lg font-semibold">Your purchases</h1>
              <p className="text-sm text-muted-foreground">Download a CSV copy of your order history and purchased item details.</p>
            </div>
            <Button
              type="button"
              variant="outline"
              className="rounded-full"
              onClick={() => downloadOrderHistory(safeOrders)}
              disabled={safeOrders.length === 0}
            >
              <Download className="mr-2 h-4 w-4" aria-hidden="true" />
              Download order history
            </Button>
          </div>
          <Card className="overflow-hidden rounded-3xl border border-[#e5dfd4] text-[#29251f] shadow-sm">
            <CardContent className="p-6 sm:p-7">
              <div className="mb-2 flex items-center gap-3">
                <Wallet className="h-6 w-6 shrink-0" aria-hidden="true" />
                <span className="text-sm opacity-90">Wallet Balance</span>
              </div>
              <h2 className="text-2xl font-bold sm:text-3xl">
                <FormattedCurrency
                  value={wallet?.balance ?? wallet?.earned_coins ?? 0}
                />
              </h2>
              <p className="mt-2 text-xs opacity-80">
                Total Coins: {wallet?.earned_coins ?? 0}
              </p>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
            <Card className="rounded-2xl border-[#e5dfd4] bg-white shadow-sm">
              <CardContent className="p-4 text-center">
                <ShoppingBag className="mx-auto mb-2 h-5 w-5" aria-hidden="true" />
                <h3 className="text-2xl font-bold">{safeOrders.length}</h3>
                <p className="text-xs text-muted-foreground">Orders</p>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-[#e5dfd4] bg-white shadow-sm">
              <CardContent className="p-4 text-center">
                <Gift className="mx-auto mb-2 h-5 w-5" aria-hidden="true" />
                <h3 className="text-2xl font-bold">{safeVouchers.length}</h3>
                <p className="text-xs text-muted-foreground">Vouchers</p>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-[#e5dfd4] bg-white shadow-sm">
              <CardContent className="p-4 text-center">
                <Clock3 className="mx-auto mb-2 h-5 w-5" aria-hidden="true" />
                <h3 className="text-2xl font-bold">{inProcessOrders.length}</h3>
                <p className="text-xs text-muted-foreground">On Process</p>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-[#e5dfd4] bg-white shadow-sm">
              <CardContent className="p-4 text-center">
                <CheckCircle2 className="mx-auto mb-2 h-5 w-5" aria-hidden="true" />
                <h3 className="text-2xl font-bold">{completedOrders.length}</h3>
                <p className="text-xs text-muted-foreground">Completed</p>
              </CardContent>
            </Card>
          </div>

          <Card className="rounded-3xl border-[#e5dfd4] bg-white shadow-sm">
            <CardHeader className="p-5 pb-2">
              <CardTitle className="text-base">Pending Payment</CardTitle>
            </CardHeader>
            <CardContent className="p-5 pt-2">
              {pendingOrders.length > 0 ? (
                <div className="space-y-4">
                  {pendingOrders.map((order) => (
                    <div
                      key={order.id ?? order.paypal_order_id}
                      className="rounded-2xl border border-[#e5dfd4] bg-white p-4 shadow-sm"
                    >
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-[#e5dfd4] pb-3">
                        <span className="font-semibold">
                          #{order.id ?? order.paypal_order_id ?? "—"}
                        </span>
                        <div className="flex items-center gap-2">
                          <Button type="button" size="sm" variant="outline" className="rounded-full" onClick={() => downloadSingleOrder(order)}>
                            <Download className="mr-1.5 h-4 w-4" aria-hidden="true" />
                            Download
                          </Button>
                          <Badge className="border border-[#e5dfd4] bg-white text-yellow-700">
                            Pending Payment
                          </Badge>
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {(order.items || []).length} item(s)
                      </div>
                      <div className="mt-2 font-medium">
                        <FormattedCurrency value={order.final_total || 0} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No pending payments.</p>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-3xl border border-[#e5dfd4] bg-white shadow-sm">
            <CardHeader className="p-5 pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <MapPin className="h-4 w-4" aria-hidden="true" />
                Orders On Process
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Paid orders move through fulfillment here until they are completed.
              </p>
            </CardHeader>
            <CardContent className="p-5 pt-2">
              {inProcessOrders.length > 0 ? (
                <div className="space-y-4">
                  {inProcessOrders.map((order) => (
                    <div
                      key={order.id ?? order.paypal_order_id}
                      className="rounded-2xl border border-[#e5dfd4] bg-[#faf8f4] p-4 shadow-sm"
                    >
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-[#e5dfd4] pb-3">
                        <div>
                          <span className="font-semibold">
                            Order #{order.id ?? order.paypal_order_id ?? "—"}
                          </span>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {statusLabel(order.status)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button type="button" size="sm" variant="outline" className="rounded-full" onClick={() => downloadSingleOrder(order)}>
                            <Download className="mr-1.5 h-4 w-4" aria-hidden="true" />
                            Download
                          </Button>
                          <Badge className="border border-[#e5dfd4] bg-white text-blue-700">
                            {statusLabel(order.status)}
                          </Badge>
                        </div>
                      </div>

                      <div className="text-sm text-muted-foreground">
                        {(order.items || []).length} item(s)
                      </div>
                      <div className="mt-2 font-medium">
                        <FormattedCurrency value={order.final_total || 0} />
                      </div>

                      <div className="mt-4 flex justify-end">
                        <Button
                          size="sm"
                          onClick={() =>
                            navigate(
                              `/customer-order/track/${order.id}`
                            )
                          }
                        >
                          Track Order
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No orders are currently being processed.
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-[#e5dfd4] bg-white shadow-sm">
            <CardHeader className="p-5 pb-2">
              <CardTitle className="text-base">Completed Orders</CardTitle>
            </CardHeader>
            <CardContent className="p-5 pt-2">
              {completedOrders.length > 0 ? (
                <div className="space-y-4">
                  {completedOrders.map((order) => (
                    <div
                      key={order.id ?? order.paypal_order_id}
                      className="rounded-2xl border border-[#e5dfd4] bg-white p-4 shadow-sm"
                    >
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-[#e5dfd4] pb-3">
                        <span className="font-semibold">
                          #{order.id ?? order.paypal_order_id ?? "—"}
                        </span>
                        <div className="flex items-center gap-2">
                          <Button type="button" size="sm" variant="outline" className="rounded-full" onClick={() => downloadSingleOrder(order)}>
                            <Download className="mr-1.5 h-4 w-4" aria-hidden="true" />
                            Download
                          </Button>
                          <Badge className="border border-[#e5dfd4] bg-white text-green-700">
                            Completed
                          </Badge>
                        </div>
                      </div>

                      {(order.items || []).map((itemObj, index) => {
                        const product = itemObj.product || itemObj.item;
                        const itemKey = itemObj.id ?? product?.id ?? index;

                        return (
                          <div
                            key={itemKey}
                            className="flex flex-col gap-3 border-b py-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between"
                          >
                            <div>
                              <p className="font-medium">
                                {product?.name || itemObj.item_name || "Product"}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Qty: {itemObj.quantity ?? 0}
                              </p>
                            </div>

                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedItem(itemObj)}
                              className='rounded-full text-red-500'
                            >
                              <Undo2 className="mr-2 h-4 w-4" aria-hidden="true" />
                              Return
                            </Button>
                          </div>
                        );
                      })}

                      <div className="border-t pt-3 font-semibold">
                        Total: <FormattedCurrency value={order.final_total || 0} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No completed orders.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {selectedItem && (
        <RequestReturnForm
          open
          onClose={() => setSelectedItem(null)}
          selectedItem={selectedItem}
        />
      )}
    </section>
  );
};

export default CustomerOrdersDashboard;
