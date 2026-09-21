import React from "react";
import AddToCartButton from "../CartActionButtons/AddToCartBtn";

const QuantityAndCart = ({ item, quantity, setQuantity, availableStock, remainingStock, selectedVariant, selectedSize, onAdded }) => {
  const needsSize = selectedVariant?.sizes?.length > 0 && !selectedSize;
  const disabled = quantity > availableStock || availableStock === 0 || needsSize;

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-custom sm:p-5">
      <p className="mb-3 text-sm font-bold text-card-foreground">Choose Quantity</p>

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center justify-between rounded-full border border-border bg-background px-4 py-2 w-32">
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            disabled={quantity <= 1}
            aria-label="Decrease quantity"
            className="px-1 text-sm font-semibold text-card-foreground disabled:opacity-40"
          >
            -
          </button>
          <span className="text-sm font-semibold text-card-foreground">{quantity}</span>
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.min(q + 1, availableStock))}
            disabled={quantity >= availableStock}
            aria-label="Increase quantity"
            className="px-1 text-sm font-semibold text-card-foreground disabled:opacity-40"
          >
            +
          </button>
        </div>

        <p className="text-sm whitespace-nowrap text-muted-foreground">
          {remainingStock > 0
            ? <>Only <span className={`font-semibold ${remainingStock < 5 ? "text-red-500" : "text-green-500"}`}>{remainingStock}</span> left in stock</>
            : <span className="font-semibold text-red-600">This is the last item in stock!</span>}
        </p>

        {needsSize && <p className="w-full text-sm text-red-500">Please select a size</p>}

        <div className="w-full">
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
    </div>
  );
};

export default QuantityAndCart;
