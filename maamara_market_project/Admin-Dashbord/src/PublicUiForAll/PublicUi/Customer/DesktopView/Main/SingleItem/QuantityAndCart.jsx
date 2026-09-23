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
  const hasVariantSizes = Array.isArray(selectedVariant?.sizes) && selectedVariant.sizes.length > 0;
  const hasStandaloneSizes =
    !hasVariantSizes &&
    Array.isArray(item?.size_only_icon) &&
    item.size_only_icon.length > 0;
  const hasPredefinedSizes = hasVariantSizes || hasStandaloneSizes;
  const hasCustomSize = String(customPreferences || "").trim().length > 0;

  // A vendor-provided size is preferred, but custom measurements may be used
  // when none of the predefined sizes fit the customer.
  const needsSize = hasPredefinedSizes && !selectedSize && !hasCustomSize;
  const needsAge =
    Array.isArray(item?.kids_sizes) && item.kids_sizes.length > 0 && !selectedAgeVariant;
  const needsShoeSize =
    Array.isArray(item?.shoe_input) &&
    item.shoe_input.length > 0 &&
    (!selectedShoe || !selectedShoeSize);

  const configurationReady = !needsSize && !needsAge && !needsShoeSize;
  const stock = Math.max(Number(availableStock || 0), 0);

  const setSafeQuantity = (value) => {
    const next = Number(value);
    if (!Number.isFinite(next)) return;
    setQuantity(Math.min(Math.max(Math.floor(next), 1), stock || 1));
  };

  const disabled = !configurationReady || quantity > stock || stock === 0;

  return (
    <div className="mt-2 border-t border-border pt-5">
      <p className="mb-3 text-sm font-bold text-card-foreground">Choose Quantity</p>

      {!configurationReady ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
          Select all required product options above to choose the quantity.
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-background p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Selected configuration
              </p>
              <p className="mt-1 text-sm font-medium text-card-foreground">
                {selectedVariant?.color || "Standard"}
                {selectedSize?.size !== undefined && selectedSize?.size !== null
                  ? " · " + (typeof selectedSize.size === "object" ? JSON.stringify(selectedSize.size) : selectedSize.size)
                  : ""}
                {selectedAgeVariant?.age_group ? " · " + selectedAgeVariant.age_group : ""}
                {selectedShoeSize ? " · Shoe " + selectedShoeSize : ""}
              </p>
            </div>

            <p className="text-sm text-muted-foreground">
              {stock > 0 ? (
                <>
                  <span className="font-semibold text-card-foreground">{stock}</span> available for this selection
                </>
              ) : (
                <span className="font-semibold text-red-600">Out of stock for this selection</span>
              )}
            </p>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-4">
            <div className="flex w-40 items-center justify-between gap-2 rounded-full border border-border bg-background px-2 py-1.5">
              <button
                type="button"
                onClick={() => setSafeQuantity(quantity - 1)}
                disabled={quantity <= 1 || stock === 0}
                aria-label="Decrease quantity"
                className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-300 bg-background text-sm font-semibold text-card-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
              >
                -
              </button>

              <input
                type="number"
                min="1"
                max={stock || 1}
                value={quantity}
                onChange={(event) => setSafeQuantity(event.target.value)}
                disabled={stock === 0}
                aria-label="Quantity"
                className="w-12 border-0 bg-transparent text-center text-sm font-semibold text-card-foreground outline-none"
              />

              <button
                type="button"
                onClick={() => setSafeQuantity(quantity + 1)}
                disabled={quantity >= stock || stock === 0}
                aria-label="Increase quantity"
                className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-300 bg-background text-sm font-semibold text-card-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
              >
                +
              </button>
            </div>

            <p className="whitespace-nowrap text-sm text-muted-foreground">
              {remainingStock > 0 ? (
                remainingStock + " remaining after this selection"
              ) : stock > 0 ? (
                <span className="font-semibold text-red-600">All selected stock is in this quantity</span>
              ) : null}
            </p>

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
                availableStock={stock}
                remainingStock={remainingStock}
                disabled={disabled}
                onAddSuccess={onAdded}
              />
            </div>
          </div>
        </div>
      )}

      {needsSize && (
        <p className="mt-3 text-sm text-red-500">
          Please select a size or enter custom measurements.
        </p>
      )}
      {needsAge && <p className="mt-3 text-sm text-red-500">Please select an age/size</p>}
      {needsShoeSize && (
        <p className="mt-3 text-sm text-red-500">
          Please select a shoe and shoe size
        </p>
      )}
    </div>
  );
};

export default QuantityAndCart;
