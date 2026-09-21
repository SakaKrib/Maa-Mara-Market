import React from "react";

const ProductDetails = ({ item }) => (
  <div className="flex flex-col gap-4">
    <section className="rounded-2xl border border-border bg-card p-4 shadow-custom sm:p-5">
      <h2 className="text-base font-bold text-card-foreground sm:text-lg">More Info</h2>
      <div className="mt-4 rounded-2xl border border-border bg-background p-4 text-sm leading-6 text-card-foreground">
        {item.description || "Product details are provided by the seller."}
      </div>
    </section>

    <section className="rounded-2xl border border-border bg-card p-4 shadow-custom sm:p-5">
      <h2 className="text-base font-bold text-card-foreground sm:text-lg">Returns</h2>
      <div className="mt-4 rounded-2xl border border-border bg-background p-4 text-sm leading-6 text-card-foreground">
        {(item?.returnable ?? item?.is_returnable) ? (
          <p>This item is eligible for return. If you receive a damaged, defective, or incorrect product, you may request a return within the allowed return period after delivery. The product must remain unused, in its original packaging, and in the same condition you received it. Refunds or replacements will be processed after inspection.</p>
        ) : (
          <p>This item is non-returnable. Due to hygiene, customization, or product nature, we cannot accept returns or exchanges once the order has been delivered. If the item arrives damaged or incorrect, please contact support within 24 hours of delivery.</p>
        )}
      </div>
    </section>
  </div>
);

export default ProductDetails;
