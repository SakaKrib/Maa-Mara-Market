import React from "react";

const formatSizeValue = (value) => {
  if (value === null || value === undefined || value === "") return "Custom size";

  if (Array.isArray(value)) {
    return value.map((entry) => formatSizeValue(entry)).join(" / ");
  }

  if (typeof value === "object") {
    const preferredKeys = ["label", "name", "value", "size", "measurement", "unit"];
    const preferred = preferredKeys
      .filter((key) => value[key] !== undefined && value[key] !== null && value[key] !== "")
      .map((key) => String(value[key]));

    if (preferred.length > 0) return preferred.join(" ");

    return Object.entries(value)
      .filter(([key]) => !["id", "quantity_in_stock"].includes(key))
      .map(([key, entry]) => `${key.replace(/_/g, " ")}: ${formatSizeValue(entry)}`)
      .join(" · ");
  }

  return String(value);
};

const OptionButton = ({ selected, disabled, children, onClick, ariaLabel, sizeStyle = false }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    aria-pressed={selected}
    aria-label={ariaLabel}
    className={[
      sizeStyle ? "h-9 min-w-9 rounded-full border px-2 py-0 text-xs font-medium transition-colors" : "min-h-10 rounded-xl border px-3 py-2 text-sm font-medium transition-colors",
      selected
        ? "border-gray-900 bg-gray-900 text-white"
        : disabled
          ? "cursor-not-allowed border-gray-200 bg-gray-50 text-gray-400"
          : "border-border bg-background text-card-foreground hover:border-gray-900 hover:bg-muted",
    ].join(" ")}
  >
    {children}
  </button>
);

const ProductOptions = ({
  item,
  selectedVariant,
  selectedSize,
  selectedAgeVariant,
  selectedShoe,
  selectedShoeSize,
  selectedWeight,
  selectedLength,
  customPreferences,
  onColorChange,
  onSizeChange,
  onAgeChange,
  onShoeChange,
  onShoeSizeChange,
  onWeightChange,
  onLengthChange,
  onCustomPreferencesChange,
}) => {
  const variants = Array.isArray(item?.variants) ? item.variants : [];
  const variantSizes = Array.isArray(selectedVariant?.sizes) ? selectedVariant.sizes : [];
  const sizeOnly = Array.isArray(item?.size_only_icon) ? item.size_only_icon : [];
  const kidsSizes = Array.isArray(item?.kids_sizes) ? item.kids_sizes : [];
  const shoes = Array.isArray(item?.shoe_input) ? item.shoe_input : [];
  const shoeSizes = Array.isArray(selectedShoe?.shoe_size) ? selectedShoe.shoe_size : [];

  // A product may have both color variants and standalone sizes. Prefer the
  // selected variant's sizes when they exist; otherwise expose the item's
  // standalone SizeStock records.
  const sizesToShow = variantSizes.length > 0 ? variantSizes : sizeOnly;

  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-custom sm:p-5">
      <div className="mb-5">
        <h2 className="text-base font-semibold text-card-foreground">Choose your options</h2>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          Select every applicable option before adding this item to your cart.
        </p>
      </div>

      <div className="space-y-6">
        {variants.length > 0 && (
          <fieldset>
            <legend className="mb-3 text-sm font-semibold text-card-foreground">
              Color
              {selectedVariant?.color && (
                <span className="ml-2 font-normal text-muted-foreground">· {selectedVariant.color}</span>
              )}
            </legend>
            <div className="flex flex-wrap gap-2">
              {variants.map((variant) => (
                <OptionButton
                  key={variant.id}
                  selected={selectedVariant?.id === variant.id}
                  onClick={() => onColorChange(variant)}
                  ariaLabel={variant.color || "Color variant"}
                >
                  {variant.color || "Other"}
                </OptionButton>
              ))}
            </div>
          </fieldset>
        )}

        {sizesToShow.length > 0 && (
          <fieldset>
            <legend className="mb-3 text-sm font-semibold text-card-foreground">
              Size <span className="ml-1 font-normal text-muted-foreground">· Required</span>
            </legend>
            <div className="flex flex-wrap gap-2">
              {sizesToShow.map((sizeObj) => {
                const stock = Number(sizeObj.quantity_in_stock || 0);
                return (
                  <OptionButton
                    key={sizeObj.id}
                    selected={selectedSize?.id === sizeObj.id}
                    disabled={stock <= 0}
                    onClick={() => onSizeChange(sizeObj)}
                    sizeStyle
                  >
                    {formatSizeValue(sizeObj.size)}
                  </OptionButton>
                );
              })}
            </div>
            {selectedSize && (
              <p className="mt-2 text-xs text-muted-foreground">
                {Number(selectedSize.quantity_in_stock || 0)} available in this size.
              </p>
            )}
          </fieldset>
        )}

        {kidsSizes.length > 0 && (
          <fieldset>
            <legend className="mb-3 text-sm font-semibold text-card-foreground">
              Age / Size <span className="ml-1 font-normal text-muted-foreground">· Required</span>
            </legend>
            <div className="flex flex-wrap gap-2">
              {kidsSizes.map((age) => {
                const stock = Number(age.quantity_in_stock || 0);
                return (
                  <OptionButton
                    key={age.id}
                    selected={selectedAgeVariant?.id === age.id}
                    disabled={stock <= 0}
                    onClick={() => onAgeChange(age)}
                    sizeStyle
                  >
                    {age.age_group}
                  </OptionButton>
                );
              })}
            </div>
            {selectedAgeVariant && (
              <p className="mt-2 text-xs text-muted-foreground">
                {Number(selectedAgeVariant.quantity_in_stock || 0)} available in this age/size.
              </p>
            )}
          </fieldset>
        )}

        {shoes.length > 0 && (
          <fieldset>
            <legend className="mb-3 text-sm font-semibold text-card-foreground">
              Shoe type / fit <span className="ml-1 font-normal text-muted-foreground">· Required</span>
            </legend>
            <div className="flex flex-wrap gap-2">
              {shoes.map((shoe) => (
                <OptionButton
                  key={shoe.id || `${shoe.shoe_type}-${shoe.shoe_gender}`}
                  selected={selectedShoe?.id === shoe.id}
                  onClick={() => onShoeChange(shoe)}
                >
                  {shoe.shoe_type || "Shoe"}{shoe.shoe_gender ? ` · ${shoe.shoe_gender}` : ""}
                </OptionButton>
              ))}
            </div>

            {selectedShoe && shoeSizes.length > 0 && (
              <div className="mt-4">
                <p className="mb-2 text-xs font-medium text-muted-foreground">Shoe size · Required</p>
                <div className="flex flex-wrap gap-2">
                  {shoeSizes.map((size, index) => (
                    <OptionButton
                      key={`${String(size)}-${index}`}
                      selected={String(selectedShoeSize) === String(size)}
                      onClick={() => onShoeSizeChange(size)}
                      sizeStyle
                    >
                      {String(size)}
                    </OptionButton>
                  ))}
                </div>
              </div>
            )}
          </fieldset>
        )}

        {item?.weight && (
          <fieldset>
            <legend className="mb-3 text-sm font-semibold text-card-foreground">Weight</legend>
            <OptionButton
              selected={selectedWeight?.id === item.weight.id}
              onClick={() => onWeightChange(item.weight)}
            >
              {item.weight.value} {item.weight.unit}
            </OptionButton>
          </fieldset>
        )}

        {item?.length && (
          <fieldset>
            <legend className="mb-3 text-sm font-semibold text-card-foreground">Length</legend>
            <OptionButton
              selected={selectedLength?.id === item.length.id}
              onClick={() => onLengthChange(item.length)}
            >
              {item.length.value} {item.length.unit}
            </OptionButton>
          </fieldset>
        )}

        <fieldset>
          <legend className="mb-2 text-sm font-semibold text-card-foreground">
            Custom size / measurements
            <span className="ml-2 font-normal text-muted-foreground">· Optional</span>
          </legend>
          <textarea
            value={customPreferences}
            onChange={(event) => onCustomPreferencesChange(event.target.value)}
            maxLength={1000}
            rows={4}
            placeholder="If the available options do not fit your request, enter your measurements or other vendor instructions here."
            className="w-full resize-y rounded-xl border border-border bg-background px-3 py-2.5 text-sm leading-6 text-card-foreground outline-none transition focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
          />
          <p className="mt-2 text-xs text-muted-foreground">
            {customPreferences.length}/1000 characters
          </p>
        </fieldset>
      </div>
    </section>
  );
};

export default ProductOptions;
