import React, { useState } from "react";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { useCartContext } from "./cart";
import { useCartActions } from "../CartActionButtons/UpdateQty";
import RemoveFromCartButton from "../CartActionButtons/RemoveFromBtn";
import { Link } from "react-router-dom";
import FormattedCurrency from "../Currency/FormattedCurrency";
import { useCurrency } from "../Currency/CurrencyContext";
import api from "../../../../../../Services/Api";

const imageUrl = (image) => image || "";

const CartPage = () => {
  const { order, loading, error, refreshCart } = useCartContext();
  const { currency, rates } = useCurrency();
  const { updateQuantity, loading: actionLoading, error: actionError } = useCartActions();
  const [selectedVoucher, setSelectedVoucher] = useState("");
  const [useWallet, setUseWallet] = useState(false);
  const [removingAll, setRemovingAll] = useState(false);

  const handleRemoveAll = async () => {
    if (removingAll || items.length === 0) return;
    if (!window.confirm("Remove all items from your cart?")) return;
    try {
      setRemovingAll(true);
      await api.delete("/api/cart/remove-all/", { withCredentials: true });
      await refreshCart();
    } catch (err) {
      console.error("Remove all cart error:", err);
    } finally {
      setRemovingAll(false);
    }
  };

  if (loading) return <div className="mm-page min-h-screen py-16 text-center text-gray-500">Loading your cart…</div>;

  const items = Array.isArray(order?.items) ? order.items : [];
  if (!order || items.length === 0) {
    return (
      <div className="mm-page min-h-screen py-16">
        <div className="mm-container max-w-xl text-center">
          <div className="mm-card p-8">
            <div className="text-5xl mb-4">🛒</div>
            <h1 className="text-2xl font-bold mb-2">Your cart is empty</h1>
            <p className="text-gray-500 mb-6">Find something special and it will appear here.</p>
            <Link to="/" className="primary-button inline-flex px-6 py-3 rounded-md text-white">Start shopping</Link>
          </div>
        </div>
      </div>
    );
  }

  const subtotal = Number(order.order?.final_total || 0);
  const totalQty = Number(order.order?.total_qty || items.reduce((sum, item) => sum + Number(item.quantity || 0), 0));
  const exchangeCredit = Number(order.exchange_credit || 0);
  const wallet = Number(order.wallet?.balance || 0);
  const vouchers = Array.isArray(order.vouchers) ? order.vouchers : [];

  return (
    <main className="mm-page min-h-screen py-6 md:py-10">
      <div className="mm-container">
        <div className="mb-6 flex items-start justify-between gap-4 border-b border-border pb-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Your cart</h1>
            <p>{totalQty} {totalQty === 1 ? "item" : "items"} selected</p>
          </div>
          <div className="flex items-center gap-3"><button type="button" onClick={handleRemoveAll} disabled={removingAll || items.length === 0} aria-label="Delete all items from cart" className="inline-flex items-center gap-1.5 rounded-full border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"><DeleteOutlineIcon fontSize="small" /><span className="hidden sm:inline">{removingAll ? "Deleting..." : "Delete all"}</span></button><Link to="/" className="hidden sm:inline text-sm font-semibold hover:underline">Continue shopping</Link></div>
        </div>

        {(error || actionError) && (
          <div role="alert" className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {actionError || "We could not refresh your cart. Please try again."}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] items-start">
          <section className="space-y-3">
            {items.map((item) => {
              const variantStock = Array.isArray(item.variants) ? item.variants.reduce((sum, v) => sum + Number(v.quantity_in_stock || 0), 0) : 0;
              const availableStock = Number(item.selected_size?.quantity_in_stock ?? item.in_stock ?? variantStock);
              const quantity = Number(item.quantity || 0);
              const remaining = Math.max(availableStock - quantity, 0);
              const color = item.variant_color || item.color_variant?.color || item.selected_color || item.color || item.variant?.color;
              const size = item.size || item.size_stock?.size || item.selected_size?.size;
              const ageGroup = item.age_group || item.age_variant?.age_group;
              const shoeSize = item.shoe_size;
              const selectedWeight = item.selected_weight;
              const selectedLength = item.selected_length;
              const customPreferences =
                item.custom_preferences && typeof item.custom_preferences === "object"
                  ? item.custom_preferences.instructions || ""
                  : "";
              const selectionDetails = [
                color && `Color: ${color}`,
                size && `Size: ${size}`,
                ageGroup && `Age/size: ${ageGroup}`,
                shoeSize && `Shoe size: ${shoeSize}`,
                selectedWeight && `Weight: ${selectedWeight}`,
                selectedLength && `Length: ${selectedLength}`,
              ].filter(Boolean);
              const lineId = item.ordered_item_id || item.cart_item_id || item.id;
              const productId = item.item?.id || item.item_id || item.id;

              return (
                <article key={lineId} className="mm-card p-3 sm:p-4">
                  <div className="flex gap-3 sm:gap-5">
                    <Link to={`/item/${productId}`} className="shrink-0">
                      <img src={imageUrl(item.image || item.item?.image)} alt={item.name || item.item?.name || "Product"} className="w-24 h-24 sm:w-32 sm:h-32 rounded-md object-cover bg-gray-100" />
                    </Link>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col sm:flex-row sm:justify-between gap-2">
                        <div>
                          <Link to={`/item/${productId}`} className="font-semibold text-base sm:text-lg hover:underline">
                            {item.name || item.item?.name || "Product"}
                          </Link>
                          <p className="text-xs sm:text-sm text-gray-500 mt-1">
                            {selectionDetails.join(" · ") || "Standard selection"}
                          </p>
                          {customPreferences && (
                            <p className="mt-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs leading-5 text-muted-foreground">
                              <span className="font-semibold text-card-foreground">Custom request:</span>{" "}
                              {customPreferences}
                            </p>
                          )}
                        </div>
                        <strong className="text-base sm:text-lg"><FormattedCurrency value={Number(item.final_price)} /></strong>
                      </div>

                      <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-gray-500">Quantity</span>
                          <div className="inline-flex items-center border border-gray-300 rounded-md overflow-hidden">
                            <button type="button" aria-label="Decrease quantity" disabled={actionLoading || quantity <= 1} onClick={() => updateQuantity(productId, "decrease", { cartItemId: lineId, variantId: item.variant_id, sizeId: item.size_id, ageVariantId: item.age_variant_id, selectedLength: item.selected_length, selectedWeight: item.selected_weight, shoeSize: item.shoe_size })} className="w-9 h-9 hover:bg-gray-50 disabled:opacity-40">−</button>
                            <span className="w-10 text-center text-sm font-semibold">{quantity}</span>
                            <button type="button" aria-label="Increase quantity" disabled={actionLoading || remaining <= 0} onClick={() => updateQuantity(productId, "increase", { cartItemId: lineId, variantId: item.variant_id, sizeId: item.size_id, ageVariantId: item.age_variant_id, selectedLength: item.selected_length, selectedWeight: item.selected_weight, shoeSize: item.shoe_size })} className="w-9 h-9 hover:bg-gray-50 disabled:opacity-40">+</button>
                          </div>
                          <span className="text-xs text-gray-500">{remaining > 0 ? `${remaining} left` : "Stock limit reached"}</span>
                        </div>
                        <RemoveFromCartButton itemId={productId} cartItemId={lineId} variantId={item.variant_id} sizeId={item.size_id} ageVariantId={item.age_variant_id} selectedLength={item.selected_length} selectedWeight={item.selected_weight} shoeSize={item.shoe_size} />
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </section>

          <aside className="mm-card p-5 sm:p-6 lg:sticky lg:top-6">
            <h2 className="text-lg font-bold mb-5">Order summary</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span>Subtotal</span><strong><FormattedCurrency value={Number(subtotal)} /></strong></div>
              {exchangeCredit > 0 && <div className="flex justify-between text-green-700"><span>Exchange credit</span><span>− <FormattedCurrency value={Number(exchangeCredit)} /></span></div>}
            </div>

            {vouchers.length > 0 && (
              <label className="block mt-5 text-sm font-medium">
                Voucher
                <select value={selectedVoucher} onChange={(e) => setSelectedVoucher(e.target.value)} className="mt-2 w-full rounded-md border border-gray-300 bg-white px-3 py-2">
                  <option value="">Select a voucher</option>
                  {vouchers.map((voucher) => {
                    const discount = Number(voucher.discount || 0);
                    const rate = currency === "KES" ? 1 : (rates?.[currency] ?? 1);
                    const formattedDiscount = new Intl.NumberFormat(undefined, {
                      style: "currency",
                      currency,
                    }).format((Number.isFinite(discount) ? discount : 0) * rate);
                    return (
                      <option key={voucher.code} value={voucher.code}>
                        {voucher.code} — {formattedDiscount}
                      </option>
                    );
                  })}
                </select>
              </label>
            )}

            {wallet > 0 && (
              <label className="flex items-center justify-between gap-3 mt-5 text-sm">
                <span>Use wallet balance (<FormattedCurrency value={Number(wallet)} />)</span>
                <input type="checkbox" checked={useWallet} onChange={(e) => setUseWallet(e.target.checked)} />
              </label>
            )}

            <div className="mm-divider" />
            <div className="flex justify-between items-baseline">
              <span className="font-semibold">Total</span>
              <strong className="text-xl"><FormattedCurrency value={Number(subtotal)} /></strong>
            </div>
            <p className="text-xs text-gray-500 mt-2">Shipping and final payment details are confirmed at checkout.</p>
            <Link to="/checkout-page" onClick={() => sessionStorage.removeItem("maaMaraBuyNow")} className="primary-button mt-5 hidden w-full justify-center rounded-md px-5 py-3 text-white font-semibold sm:flex">Proceed to checkout</Link>
          </aside>
        </div>

        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-white/95 p-3 shadow-lg backdrop-blur sm:hidden">
          <div className="mx-auto flex max-w-xl items-center gap-2">
            <button
              type="button"
              onClick={handleRemoveAll}
              disabled={removingAll || items.length === 0}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-red-200 text-red-600 disabled:opacity-50"
              aria-label="Delete all items from cart"
            >
              <DeleteOutlineIcon />
            </button>
            <Link
              to="/checkout-page"
              onClick={() => sessionStorage.removeItem("maaMaraBuyNow")}
              className="primary-button flex min-h-12 flex-1 items-center justify-center rounded-full px-5 text-white font-semibold"
            >
              Proceed to checkout
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
};

export default CartPage;
