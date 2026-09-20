import React, { useMemo, useState } from "react";
import { CheckCircle2, Clock3, Gift, ShoppingBag, Undo2, Wallet } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../../../../../../../components/ui/card";
import { Badge } from "../../../../../../../components/ui/badge";
import { Button } from "../../../../../../../components/ui/button";
import RequestReturnForm from "../Return/Return";
import FormattedCurrency from "../Currency/FormattedCurrency";

const normalizeStatus = (status) => String(status || "").trim().toUpperCase();

const CustomerOrdersDashboard = ({ wallet, vouchers = [], orders = [] }) => {
  const [selectedItem, setSelectedItem] = useState(null);

  const safeOrders = Array.isArray(orders) ? orders : [];
  const safeVouchers = Array.isArray(vouchers) ? vouchers : [];

  const pendingOrders = useMemo(
    () =>
      safeOrders.filter((order) =>
        ["PENDING_PAYMENT", "PROCESSING", "PACKING", "READY_TO_SHIP"].includes(
          normalizeStatus(order.status)
        )
      ),
    [safeOrders]
  );

  const completedOrders = useMemo(
    () =>
      safeOrders.filter((order) =>
        [
          "PAID",
          "COMPLETED",
          "DELIVERED",
          "SHIPPED",
          "IN_TRANSIT",
          "OUT_FOR_DELIVERY",
          "AWAITING_CONFIRMATION",
        ].includes(normalizeStatus(order.status))
      ),
    [safeOrders]
  );

  return (
    <section className="mm-page min-h-screen bg-[#faf8f4] text-[#29251f]">
      <div className="mm-container px-4 py-8 sm:px-6 sm:py-10">
        <div className="space-y-6">
          <Card className="overflow-hidden rounded-3xl border border-[#e5dfd4] bg-[#f6f2ea] text-[#29251f] shadow-[0_10px_35px_rgba(54,45,32,0.08)]">
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
                <h3 className="text-2xl font-bold">{pendingOrders.length}</h3>
                <p className="text-xs text-muted-foreground">Pending</p>
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
              <CardTitle className="flex items-center gap-2 text-base">
                <Gift className="h-4 w-4" aria-hidden="true" />
                Active Vouchers
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 pt-2">
              {safeVouchers.length > 0 ? (
                <div className="space-y-3">
                  {safeVouchers.map((voucher) => (
                    <div
                      key={voucher.id ?? voucher.code}
                      className="flex flex-col gap-2 rounded-2xl border border-[#e5dfd4] bg-[#faf8f4] p-4 shadow-sm transition-shadow hover:shadow-md sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="font-mono font-semibold">{voucher.code}</p>
                        <p className="text-sm text-muted-foreground">
                          {voucher.discount_value}
                          {voucher.discount_type === "percent" ? "%" : " KES"} OFF
                        </p>
                      </div>
                      <Badge>Active</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No active vouchers</p>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-[#e5dfd4] bg-white shadow-sm">
            <CardHeader className="p-5 pb-2">
              <CardTitle className="text-base">Pending Orders</CardTitle>
            </CardHeader>
            <CardContent className="p-5 pt-2">
              {pendingOrders.length > 0 ? (
                <div className="space-y-4">
                  {pendingOrders.map((order) => (
                    <div key={order.id ?? order.paypal_order_id} className="rounded-2xl border border-[#e5dfd4] bg-[#faf8f4] p-4 shadow-sm transition-shadow hover:shadow-md">
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-[#e5dfd4] pb-3">
                        <span className="font-semibold">
                          #{order.id ?? order.paypal_order_id ?? "—"}
                        </span>
                        <Badge className="bg-yellow-100 text-yellow-700">
                          {order.status || "Pending"}
                        </Badge>
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
                <p className="text-sm text-muted-foreground">No pending orders.</p>
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
                    <div key={order.id ?? order.paypal_order_id} className="rounded-2xl border border-[#e5dfd4] bg-[#faf8f4] p-4 shadow-sm transition-shadow hover:shadow-md">
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-[#e5dfd4] pb-3">
                        <span className="font-semibold">
                          #{order.id ?? order.paypal_order_id ?? "—"}
                        </span>
                        <Badge className="bg-green-100 text-green-700">Completed</Badge>
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
                              <p className="font-medium">{product?.name || "Product"}</p>
                              <p className="text-xs text-muted-foreground">
                                Qty: {itemObj.quantity ?? 0}
                              </p>
                            </div>

                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedItem(itemObj)}
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
