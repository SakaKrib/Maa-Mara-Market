import React from "react";
import AddToCartButton from "../CartActionButtons/AddToCartBtn";

const QuantityAndCart = ({ item, quantity, setQuantity, availableStock, remainingStock, selectedVariant, selectedSize, onAdded }) => {
  const needsSize = selectedVariant?.sizes?.length > 0 && !selectedSize;
  const disabled = quantity > availableStock || availableStock === 0 || needsSize;

  return (
    <div>
      <p className="font-medium mb-2">Choose Quantity</p>
      <div className="flex flex-wrap items-center gap-6">
        <div className="bg-gray-100 py-2 px-4 rounded-3xl flex items-center w-32 justify-between">
          <button type="button" onClick={() => setQuantity((q) => Math.max(1, q - 1))} disabled={quantity <= 1}>-</button>
          <span>{quantity}</span>
          <button type="button" onClick={() => setQuantity((q) => Math.min(q + 1, availableStock))} disabled={quantity >= availableStock}>+</button>
        </div>

        <p className="text-sm whitespace-nowrap">
          {remainingStock > 0
            ? <>Only <span className={`font-medium ${remainingStock < 5 ? "text-red-500" : "text-green-500"}`}>{remainingStock}</span> left in stock</>
            : <span className="font-medium text-red-600">This is the last item in stock!</span>}
        </p>

        {needsSize && <p className="text-sm text-red-500">Please select a size</p>}

        <AddToCartButton
          itemId={item.id}
          quantity={quantity}
          variantId={selectedVariant?.id}
          sizeId={selectedSize?.id}
          availableStock={availableStock}
          remainingStock={remainingStock}
          disabled={disabled}
          onAddSuccess={onAdded}
        />
      </div>
    </div>
  );
};

export default QuantityAndCart;
