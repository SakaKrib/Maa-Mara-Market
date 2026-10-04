import React from "react";

const Detail = ({ label, value }) => {
  if (value === null || value === undefined || value === "" || (Array.isArray(value) && value.length === 0)) {
    return null;
  }

  const display = Array.isArray(value)
    ? value.join(", ")
    : typeof value === "object"
      ? Object.entries(value)
          .filter(([, entry]) => entry !== null && entry !== undefined && entry !== "")
          .map(([key, entry]) => `${key.replace(/_/g, " ")}: ${String(entry)}`)
          .join(" · ")
      : String(value);

  return (
    <div className="flex flex-col gap-1 border-b border-border py-3 last:border-b-0">
      <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="text-sm leading-6 text-card-foreground">{display}</dd>
    </div>
  );
};

const ProductDetails = ({ item }) => {
  const occasions = Array.isArray(item?.occasions) ? item.occasions : [];
  const dimensions = item?.shipping_dimension;

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-2xl border border-border bg-card p-4 shadow-custom sm:p-5">
        <h2 className="text-base font-bold text-card-foreground sm:text-lg">Product information</h2>
        <dl className="mt-2">
          <Detail label="Description" value={item?.description || "Product details are provided by the seller."} />
          <Detail label="Brand" value={item?.brand?.name} />
          <Detail label="Department" value={item?.department} />
          <Detail label="Category" value={item?.category} />
          <Detail label="Subcategory" value={item?.subcategory} />
          <Detail label="Attribute" value={item?.item_attribute} />
          <Detail label="Gender" value={item?.gender_based && item.gender_based !== "none" ? item.gender_based : null} />
          <Detail label="Occasions" value={occasions} />
          <Detail label="Organic" value={item?.is_organic ? "Yes" : null} />
          <Detail label="Fresh food" value={item?.is_fresh_food ? "Yes" : null} />
          <Detail label="Roast type" value={item?.roast_type} />
          <Detail label="Coffee state" value={item?.coffee_state} />
          <Detail label="Manufactured" value={item?.manufactured_date} />
          <Detail label="Expiry" value={item?.expiry_date} />
          {dimensions && (
            <Detail
              label="Shipping dimensions"
              value={{
                length: `${dimensions.length} ${dimensions.unit || ""}`.trim(),
                width: `${dimensions.width} ${dimensions.unit || ""}`.trim(),
                height: `${dimensions.height} ${dimensions.unit || ""}`.trim(),
                weight: `${dimensions.weight} ${dimensions.weight_unit || ""}`.trim(),
              }}
            />
          )}
        </dl>
      </section>

      <section className="rounded-2xl border border-border bg-card p-4 shadow-custom sm:p-5">
        <h2 className="text-base font-bold text-card-foreground sm:text-lg">Returns</h2>
        <div className="mt-3 text-xs leading-6 text-muted-foreground sm:text-sm">
          {item?.returnable ?? item?.is_returnable ? (
            <p>
              This item is eligible for return. If you receive a damaged, defective, or incorrect
              product, you may request a return within the allowed return period after delivery.
              The product must remain unused, in its original packaging, and in the same condition
              you received it.
            </p>
          ) : (
            <p>
              This item is non-returnable. Due to hygiene, customization, or product nature, we
              cannot accept returns or exchanges once the order has been delivered. If the item
              arrives damaged or incorrect, please contact support within 24 hours of delivery.
            </p>
          )}
        </div>
      </section>
    </div>
  );
};

export default ProductDetails;
