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

const truncateWords = (text, limit = 15) => {
  const words = String(text || "").trim().split(/\s+/).filter(Boolean);
  if (words.length <= limit) return String(text || "").trim();
  return `${words.slice(0, limit).join(" ")}…`;
};

const SingleItem = () => {
  const {
    item, loading, error, selectedVariant, selectedSize, selectedImage,
    quantity, setQuantity, availableStock, remainingStock,
    selectColor, selectSize, selectImage, refreshItem,
  } = useSingleItem();
  const { wishlist, addToWishlist, removeFromWishlist } = useWishlistContext();
  const isWishlisted = Array.isArray(wishlist) && wishlist.some((entry) => (entry.item?.id || entry.id) === item?.id);

  if (loading) return <div className="p-10 text-center">Loading product...</div>;
  if (error || !item) return <div className="p-10 text-center">Item not found.</div>;

  const hasDiscount = Number(item.discount_price || item.discount || 0) > 0;

  return (
    <div className="px-4 md:px-8 lg:px-16 xl:px-32 2xl:px-64 flex flex-col lg:flex-row gap-10 lg:gap-16 mt-10">
      <ProductGallery
        item={item}
        selectedImage={selectedImage}
        selectedVariant={selectedVariant}
        selectedSize={selectedSize}
        onSelectImage={selectImage}
        onSelectColor={selectColor}
      />

      <section className="w-full lg:w-1/2 flex flex-col gap-6">
        <div className="rounded-2xl border border-border bg-card p-4 shadow-custom sm:p-5">
          <h1 className="text-2xl font-bold text-card-foreground sm:text-3xl">{item.name}</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {truncateWords(item.description, 15) || "Product details are provided by the seller."}
          </p>

          <div className="mt-5 border-t border-border pt-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-sm text-muted-foreground">Reviews: ({item.review_count ?? 0})</span>
              <span className={`text-sm font-semibold ${availableStock < 5 ? "text-red-500" : "text-green-500"}`}>
                {availableStock} In stock
              </span>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              {hasDiscount && (
                <span className="text-lg text-muted-foreground line-through">
                  <FormattedCurrency value={Number(item.final_price)} />
                </span>
              )}
              <span className={`text-2xl font-bold ${hasDiscount ? "text-red-600" : "text-card-foreground"}`}>
                <FormattedCurrency value={Number(hasDiscount ? item.final_discounted_price : item.final_price)} />
              </span>
            </div>
          </div>
        </div>

        <ProductOptions
          item={item}
          selectedVariant={selectedVariant}
          selectedSize={selectedSize}
          onColorChange={selectColor}
          onSizeChange={selectSize}
        />

        <QuantityAndCart
          item={item}
          quantity={quantity}
          setQuantity={setQuantity}
          availableStock={availableStock}
          remainingStock={remainingStock}
          selectedVariant={selectedVariant}
          selectedSize={selectedSize}
          onAdded={refreshItem}
        />

        <div className="flex w-full flex-col gap-3">
          <button
            type="button"
            className="flex w-full items-center justify-center rounded-full border border-gray-300 bg-background px-4 py-2.5 text-center text-sm font-semibold text-card-foreground transition-colors hover:bg-muted"
            onClick={() => (isWishlisted ? removeFromWishlist(item.id) : addToWishlist(item.id))}
            aria-pressed={isWishlisted}
          >
            {isWishlisted ? "♥ Saved" : "♡ Wishlist"}
          </button>
          <button
            type="button"
            className="flex w-full items-center justify-center rounded-full border border-gray-300 bg-background px-4 py-2.5 text-center text-sm font-semibold text-card-foreground transition-colors hover:bg-muted"
            onClick={() => navigator.share?.({ title: item.name, url: window.location.href })}
          >
            ↗ Share
          </button>
        </div>

        <ProductDetails item={item} />

        <TrendingProduct itemId={item.id} title="You may also like" />

        <ProductReviews item={item} />

        <MarketplaceItemContext item={item} availableStock={availableStock} />
      </section>
    </div>
  );
};

export default SingleItem;
