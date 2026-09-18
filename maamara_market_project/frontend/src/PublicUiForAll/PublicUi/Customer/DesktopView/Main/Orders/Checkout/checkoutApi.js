export async function fetchShippingRates({ order, address }) {
  if (!order?.order?.id) throw new Error("No active order is available.");

  const response = await fetch("/api/shipping-rates", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      order_id: order.order.id,
      address: address.address,
      apartment: address.apartment || "",
      city: address.city,
      state: address.state || "",
      zip: address.zip,
      country: address.country,
      phone: address.phone,
      items: (order.items || []).map((item) => ({
        id: item.id,
        quantity: item.quantity,
        weight: item.weight || 0.5,
        length: item.length || 5,
        width: item.width || 5,
        height: item.height || 5,
      })),
    }),
  });

  if (!response.ok) throw new Error("Failed to get shipping rates");
  const data = await response.json();
  return Array.isArray(data.rates) ? data.rates : [];
}

export async function submitCheckout(data, order, selectedShipping) {
  const response = await fetch("/api/checkout/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      first_name: data.firstName || "",
      last_name: data.lastName || "",
      phone: data.phone || "",
      email: data.email || "",
      street_address: data.address || "",
      appartment_address: data.apartment || "",
      city: data.city || "",
      state: data.state || "",
      country: data.country || "",
      zip: data.zip || "",
      payment_method: data.payment || "",
      shipping: selectedShipping || "",
      items: (order?.items || []).map((item) => ({
        id: item?.id ?? null,
        quantity: item?.quantity ?? 1,
        variant_id: item?.variant_id ?? null,
        size_id: item?.size_id ?? null,
        age_variant_id: item?.age_variant_id ?? null,
        length_id: item?.length_id ?? null,
        weight_id: item?.weight_id ?? null,
        shoe_id: item?.shoe_id ?? null,
      })),
    }),
  });

  if (!response.ok) throw new Error("Checkout failed");
  return response.json();
}
