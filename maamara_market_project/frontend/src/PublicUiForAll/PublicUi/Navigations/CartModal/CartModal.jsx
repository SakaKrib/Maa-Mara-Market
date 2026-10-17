import { useCartContext } from "../../Customer/DesktopView/Main/CartHook/cart";
import { useCartActions } from "../../Customer/DesktopView/Main/CartActionButtons/UpdateQty";
import RemoveFromCartButton from "../../Customer/DesktopView/Main/CartActionButtons/RemoveFromBtn";
import { resolveApiAssetUrl } from "../../../../Services/Api";
import { Link, useNavigate } from "react-router-dom";
import "./cart-modal.css";

const getImageCandidates = (item) => {
  const values = [
    item?.image,
    item?.item?.image,
    item?.product_image,
    item?.image_url,
  ];
  return [...new Set(values.map(resolveApiAssetUrl).filter(Boolean))];
};

const CartModal = () => {
  const { order, loading, refreshCart } = useCartContext();
  const { updateQuantity } = useCartActions();
  const navigate = useNavigate();
  const items = Array.isArray(order?.items) ? order.items : [];

  if (loading) {
    return (
      <div className="mm-cart-modal mm-cart-modal--state" role="status">
        <p>Loading cart…</p>
      </div>
    );
  }

  if (!order || items.length === 0) {
    return (
      <div className="mm-cart-modal mm-cart-modal--state">
        <p>Your cart is empty.</p>
        <Link className="mm-cart-modal__view-cart" to="/shopping-cart">Start shopping</Link>
      </div>
    );
  }

  const subtotal = Number(order.order?.total ?? order.order?.final_total ?? 0);
  const totalQty = Number(
    order.order?.total_qty ?? items.reduce((sum, item) => sum + Number(item.quantity || 0), 0)
  );

  const truncateWords = (text, numWords) => {
    if (!text) return "";
    const words = String(text).trim().split(/\s+/);
    return words.length > numWords
      ? words.slice(0, numWords).join(" ") + "…"
      : String(text);
  };

  const handleCheckout = () => {
    navigate(order?.exchange_credit > 0 ? "/shopping-cart" : "/checkout-page");
  };

  return (
    <section className="mm-cart-modal" aria-label="Shopping cart">
      <h2 className="mm-cart-modal__heading">Shopping Cart ({totalQty} items)</h2>

      <div className="mm-cart-modal__items">
        {items.map((item) => {
          const availableStock = Array.isArray(item.variants) && item.variants.length > 0
            ? item.variants.reduce((total, variant) => total + Number(variant.quantity_in_stock || 0), 0)
            : Number(item.in_stock || 0);
          const imageCandidates = getImageCandidates(item);
          const productName = item.name || item.item?.name || "Item";
          const productId = item.item?.id || item.item_id || item.id;

          return (
            <article key={item.cart_item_id || item.id || productId} className="mm-cart-modal__item">
              {imageCandidates.length > 0 ? (
                <Link to={`/item/${productId}`} className="mm-cart-modal__image-link" aria-label={`View ${productName}`}>
                  <img
                    src={imageCandidates[0]}
                    alt={productName}
                    width="96"
                    height="96"
                    loading="eager"
                    className="mm-cart-modal__image"
                    onError={(event) => {
                      const failedIndex = Number(event.currentTarget.dataset.candidateIndex || 0);
                      const nextIndex = failedIndex + 1;
                      if (nextIndex < imageCandidates.length) {
                        event.currentTarget.dataset.candidateIndex = String(nextIndex);
                        event.currentTarget.src = imageCandidates[nextIndex];
                      } else {
                        event.currentTarget.classList.add("mm-cart-modal__image--unavailable");
                        event.currentTarget.alt = `${productName} image unavailable`;
                      }
                    }}
                  />
                </Link>
              ) : (
                <div className="mm-cart-modal__image-placeholder" aria-label="Product image unavailable">
                  <span aria-hidden="true">▧</span>
                </div>
              )}

              <div className="mm-cart-modal__details">
                <div className="mm-cart-modal__item-top">
                  <h3 className="mm-cart-modal__product-name">{truncateWords(productName, 4)}</h3>
                  <span className="mm-cart-modal__price">
                    KES {Number(item.final_price || 0).toLocaleString()}
                  </span>
                </div>

                {item.description && (
                  <p className="mm-cart-modal__description">{truncateWords(item.description, 12)}</p>
                )}

                <div className="mm-cart-modal__item-bottom">
                  <div className="mm-cart-modal__quantity" aria-label="Item quantity">
                    <button
                      type="button"
                      onClick={async () => {
                        await updateQuantity(item.id, "decrease");
                        await refreshCart();
                      }}
                      aria-label={`Decrease quantity of ${productName}`}
                      disabled={Number(item.quantity) <= 1}
                    >−</button>
                    <span>{Number(item.quantity || 0)}</span>
                    <button
                      type="button"
                      onClick={async () => {
                        await updateQuantity(item.id, "increase");
                        await refreshCart();
                      }}
                      aria-label={`Increase quantity of ${productName}`}
                      disabled={Number(item.quantity) >= availableStock}
                    >+</button>
                  </div>

                  <span className="mm-cart-modal__stock">
                    {Math.max(availableStock - Number(item.quantity || 0), 0)} left
                  </span>

                  {item.id && (
                    <RemoveFromCartButton itemId={item.id} onRemoved={refreshCart} />
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <div className="mm-cart-modal__summary">
        <div className="mm-cart-modal__subtotal">
          <span>Subtotal</span>
          <strong>KES {subtotal.toLocaleString()}</strong>
        </div>
        <p className="mm-cart-modal__note">
          Thank you for shopping at Maa Mara Market. Proceed to checkout when you’re ready.
        </p>
        <div className="mm-cart-modal__actions">
          <Link to="/shopping-cart" className="mm-cart-modal__view-cart">View cart</Link>
          <button type="button" className="mm-cart-modal__checkout" onClick={handleCheckout}>
            Checkout
          </button>
        </div>
      </div>
    </section>
  );
};

export default CartModal;
