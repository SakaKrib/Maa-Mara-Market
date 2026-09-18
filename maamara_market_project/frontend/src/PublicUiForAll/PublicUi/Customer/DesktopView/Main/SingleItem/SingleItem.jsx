import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";

import api from "../../../../../../Services/Api";
import { baseUrl } from "../../../../../../cmponents/Constant/Constant";
import { subscribeToRealtimeEvents } from "../../../../../../Services/useRealtimeEvents";
import useItems from "../../../../ItemHook/ItemHook";
import { useCartContext } from "../CartHook/cart";
import ReviewSection from "../Review";
import AddToCartButton from "../CartActionButtons/AddToCartBtn";

const formatMoney = (value) =>
  new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

const asList = (value) => (Array.isArray(value) ? value : value == null ? [] : [value]);

const SingleItem = () => {
  const { itemId } = useParams();
  const { items, loading } = useItems();
  const { refreshCart } = useCartContext();

  const [item, setItem] = useState(null);
  const [variant, setVariant] = useState(null);
  const [size, setSize] = useState(null);
  const [age, setAge] = useState(null);
  const [shoeSize, setShoeSize] = useState(null);
  const [image, setImage] = useState(null);
  const [quantity, setQuantity] = useState(1);

  const loadItem = useCallback(async () => {
    try {
      const response = await api.get(`${baseUrl}/api/items/${itemId}/`);
      if (!response.data) return;
      setItem(response.data);
      setVariant((current) =>
        response.data.variants?.find((v) => String(v.id) === String(current?.id)) ||
        response.data.variants?.[0] ||
        null
      );
    } catch {
      // Keep the current product if a background refresh fails.
    }
  }, [itemId]);

  useEffect(() => {
    if (loading) return;
    const found = items.find((candidate) => String(candidate.id) === String(itemId));
    if (found) {
      setItem(found);
      setVariant((current) =>
        found.variants?.find((v) => String(v.id) === String(current?.id)) ||
        found.variants?.[0] ||
        null
      );
    } else {
      loadItem();
    }
  }, [items, itemId, loading, loadItem]);

  useEffect(() => {
    return subscribeToRealtimeEvents((event) => {
      if (event.model === "Item" && String(event.object_id) === String(itemId)) {
        loadItem();
      }
    });
  }, [itemId, loadItem]);

  const gallery = useMemo(
    () => [item?.image, ...(item?.images || []), ...(item?.variants || []).map((v) => v.image)].filter(Boolean),
    [item]
  );

  const variantStock = variant?.sizes?.reduce(
    (total, current) => total + Number(current.quantity_in_stock || 0),
    0
  ) || 0;

  const stock =
    size?.quantity_in_stock ??
    age?.quantity_in_stock ??
    (variant?.sizes?.length ? variantStock : null) ??
    Number(item?.in_stock || 0);

  const shoeSizes = asList(item?.shoe_inputs?.[0]?.shoe_size);
  const needsSize = Boolean(variant?.sizes?.length) && !size;
  const needsAge = item?.age_variants?.length > 0 && !age;
  const needsShoe = shoeSizes.length > 0 && shoeSize == null;
  const discounted = Number(item?.final_discounted_price || 0) < Number(item?.final_price || 0);
  const disabled = !item?.available || stock <= 0 || quantity > stock || needsSize || needsAge || needsShoe;

  if (loading && !item) {
    return <div className="flex min-h-[70vh] items-center justify-center text-gray-500">Loading product…</div>;
  }

  if (!item) {
    return <div className="flex min-h-[70vh] items-center justify-center text-gray-500">Product not found.</div>;
  }

  const mainImage = image || variant?.image || gallery[0];

  return (
    <main className="bg-white">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-2">
          <section className="lg:sticky lg:top-6 lg:self-start">
            <div className="overflow-hidden rounded-3xl border border-gray-200 bg-gray-50">
              <div className="aspect-square">
                {mainImage ? (
                  <img src={mainImage} alt={item.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-gray-400">No image</div>
                )}
              </div>
            </div>
            {gallery.length > 1 && (
              <div className="mt-4 grid grid-cols-5 gap-3">
                {gallery.slice(0, 10).map((src, index) => (
                  <button
                    key={`${src}-${index}`}
                    type="button"
                    onClick={() => setImage(src)}
                    className={`aspect-square overflow-hidden rounded-xl border ${image === src ? "border-black ring-2 ring-black/10" : "border-gray-200"}`}
                  >
                    <img src={src} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className="space-y-7">
            <div>
              <div className="mb-3 flex flex-wrap gap-2 text-xs font-medium uppercase tracking-wide text-gray-500">
                {[item.section, item.department, item.category, item.subcategory].filter(Boolean).map((label) => (
                  <span key={label} className="rounded-full bg-gray-100 px-3 py-1">{label}</span>
                ))}
                {item.is_organic && <span className="rounded-full bg-green-50 px-3 py-1 text-green-700">Organic</span>}
                {item.is_fresh_food && <span className="rounded-full bg-amber-50 px-3 py-1 text-amber-700">Fresh</span>}
              </div>
              <h1 className="text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">{item.name}</h1>
              {item.brand?.name && <p className="mt-2 text-sm text-gray-500">by {item.brand.name}</p>}
              <div className="mt-3 flex flex-wrap gap-3 text-sm text-gray-500">
                <span>★ {item.average_rating ?? "New"}</span>
                <span>{item.review_count ?? 0} reviews</span>
                <span>{item.views ?? 0} views</span>
                <span>{item.likes ?? 0} likes</span>
              </div>
            </div>

            <div className="flex flex-wrap items-end gap-3 border-y border-gray-200 py-5">
              <strong className="text-3xl text-gray-900">
                {formatMoney(discounted ? item.final_discounted_price : item.final_price)}
              </strong>
              {discounted && <span className="text-lg text-gray-400 line-through">{formatMoney(item.final_price)}</span>}
              {item.save_upto > 0 && <span className="rounded-full bg-red-50 px-3 py-1 text-sm text-red-700">Save {formatMoney(item.save_upto)}</span>}
            </div>

            <p className="whitespace-pre-line text-[15px] leading-7 text-gray-600">{item.description}</p>

            {item.vendor && (
              <div className="rounded-2xl border border-gray-200 p-4">
                <p className="text-xs uppercase tracking-wide text-gray-400">Seller</p>
                <p className="mt-1 font-medium">{item.vendor}</p>
              </div>
            )}

            {item.variants?.length > 0 && (
              <div>
                <h2 className="mb-3 font-medium">Color</h2>
                <div className="flex flex-wrap gap-3">
                  {item.variants.map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => { setVariant(v); setSize(null); setImage(v.image || null); }}
                      title={v.color}
                      className={`h-11 w-11 overflow-hidden rounded-full border ${variant?.id === v.id ? "border-black ring-2 ring-black/10" : "border-gray-300"}`}
                      style={!v.image ? { backgroundColor: v.color } : undefined}
                    >
                      {v.image && <img src={v.image} alt={v.color} className="h-full w-full object-cover" />}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {variant?.sizes?.length > 0 && (
              <div>
                <h2 className="mb-3 font-medium">Size</h2>
                <div className="flex flex-wrap gap-2">
                  {variant.sizes.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      disabled={!s.quantity_in_stock}
                      onClick={() => setSize(s)}
                      className={`rounded-lg border px-4 py-2 text-sm ${size?.id === s.id ? "border-black bg-black text-white" : "border-gray-300"} disabled:cursor-not-allowed disabled:opacity-40`}
                    >
                      {typeof s.size === "object" ? JSON.stringify(s.size) : s.size}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {item.size_only_icon?.length > 0 && !variant?.sizes?.length && (
              <div>
                <h2 className="mb-3 font-medium">Available sizes</h2>
                <div className="flex flex-wrap gap-2">
                  {item.size_only_icon.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      disabled={!s.quantity_in_stock}
                      onClick={() => setSize(s)}
                      className={`rounded-lg border px-4 py-2 text-sm ${size?.id === s.id ? "border-black bg-black text-white" : "border-gray-300"} disabled:opacity-40`}
                    >
                      {typeof s.size === "object" ? JSON.stringify(s.size) : s.size}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {item.age_variants?.length > 0 && (
              <div>
                <h2 className="mb-3 font-medium">Age group</h2>
                <div className="flex flex-wrap gap-2">
                  {item.age_variants.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      disabled={!a.quantity_in_stock}
                      onClick={() => setAge(a)}
                      className={`rounded-lg border px-4 py-2 text-sm ${age?.id === a.id ? "border-black bg-black text-white" : "border-gray-300"} disabled:opacity-40`}
                    >
                      {a.age_group}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {shoeSizes.length > 0 && (
              <div>
                <h2 className="mb-3 font-medium">{item.shoe_inputs?.[0]?.shoe_type || "Shoe size"}</h2>
                <div className="flex flex-wrap gap-2">
                  {shoeSizes.map((shoe) => (
                    <button
                      key={String(shoe)}
                      type="button"
                      onClick={() => setShoeSize(shoe)}
                      className={`rounded-lg border px-4 py-2 text-sm ${String(shoeSize) === String(shoe) ? "border-black bg-black text-white" : "border-gray-300"}`}
                    >
                      {shoe}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              {item.item_attribute && <Info label="Material / craft" value={item.item_attribute.replaceAll("_", " ")} />}
              {item.gender_based && item.gender_based !== "none" && <Info label="Gender" value={item.gender_based} />}
              {item.children_size_based_age && item.children_size_based_age !== "none" && <Info label="Age range" value={item.children_size_based_age} />}
              {item.weight && <Info label="Weight" value={`${item.weight.value} ${item.weight.unit}`} />}
              {item.length && <Info label="Length" value={`${item.length.value} ${item.length.unit}`} />}
              {item.roast_type && <Info label="Roast" value={item.roast_type} />}
              {item.coffee_state && <Info label="Coffee state" value={item.coffee_state.replaceAll("_", " ")} />}
            </div>

            {item.shipping_dimension && (
              <div className="rounded-2xl border border-gray-200 p-5">
                <h2 className="font-medium">Shipping information</h2>
                <div className="mt-3 grid grid-cols-2 gap-4 text-sm text-gray-600 sm:grid-cols-4">
                  <Info label="Length" value={`${item.shipping_dimension.length} ${item.shipping_dimension.unit}`} />
                  <Info label="Width" value={`${item.shipping_dimension.width} ${item.shipping_dimension.unit}`} />
                  <Info label="Height" value={`${item.shipping_dimension.height} ${item.shipping_dimension.unit}`} />
                  <Info label="Weight" value={`${item.shipping_dimension.weight} ${item.shipping_dimension.weight_unit}`} />
                </div>
              </div>
            )}

            {(item.manufactured_date || item.expiry_date) && (
              <div className="rounded-2xl border border-gray-200 p-5 text-sm text-gray-600">
                <h2 className="font-medium text-gray-900">Product details</h2>
                {item.manufactured_date && <p className="mt-2">Manufactured: {item.manufactured_date}</p>}
                {item.expiry_date && <p className="mt-1">Expiry: {item.expiry_date}</p>}
              </div>
            )}

            <div className="rounded-2xl bg-gray-50 p-5">
              <div className="flex items-center justify-between">
                <span className="font-medium">Availability</span>
                <span className={stock > 0 ? "text-sm text-green-700" : "text-sm text-red-600"}>
                  {stock > 0 ? `${stock} available` : "Out of stock"}
                </span>
              </div>
              <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center">
                <div className="flex w-fit items-center rounded-full border bg-white">
                  <button type="button" disabled={quantity <= 1} onClick={() => setQuantity((q) => Math.max(1, q - 1))} className="px-4 py-2 disabled:opacity-30">−</button>
                  <span className="min-w-10 text-center">{quantity}</span>
                  <button type="button" disabled={quantity >= stock} onClick={() => setQuantity((q) => Math.min(q + 1, stock))} className="px-4 py-2 disabled:opacity-30">+</button>
                </div>
                <AddToCartButton
                  itemId={item.id}
                  quantity={quantity}
                  variantId={variant?.id}
                  sizeId={size?.id}
                  ageVariantId={age?.id}
                  lengthId={item.length?.id}
                  weightId={item.weight?.id}
                  shoeId={item.shoe_inputs?.[0]?.id}
                  selectedShoeSize={shoeSize}
                  availableStock={stock}
                  remainingStock={Math.max(stock - quantity, 0)}
                  disabled={disabled}
                  onAddSuccess={() => { refreshCart(); loadItem(); }}
                />
              </div>
              {needsSize && <p className="mt-3 text-sm text-red-600">Select a size.</p>}
              {needsAge && <p className="mt-1 text-sm text-red-600">Select an age group.</p>}
              {needsShoe && <p className="mt-1 text-sm text-red-600">Select a shoe size.</p>}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Info label="Returns" value={item.returnable ? "Eligible according to the marketplace return policy." : "Marked non-returnable."} />
              <Info label="Offer" value={item.offer?.discount_percentage ? `${item.offer.discount_percentage}% off` : item.in_offer ? "Currently on offer" : "No active offer"} />
            </div>

            <ReviewSection item={item} />
          </section>
        </div>
      </div>
    </main>
  );
};

const Info = ({ label, value }) => (
  <div className="rounded-2xl bg-gray-50 p-4">
    <p className="text-xs uppercase tracking-wide text-gray-400">{label}</p>
    <p className="mt-1 capitalize text-sm font-medium text-gray-800">{value}</p>
  </div>
);

export default SingleItem;
