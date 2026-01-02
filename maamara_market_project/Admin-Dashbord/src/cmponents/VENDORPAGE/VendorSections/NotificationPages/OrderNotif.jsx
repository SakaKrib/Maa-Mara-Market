import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useTheme } from "@mui/material";
import { tokens } from "../../../../theme";
import Header from "../../../../Header/Header";
import api from "../../../../Services/Api";
import { baseUrl } from "../../../Constant/Constant";

const VendorOrderDetail = () => {
  const { id } = useParams();
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    const fetchOrder = async () => {
      try {
        const res = await api.get(`${baseUrl}/api/orders-vendor/${id}/`, {
          withCredentials: true,
        });
        setOrder(res.data);
      } catch (err) {
        console.error("Failed to load order:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [id]);

  if (loading) return <p className="p-4">Loading order...</p>;
  if (!order) return <p className="p-4">Order not found.</p>;

  return (
    <div
      className="flex gap-2 p-2 w-full flex-wrap flex-col lg:flex-row"
      style={{ maxHeight: "165vh", overflowY: "auto" }}
    >
      {/* LEFT SIDE */}
      <div className="flex flex-col gap-6 lg:w-[49%] md:w-[50%] sm:w-full">
        <Header title="Vendor Order Details" subtitle={`Order #${order.id}`} />

        <div
          className="p-4 rounded-md"
          style={{ backgroundColor: colors.primary[600], color: colors.gray[100] }}
        >
          <h2 className="text-xl font-semibold mb-4">Order Summary</h2>
          <p><strong>Customer:</strong> {order.customer_name || "N/A"}</p>
          <p><strong>Status:</strong> {order.status}</p>
          <p><strong>Total Price:</strong> KES {order.total_price}</p>
          <p><strong>Ordered At:</strong> {new Date(order.created_at).toLocaleString()}</p>
        </div>

        <div
          className="p-4 rounded-md mt-6"
          style={{ backgroundColor: colors.primary[700], color: colors.gray[100] }}
        >
          <h2 className="text-lg font-semibold mb-3">Items in Order</h2>
          {order.items && order.items.length > 0 ? (
            order.items.map((orderItem) => (
              <div
                key={orderItem.id}
                className="mb-3 p-3 rounded-md"
                style={{ backgroundColor: colors.primary[500] }}
              >
                <h3 className="text-md font-semibold">{orderItem.item.name}</h3>
                <p>Quantity: {orderItem.quantity}</p>
                <p>Price: KES {orderItem.item.price}</p>
                <p>Vendor: {orderItem.item.vendor?.company_name || "Unknown"}</p>
              </div>
            ))
          ) : (
            <p>No items found in this order.</p>
          )}
        </div>
      </div>

      {/* RIGHT SIDE */}
      <div
        className="p-4 rounded-md lg:w-[50%] md:w-[50%] sm:w-full"
        style={{
          backgroundColor: colors.primary[700],
          color: colors.gray[100],
          overflowY: "auto",
          maxHeight: "165vh",
        }}
      >
        <h2 className="text-lg font-semibold mb-4">Additional Details</h2>
        <p><strong>Shipping Address:</strong> {order.shipping_address || "N/A"}</p>
        <p><strong>Payment Method:</strong> {order.payment_method || "N/A"}</p>
      </div>
    </div>
  );
};

export default VendorOrderDetail;
