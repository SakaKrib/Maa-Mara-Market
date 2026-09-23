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
  selectedWeight,
  selectedLength,
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
  const hasExplicitConfiguration =
    Boolean(selectedVariant || selectedSize || selectedAgeVariant || selectedShoe || selectedShoeSize || selectedWeight || selectedLength);
  const selectionLabel = [
    selectedVariant?.color,
    selectedSize?.size !== undefined && selectedSize?.size !== null
      ? (typeof selectedSize.size === "object" ? JSON.stringify(selectedSize.size) : selectedSize.size)
      : null,
    selectedAgeVariant?.age_group,
    selectedShoeSize ? "Shoe " + selectedShoeSize : null,
  ].filter(Boolean).join(" · ");

  const setSafeQuantity = (value) => {
    const next = Number(value);
    if (!Number.isFinite(next)) return;
    setQuantity(Math.min(Math.max(Math.floor(next), 1), stock || 1));
  };

  const disabled = !configurationReady || quantity > stock || stock === 0;

  const selectedCustomPreferences = {
    ...(typeof customPreferences === "object" && customPreferences ? customPreferences : {}),
    ...(typeof customPreferences === "string" && customPreferences.trim()
      ? { instructions: customPreferences.trim() }
      : {}),
    ...(selectedShoe?.shoe_type ? { shoe_type: selectedShoe.shoe_type } : {}),
    ...(selectedShoe?.shoe_gender ? { shoe_gender: selectedShoe.shoe_gender } : {}),
  };

  const buyNowPayload = {
    itemId: item?.id ?? null,
    itemName: item?.name ?? "",
    quantity,
    variantId: selectedVariant?.id ?? null,
    color: selectedVariant?.color ?? null,
    sizeId: selectedSize?.id ?? null,
    size: selectedSize?.size ?? null,
    ageVariantId: selectedAgeVariant?.id ?? null,
    ageGroup: selectedAgeVariant?.age_group ?? null,
    shoeId: selectedShoe?.id ?? null,
    shoeType: selectedShoe?.shoe_type ?? null,
    shoeGender: selectedShoe?.shoe_gender ?? null,
    selectedShoeSize: selectedShoeSize ?? null,
    weightId: selectedWeight?.id ?? item?.weight?.id ?? null,
    weight: selectedWeight ?? item?.weight ?? null,
    lengthId: selectedLength?.id ?? item?.length?.id ?? null,
    length: selectedLength ?? item?.length ?? null,
    customPreferences: selectedCustomPreferences,
    unitPrice: Number(item?.final_discounted_price || item?.final_price || item?.price || 0),
    availableStock: stock,
  };

  const handleBuyNow = () => {
    if (disabled) return;
    try {
      sessionStorage.setItem("maaMaraBuyNow", JSON.stringify(buyNowPayload));
      window.location.assign("/checkout-page");
    } catch (error) {
      console.error("Unable to prepare Buy Now selection", error);
    }
  };

  return (
    <div className="mt-2 border-t border-border pt-5">
      <p className="mb-3 text-sm font-bold text-card-foreground">Choose Quantity</p>

      <div className="rounded-xl border border-border bg-background p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Selected configuration
              </p>
              <p className="mt-1 text-sm font-medium text-card-foreground">
                {selectionLabel || "Standard item"}
                {hasExplicitConfiguration ? "" : " · Base item"}
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

            <div className="w-full space-y-2">
              <button
                type="button"
                onClick={handleBuyNow}
                disabled={disabled}
                className="flex w-full items-center justify-center rounded-full bg-black px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Buy Now
              </button>

              <div className="[&>*]:w-full">
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
      </div>

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
