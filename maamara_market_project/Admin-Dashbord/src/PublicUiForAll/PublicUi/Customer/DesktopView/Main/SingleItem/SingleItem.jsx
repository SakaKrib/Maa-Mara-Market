import React from "react";
import { Link } from "react-router-dom";
import useSingleItem from "./useSingleItem";
import ProductGallery from "./ProductGallery";
import ProductOptions from "./ProductOptions";
import QuantityAndCart from "./QuantityAndCart";
import ProductDetails from "./ProductDetails";
import ProductReviews from "./ProductReviews";
import FormattedCurrency from "../Currency/FormattedCurrency";
import { useWishlistContext } from "../../../../../../cmponents/Hooks/WishListHook/Wishlist";
import MarketplaceItemContext from "./MarketplaceItemContext";

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
        <div>
          <h1 className="text-4xl font-medium">{item.name}</h1>
          <p className="text-gray-500 mt-3">{item.description}</p>
        </div>

        <div className="h-[2px] bg-gray-100" />

        <div>
          <h5 className="text-sm">Reviews: ({item.review_count ?? 0})</h5>
          <h3 className={`text-lg mt-2 ${availableStock < 5 ? "text-red-500" : "text-green-500"}`}>
            {availableStock} In stock
          </h3>
        </div>

        <div className="flex items-center gap-4">
          {hasDiscount && <h3 className="text-lg text-gray-400 line-through"><FormattedCurrency value={Number(item.final_price)} /></h3>}
          <h2 className={`font-medium text-2xl ${hasDiscount ? "text-red-600" : ""}`}>
            <FormattedCurrency value={Number(hasDiscount ? item.final_discounted_price : item.final_price)} />
          </h2>
        </div>

        <div className="flex flex-col gap-6 mt-2">
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

          <ul className="flex gap-6 mt-2 text-sm">
            <li><button type="button" className="hover:underline" onClick={() => (isWishlisted ? removeFromWishlist(item.id) : addToWishlist(item.id))} aria-pressed={isWishlisted}>{isWishlisted ? "♥ Saved" : "♡ Wishlist"}</button></li>
            <li><button type="button" className="hover:underline" onClick={() => navigator.share?.({ title: item.name, url: window.location.href })}>↗ Share</button></li>
          </ul>
        </div>

        <ProductDetails item={item} />

        <div className="text-sm">
          <Link to="/return-policy" className="underline text-blue-500">Read our return policy</Link>
        </div>

        <ProductReviews item={item} />

        <MarketplaceItemContext item={item} availableStock={availableStock} />
      </section>
    </div>
  );
};

export default SingleItem;