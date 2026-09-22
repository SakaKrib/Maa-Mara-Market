import React from "react";
import AddToCartButton from "../CartActionButtons/AddToCartBtn";

const QuantityAndCart = ({
  item,
  quantity,
  setQuantity,
  availableStock,
  remainingStock,
  selectedVariant,
  selectedSize,
  selectedAgeVariant,
  selectedShoe,
  selectedShoeSize,
  customPreferences,
  onAdded,
}) => {
  const needsSize = selectedVariant?.sizes?.length > 0 && !selectedSize;
  const needsAge =
    Array.isArray(item?.kids_sizes) && item.kids_sizes.length > 0 && !selectedAgeVariant;
  const needsShoeSize =
    Array.isArray(item?.shoe_input) &&
    item.shoe_input.length > 0 &&
    (!selectedShoe || !selectedShoeSize);
  const disabled =
    quantity > availableStock ||
    availableStock === 0 ||
    needsSize ||
    needsAge ||
    needsShoeSize;

  return (
    <div className="mt-2 border-t border-border pt-5">
      <p className="mb-3 text-sm font-bold text-card-foreground">Choose Quantity</p>

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex w-32 items-center justify-between gap-3 rounded-full border border-border bg-background px-3 py-2">
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            disabled={quantity <= 1}
            aria-label="Decrease quantity"
            className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-300 bg-background text-sm font-semibold text-card-foreground transition-colors hover:bg-muted disabled:opacity-40"
          >
            -
          </button>
          <span className="text-sm font-semibold text-card-foreground">{quantity}</span>
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.min(q + 1, availableStock))}
            disabled={quantity >= availableStock}
            aria-label="Increase quantity"
            className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-300 bg-background text-sm font-semibold text-card-foreground transition-colors hover:bg-muted disabled:opacity-40"
          >
            +
          </button>
        </div>

        <p className="whitespace-nowrap text-sm text-muted-foreground">
          {remainingStock > 0 ? (
            <>
              Only{" "}
              <span
                className={`font-semibold ${remainingStock < 5 ? "text-red-500" : "text-green-500"}`}
              >
                {remainingStock}
              </span>{" "}
              left in stock
            </>
          ) : (
            <span className="font-semibold text-red-600">This is the last item in stock!</span>
          )}
        </p>

        {needsSize && <p className="w-full text-sm text-red-500">Please select a size</p>}
        {needsAge && <p className="w-full text-sm text-red-500">Please select an age/size</p>}
        {needsShoeSize && (
          <p className="w-full text-sm text-red-500">
            Please select a shoe and shoe size
          </p>
        )}

        <div className="w-full [&>*]:w-full">
          <AddToCartButton
            itemId={item.id}
            quantity={quantity}
            variantId={selectedVariant?.id}
            sizeId={selectedSize?.id}
            ageVariantId={selectedAgeVariant?.id}
            shoeId={selectedShoe?.id}
            selectedShoeSize={selectedShoeSize}
            weightId={item?.weight?.id}
            lengthId={item?.length?.id}
            customPreferences={customPreferences}
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
