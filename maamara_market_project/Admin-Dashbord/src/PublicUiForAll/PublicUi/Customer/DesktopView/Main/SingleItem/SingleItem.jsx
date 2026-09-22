import React from "react";
import useSingleItem from "./useSingleItem";
import ProductGallery from "./ProductGallery";
import ProductOptions from "./ProductOptions";
import QuantityAndCart from "./QuantityAndCart";
import ProductDetails from "./ProductDetails";
import ProductReviews from "./ProductReviews";
import FormattedCurrency from "../Currency/FormattedCurrency";
import { useWishlistContext } from "../../../../../../cmponents/Hooks/WishListHook/Wishlist";
import MarketplaceItemContext from "./MarketplaceItemContext";
import TrendingProduct from "../Trending/TrendingProduct";
import VendorPerformanceBadges from "./VendorPerformanceBadges";

const truncateWords = (text, limit = 15) => {
  const words = String(text || "").trim().split(/\s+/).filter(Boolean);
  if (words.length <= limit) return String(text || "").trim();
  return `${words.slice(0, limit).join(" ")}…`;
};

const SingleItem = () => {
  const {
    item,
    loading,
    error,
    selectedVariant,
    selectedSize,
    selectedAgeVariant,
    selectedShoe,
    selectedShoeSize,
    selectedWeight,
    selectedLength,
    customPreferences,
    setCustomPreferences,
    selectedImage,
    quantity,
    setQuantity,
    availableStock,
    remainingStock,
    selectColor,
    selectSize,
    selectAgeVariant,
    selectShoe,
    selectShoeSize,
    selectWeight,
    selectLength,
    selectImage,
    refreshItem,
  } = useSingleItem();

  const { wishlist, addToWishlist, removeFromWishlist } = useWishlistContext();
  const isWishlisted =
    Array.isArray(wishlist) &&
    wishlist.some((entry) => (entry.item?.id || entry.id) === item?.id);

  if (loading) return <div className="p-10 text-center">Loading product...</div>;
  if (error || !item) return <div className="p-10 text-center">Item not found.</div>;

  const hasDiscount = Number(item.discount_price || item.discount || 0) > 0;

  return (
    <main className="mm-single-item mm-page pb-12 pt-6">
      <div className="mm-container">
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2 lg:gap-8 xl:gap-10">
          <div className="min-w-0 lg:sticky lg:top-4">
            <ProductGallery
              item={item}
              selectedImage={selectedImage}
              selectedVariant={selectedVariant}
              selectedSize={selectedSize}
              onSelectImage={selectImage}
              onSelectColor={selectColor}
            />
          </div>

          <section className="min-w-0 rounded-2xl border border-border bg-card p-4 shadow-custom sm:p-5">
            <VendorPerformanceBadges itemId={item.id} />
            <h1 className="mt-3 text-2xl font-semibold tracking-tight text-card-foreground sm:text-3xl">
              {item.name}
            </h1>
            <p className="mt-2 text-sm font-normal leading-6 text-muted-foreground">
              {truncateWords(item.description, 15) || "Product details are provided by the seller."}
            </p>

            <div className="mt-5 border-t border-border pt-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-sm text-muted-foreground">
                  Reviews: ({item.review_count ?? 0})
                </span>
                <span
                  className={`text-sm font-semibold ${availableStock < 5 ? "text-red-500" : "text-green-500"}`}
                >
                  {availableStock} In stock
                </span>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                {hasDiscount && (
                  <span className="text-lg text-muted-foreground line-through">
                    <FormattedCurrency value={Number(item.final_price)} />
                  </span>
                )}
                <span
                  className={`text-2xl font-bold ${hasDiscount ? "text-red-600" : "text-card-foreground"}`}
                >
                  <FormattedCurrency
                    value={Number(hasDiscount ? item.final_discounted_price : item.final_price)}
                  />
                </span>
              </div>
            </div>
          </section>

          <section className="min-w-0 rounded-2xl border border-border bg-card p-4 shadow-custom sm:p-5">
            <ProductDetails item={item} />
          </section>

          <div className="min-w-0">
            <ProductOptions
              item={item}
              selectedVariant={selectedVariant}
              selectedSize={selectedSize}
              selectedAgeVariant={selectedAgeVariant}
              selectedShoe={selectedShoe}
              selectedShoeSize={selectedShoeSize}
              selectedWeight={selectedWeight}
              selectedLength={selectedLength}
              customPreferences={customPreferences}
              onColorChange={selectColor}
              onSizeChange={selectSize}
              onAgeChange={selectAgeVariant}
              onShoeChange={selectShoe}
              onShoeSizeChange={selectShoeSize}
              onWeightChange={selectWeight}
              onLengthChange={selectLength}
              onCustomPreferencesChange={setCustomPreferences}
            />

            <div className="mt-6">
              <QuantityAndCart
                item={item}
                quantity={quantity}
                setQuantity={setQuantity}
                availableStock={availableStock}
                remainingStock={remainingStock}
                selectedVariant={selectedVariant}
                selectedSize={selectedSize}
                selectedAgeVariant={selectedAgeVariant}
                selectedShoe={selectedShoe}
                selectedShoeSize={selectedShoeSize}
                customPreferences={customPreferences}
                onAdded={refreshItem}
              />

              <div className="mt-4 flex w-full flex-col gap-3">
                <button
                  type="button"
                  className="flex w-full items-center justify-center rounded-full border border-border bg-background px-4 py-2.5 text-center text-sm font-semibold text-card-foreground transition-colors hover:bg-muted"
                  onClick={() =>
                    isWishlisted ? removeFromWishlist(item.id) : addToWishlist(item.id)
                  }
                  aria-pressed={isWishlisted}
                >
                  {isWishlisted ? "♥ Saved" : "♡ Wishlist"}
                </button>

                <button
                  type="button"
                  className="flex w-full items-center justify-center rounded-full border border-border bg-background px-4 py-2.5 text-center text-sm font-semibold text-card-foreground transition-colors hover:bg-muted"
                  onClick={() => {
                    if (navigator.share) {
                      navigator.share({ title: item.name, url: window.location.href }).catch(() => {});
                    } else if (navigator.clipboard) {
                      navigator.clipboard.writeText(window.location.href);
                    }
                  }}
                >
                  ↗ Share
                </button>
              </div>
            </div>

            <section className="mt-6 min-w-0 rounded-2xl border border-border bg-card p-4 shadow-custom sm:p-5">
              <ProductReviews item={item} />
            </section>
          </div>
        </div>
      </div>

      <div className="mm-container mt-8 min-w-0">
        <TrendingProduct
          itemId={item.id}
          title="You may also like"
          limit={8}
          initialVisible={4}
          scrollable={true}
        />
      </div>

      <div className="mm-container mt-8 min-w-0">
        <MarketplaceItemContext item={item} availableStock={availableStock} />
      </div>
    </main>
  );
};

export default SingleItem;
