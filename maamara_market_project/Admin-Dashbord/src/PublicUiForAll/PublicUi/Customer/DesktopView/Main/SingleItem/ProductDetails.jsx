import React from "react";

const ProductDetails = ({ item }) => (
  <>
    <div className="text-sm mt-6">
      <div className="font-medium mb-4">More Info</div>
      <p>{item.description || "Product details are provided by the seller."}</p>
    </div>
    <div className="text-sm mt-6">
      <div className="font-medium mb-4">Returns</div>
      {item?.is_returnable ? (
        <p>This item is eligible for return. If you receive a damaged, defective, or incorrect product, you may request a return within the allowed return period after delivery. The product must remain unused, in its original packaging, and in the same condition you received it. Refunds or replacements will be processed after inspection.</p>
      ) : (
        <p>This item is non-returnable. Due to hygiene, customization, or product nature, we cannot accept returns or exchanges once the order has been delivered. If the item arrives damaged or incorrect, please contact support within 24 hours of delivery.</p>
      )}
    </div>
  </>
);

export default ProductDetails;
