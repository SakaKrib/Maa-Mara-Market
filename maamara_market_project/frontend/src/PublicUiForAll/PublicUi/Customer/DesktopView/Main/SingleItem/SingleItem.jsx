import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";

import api from "../../../../../../Services/Api";
import { baseUrl } from "../../../../../../cmponents/Constant/Constant";
import { subscribeToRealtimeEvents } from "../../../../../../Services/useRealtimeEvents";
import { useCartContext } from "../CartHook/cart";
import ReviewSection from "../Review";
import AddToCartButton from "../CartActionButtons/AddToCartBtn";

const money = (value) => {
  const amount = Number(value || 0);
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 2,
  }).format(amount);
};

const normalizeList = (value) => {
  if (Array.isArray(value)) return value;
  if (value === null || value === undefined || value === "") return [];
  return [value];
};

const SingleItem = () => {
  const { itemId } = useParams();
  const { items, loading } = useItems();
  const { refreshCart } = useCartContext();

  const [item, setItem] = useState(null);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [selectedSize, setSelectedSize] = useState(null);
  const [selectedAge, setSelectedAge] = useState(null);
  const [selectedShoeSize, setSelectedShoeSize] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [refreshing, setRefreshing] = useState(false);

  const fetchItemDetails = useCallback(async () => {
    try {
      setRefreshing(true);
      const response = await api.get(`${baseUrl}/api/items/${itemId}/`);
      if (!response.data) return;

      const nextItem = response.data;
      setItem(nextItem);

      setSelectedVariant((current) => {
        const match = nextItem.variants?.find(
          (variant) => String(variant.id) === String(current?.id)
        );
        return match || nextItem.variants?.[0] || null;
      });
    } catch {
      // Keep the currently displayed product when a background refresh fails.
    } finally {
      setRefreshing(false);
    }
  }, [itemId]);

  useEffect(() => {
    if (!loading) {
      const found = items.find((candidate) => String(candidate.id) === String(itemId));
      if (found) {
        setItem(found);
        setSelectedVariant((current) => {
          const match = found.variants?.find(
            (variant) => String(variant.id) === String(current?.id)
          );
          return match || found.variants?.[0] || null;
        });
      } else {
        fetchItemDetails();
      }
    }
  }, [fetchItemDetails, itemId, items, loading]);

  useEffect(() => {
    return subscribeToRealtimeEvents((event) => {
      if (event.model !== "Item" || String(event.object_id) !== String(itemId)) return;
      fetchItemDetails();
    });
  }, [fetchItemDetails, itemId]);

  const previewImages = useMemo(
    () => [
      item?.image,
      ...(item?.images || []),
      ...(item?.variants || []).map((variant) => variant.image),
    ].filter(Boolean),
    [item]
  );

  const mainImageSrc =
    selectedImage ||
    selectedVariant?.image ||
    previewImages[0] ||
    "/placeholder-product.png";

  const variantStock = selectedVariant?.sizes?.reduce(
    (total, size) => total + Number(size.quantity_in_stock || 0),
    0
  ) || 0;

  const sizeOnlyStock = selectedSize?.quantity_in_stock;
  const availableStock =
    selectedSize?.quantity_in_stock ??
    selectedAge?.quantity_in_stock ??
    (selectedVariant?.sizes?.length ? variantStock : null) ??
    (item?.in_stock ?? 0);

  const requiresColorSize =
    Boolean(selectedVariant?.sizes?.length) && !selectedSize;

  const shoeSizes = normalizeList(item?.shoe_inputs?.[0]?.shoe_size);
  const requiresAge = (item?.age_variants || []).length > 0;
  const requiresShoe = shoeSizes.length > 0;

  const isDisabled =
    !item?.available ||
    availableStock <= 0 ||
    quantity > availableStock ||
    requiresColorSize ||
    (requiresAge && !selectedAge) ||
    (requiresShoe && !selectedShoeSize);

  const discountActive =
    Number(item?.final_discounted_price || 0) < Number(item?.final_price || 0);

  const handleColorChange = (variantId) => {
    const variant = item?.variants?.find(
      (candidate) => String(candidate.id) === String(variantId)
    );
    setSelectedVariant(variant || null);
    setSelectedSize(null);
    setSelectedImage(variant?.image || null);
  };

  const handleSizeChange = (size) => {
    setSelectedSize(size);
    setSelectedImage(size?.image || selectedVariant?.image || null);
  };

  if (loading && !item) {
    return <div className="min-h-[70vh] flex items-center justify-center text-gray-500">Loading product…</div>;
  }

  if (!item) {
    return <div className="min-h-[70vh] flex items-center justify-center text-gray-500">Product not found.</div>;
  }

  return (
    <main className="bg-white">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          <section className="lg:sticky lg:top-6 lg:self-start">
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-gray-50">
              <div className="aspect-square sm:aspect-[4/3]">
                <img
                  src={mainImageSrc}
                  alt={item.name}
                  className="h-full w-full object-cover"
                />
              </div>
            </div>

            {previewImages.length > 1 && (
              <div className="mt-4 grid grid-cols-5 gap-3">
                {previewImages.slice(0, 10).map((image, index) => (
                  <button
                    key={`${image}-${index}`}
                    type="button"
                    onClick={() => setSelectedImage(image)}
                    className={`aspect-square overflow-hidden rounded-xl border bg-white ${
                      selectedImage === image ? "border-black ring-2 ring-black/10" : "border-gray-200"
                    }`}
                  >
                    <img src={image} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className="space-y-7">
            <div>
              <div className="mb-3 flex flex-wrap gap-2 text-xs font-medium uppercase tracking-wide text-gray-500">
                {item.section && <span className="rounded-full bg-gray-100 px-3 py-1">{item.section}</span>}
                {item.category && <span className="rounded-full bg-gray-100 px-3 py-1">{item.category}</span>}
                {item.subcategory && <span className="rounded-full bg-gray-100 px-3 py-1">{item.subcategory}</span>}
                {item.is_organic && <span className="rounded-full bg-green-50 px-3 py-1 text-green-700">Organic</span>}
                {item.is_fresh_food && <span className="rounded-full bg-amber-50 px-3 py-1 text-amber-700">Fresh</span>}
              </div>

              <h1 className="text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">
                {item.name}
              </h1>

              {item.brand?.name && (
                <p className="mt-2 text-sm text-gray-500">by {item.brand.name}</p>
              )}

              <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-gray-600">
                <span>★ {item.average_rating ?? "New"}</span>
                <span>·</span>
                <span>{item.review_count ?? 0} reviews</span>
                <span>·</span>
                <span>{item.views ?? 0} views</span>
                <span>·</span>
                <span>{item.likes ?? 0} likes</span>
              </div>
            </div>

            <div className="flex flex-wrap items-end gap-3 border-y border-gray-200 py-5">
              <span className="text-3xl font-semibold text-gray-900">
                {money(discountActive ? item.final_discounted_price : item.final_price)}
              </span>
              {discountActive && (
                <>
                  <span className="text-lg text-gray-400 line-through">{money(item.final_price)}</span>
                  {item.save_upto > 0 && (
                    <span className="rounded-full bg-red-50 px-3 py-1 text-sm font-medium text-red-700">
                      Save {money(item.save_upto)}
                    </span>
                  )}
                </>
              )}
            </div>

            <p className="whitespace-pre-line text-[15px] leading-7 text-gray-600">
              {item.description}
            </p>

            {item.vendor && (
              <div className="rounded-2xl border border-gray-200 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Seller</p>
                <p className="mt-1 font-medium text-gray-900">{item.vendor}</p>
              </div>
            )}

            {item.variants?.length > 0 && (
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="font-medium text-gray-900">Color</h2>
                  {selectedVariant?.color && <span className="text-sm text-gray-500">{selectedVariant.color}</span>}
                </div>
                <div className="flex flex-wrap gap-3">
                  {item.variants.map((variant) => (
                    <button
                      key={variant.id}
                      type="button"
                      onClick={() => handleColorChange(variant.id)}
                      className={`h-11 min-w-11 rounded-full border px-3 text-sm capitalize ${
                        selectedVariant?.id === variant.id
                          ? "border-black ring-2 ring-black/10"
                          : "border-gray-300"
                      }`}
                      style={!variant.image ? { backgroundColor: variant.color } : undefined}
                      title={variant.color}
                    >
                      {variant.image ? (
                        <img src={variant.image} alt={variant.color} className="h-8 w-8 rounded-full object-cover" />
                      ) : (
                        <span className="sr-only">{variant.color}</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {selectedVariant?.sizes?.length > 0 && (
              <div>
                <h2 className="mb-3 font-medium text-gray-900">Size</h2>
                <div className="flex flex-wrap gap-2">
                  {selectedVariant.sizes.map((size) => (
                    <button
                      key={size.id}
                      type="button"
                      disabled={!size.quantity_in_stock}
                      onClick={() => handleSizeChange(size)}
                      className={`rounded-lg border px-4 py-2 text-sm ${
                        selectedSize?.id === size.id
                          ? "border-black bg-black text-white"
                          : size.quantity_in_stock
                            ? "border-gray-300 bg-white text-gray-900"
                            : "cursor-not-allowed border-gray-200 bg-gray-50 text-gray-300"
                      }`}
                    >
                      {typeof size.size === "object" ? JSON.stringify(size.size) : size.size}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {item.size_only_icon?.length > 0 && !selectedVariant?.sizes?.length && (
              <div>
                <h2 className="mb-3 font-medium text-gray-900">Available sizes</h2>
                <div className="flex flex-wrap gap-2">
                  {item.size_only_icon.map((size) => (
                    <button
                      key={size.id}
                      type="button"
                      disabled={!size.quantity_in_stock}
                      onClick={() => handleSizeChange(size)}
                      className={`rounded-lg border px-4 py-2 text-sm ${
                        selectedSize?.id === size.id ? "border-black bg-black text-white" : "border-gray-300"
                      }`}
                    >
                      {typeof size.size === "object" ? JSON.stringify(size.size) : size.size}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {requiresAge && (
              <div>
                <h2 className="mb-3 font-medium text-gray-900">Age group</h2>
                <div className="flex flex-wrap gap-2">
                  {item.age_variants.map((age) => (
                    <button
                      key={age.id}
                      type="button"
                      disabled={!age.quantity_in_stock}
                      onClick={() => setSelectedAge(age)}
                      className={`rounded-lg border px-4 py-2 text-sm ${
                        selectedAge?.id === age.id ? "border-black bg-black text-white" : "border-gray-300"
                      }`}
                    >
                      {age.age_group}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {requiresShoe && (
              <div>
                <h2 className="mb-3 font-medium text-gray-900">
                  {item.shoe_inputs?.[0]?.shoe_type || "Shoe size"}
                </h2>
                <div className="flex flex-wrap gap-2">
                  {shoeSizes.map((size) => (
                    <button
                      key={String(size)}
                      type="button"
                      onClick={() => setSelectedShoeSize(size)}
                      className={`rounded-lg border px-4 py-2 text-sm ${
                        String(selectedShoeSize) === String(size)
                          ? "border-black bg-black text-white"
                          : "border-gray-300"
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              {item.item_attribute && (
                <div className="rounded-xl bg-gray-50 p-4">
                  <p className="text-xs uppercase tracking-wide text-gray-500">Material / craft</p>
                  <p className="mt-1 font-medium capitalize">{item.item_attribute.replaceAll("_", " ")}</p>
                </div>
              )}
              {item.gender_based && item.gender_based !== "none" && (
                <div className="rounded-xl bg-gray-50 p-4">
                  <p className="text-xs uppercase tracking-wide text-gray-500">Gender</p>
                  <p className="mt-1 font-medium capitalize">{item.gender_based}</p>
                </div>
              )}
              {item.weight && (
                <div className="rounded-xl bg-gray-50 p-4">
                  <p className="text-xs uppercase tracking-wide text-gray-500">Weight</p>
                  <p className="mt-1 font-medium">{item.weight.value} {item.weight.unit}</p>
                </div>
              )}
              {item.length && (
                <div className="rounded-xl bg-gray-50 p-4">
                  <p className="text-xs uppercase tracking-wide text-gray-500">Length</p>
                  <p className="mt-1 font-medium">{item.length.value} {item.length.unit}</p>
                </div>
              )}
            </div>

            {(item.roast_type || item.coffee_state) && (
              <div className="rounded-2xl border border-gray-200 p-5">
                <h2 className="font-medium">Coffee details</h2>
                <div className="mt-3 grid gap-3 sm:grid-cols-2 text-sm">
                  {item.roast_type && <div><span className="text-gray-500">Roast:</span> {item.roast_type}</div>}
                  {item.coffee_state && <div><span className="text-gray-500">State:</span> {item.coffee_state.replaceAll("_", " ")}</div>}
                </div>
              </div>
            )}

            {item.shipping_dimension && (
              <div className="rounded-2xl border border-gray-200 p-5">
                <h2 className="font-medium">Shipping information</h2>
                <div className="mt-3 grid grid-cols-2 gap-3 text-sm text-gray-600 sm:grid-cols-4">
                  <div><span className="block text-xs text-gray-400">Length</span>{item.shipping_dimension.length} {item.shipping_dimension.unit}</div>
                  <div><span className="block text-xs text-gray-400">Width</span>{item.shipping_dimension.width} {item.shipping_dimension.unit}</div>
                  <div><span className="block text-xs text-gray-400">Height</span>{item.shipping_dimension.height} {item.shipping_dimension.unit}</div>
                  <div><span className="block text-xs text-gray-400">Weight</span>{item.shipping_dimension.weight} {item.shipping_dimension.weight_unit}</div>
                </div>
              </div>
            )}

            {(item.is_organic || item.manufactured_date || item.expiry_date) && (
              <div className="rounded-2xl border border-gray-200 p-5">
                <h2 className="font-medium">Product details</h2>
                <div className="mt-3 space-y-2 text-sm text-gray-600">
                  {item.manufactured_date && <p>Manufactured: {item.manufactured_date}</p>}
                  {item.expiry_date && <p>Expiry: {item.expiry_date}</p>}
                  {item.children_size_based_age && item.children_size_based_age !== "none" && (
                    <p>Children's age range: {item.children_size_based_age}</p>
                  )}
                </div>
              </div>
            )}

            <div className="rounded-2xl border border-gray-200 p-5">
              <div className="flex items-center justify-between">
                <h2 className="font-medium">Availability</h2>
                {refreshing && <span className="text-xs text-gray-400">Updating…</span>}
              </div>
              <p className={`mt-2 text-sm ${availableStock > 0 ? "text-green-700" : "text-red-600"}`}>
                {availableStock > 0 ? `${availableStock} available` : "Currently out of stock"}
              </p>
            </div>

            <div className="rounded-2xl bg-gray-50 p-5">
              <div className="mb-4 flex items-center justify-between">
                <span className="font-medium">Quantity</span>
                <span className="text-sm text-gray-500">
                  {availableStock > 0 ? `${Math.max(availableStock - quantity, 0)} left after this order` : "Unavailable"}
                </span>
              </div>

              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <div className="flex w-fit items-center rounded-full border border-gray-300 bg-white">
                  <button
                    type="button"
                    disabled={quantity <= 1}
                    onClick={() => setQuantity((current) => Math.max(1, current - 1))}
                    className="px-4 py-2 disabled:opacity-30"
                  >
                    −
                  </button>
                  <span className="min-w-10 text-center">{quantity}</span>
                  <button
                    type="button"
                    disabled={quantity >= availableStock}
                    onClick={() => setQuantity((current) => Math.min(current + 1, availableStock))}
                    className="px-4 py-2 disabled:opacity-30"
                  >
                    +
                  </button>
                </div>

                <AddToCartButton
                  itemId={item.id}
                  quantity={quantity}
                  variantId={selectedVariant?.id}
                  sizeId={selectedSize?.id}
                  ageVariantId={selectedAge?.id}
                  lengthId={item.length?.id}
                  weightId={item.weight?.id}
                  shoeId={item.shoe_inputs?.[0]?.id}
                  availableStock={availableStock}
                  remainingStock={Math.max(availableStock - quantity, 0)}
                  disabled={isDisabled}
                  onAddSuccess={() => {
                    refreshCart();
                    fetchItemDetails();
                  }}
                />
              </div>

              {requiresColorSize && (
                <p className="mt-3 text-sm text-red-600">Choose a size before adding this product.</p>
              )}
              {requiresAge && !selectedAge && (
                <p className="mt-1 text-sm text-red-600">Choose an age group before adding this product.</p>
              )}
              {requiresShoe && !selectedShoeSize && (
                <p className="mt-1 text-sm text-red-600">Choose a shoe size before adding this product.</p>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-gray-200 p-5">
                <h2 className="font-medium">Returns</h2>
                <p className="mt-2 text-sm leading-6 text-gray-600">
                  {item.returnable
                    ? "This product is eligible for return according to the marketplace return policy."
                    : "This product is marked non-returnable. Contact support if it arrives damaged or incorrect."}
                </p>
              </div>
              <div className="rounded-2xl border border-gray-200 p-5">
                <h2 className="font-medium">Offer</h2>
                <p className="mt-2 text-sm leading-6 text-gray-600">
                  {item.offer?.discount_percentage
                    ? `${item.offer.discount_percentage}% off during the active offer period.`
                    : item.in_offer
                      ? "This product is currently marked as on offer."
                      : "No active offer."}
                </p>
              </div>
            </div>

            <ReviewSection item={item} />
          </section>
        </div>
      </div>
    </main>
  );
};

export default SingleItem;
