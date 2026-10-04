import { useCartContext } from "../../Customer/DesktopView/Main/CartHook/cart";
import { useCartActions } from "../../Customer/DesktopView/Main/CartActionButtons/UpdateQty";
import RemoveFromCartButton from "../../Customer/DesktopView/Main/CartActionButtons/RemoveFromBtn";
import { baseUrl } from "../../../../cmponents/Constant/Constant";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";

const CartModal = () => {
  const { order, loading, refreshCart } = useCartContext();
  const { updateQuantity } = useCartActions();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="w-[500px] absolute p-4 rounded-md shadow bg-white top-12 right-0 flex flex-col gap-6 z-20">
        <p>Loading cart...</p>
      </div>
    );
  }

  if (!order || order.items.length === 0) {
    return (
      <div className="w-[500px] absolute p-4 rounded-md shadow bg-white top-12 right-0 flex flex-col gap-6 z-20">
        <p>Cart is empty</p>
      </div>
    );
  }

  const subtotal = order.order?.total || 0;
  const totalQty = order.order?.total_qty || 0;

  const truncateWords = (text, numWords) => {
    if (!text) return "";
    const words = text.split(" ");
    return words.length > numWords
      ? words.slice(0, numWords).join(" ") + "..."
      : text;
  };

  // create a handle checkout fuction

  //  navigation when exchange
  const handlediscounts = () => {
    if(order?.exchange_credit > 0){
      navigate("/shopping-cart")
    }else{
      navigate("/checkout-page")
    }
  }
  

  return (
    <div className="w-[500px] absolute p-4 rounded-md shadow-[0_3px_10px_rgb(0,0,0,0.2)] bg-white top-12 right-0 flex flex-col gap-6 z-20">
      <h2 className="text-xl font-semibold border-b border-b-black-100">
        Shopping Cart ({totalQty} items)
      </h2>

      <div
        className="flex flex-col gap-6 overflow-y-auto"
        style={{ maxHeight: "60vh" }}
      >
        {order.items.map((item) => {
          let availableStock = item.in_stock || 0;
          if (item.variants && item.variants.length > 0) {
            availableStock = item.variants.reduce(
              (total, variant) => total + (variant.quantity_in_stock || 0),
              0
            );
          }

          return (
            <div key={item.id} className="flex gap-4">
              <img
                src={item.image || `${baseUrl}${item.image}`}
                alt={item.name || "Item"}
                width={96}
                height={96}
                className="object-cover rounded-md"
              />

              <div className="flex flex-col justify-between w-full px-2">
                {/* Top */}
                <div className="flex items-center justify-between gap-10">
                  <h3 className="font-semibold text-2xl">
                    {truncateWords(item.name, 3)}
                  </h3>
                  <div className="p-1 bg-gray-200 rounded-sm text-sm">
                    KES {(item.final_price || 0).toLocaleString()}
                  </div>
                </div>

                {/* Description */}
                <div className="text-sm text-gray-500">
                  {truncateWords(item.description, 15)}
                </div>

                {/* Bottom */}
                <div className="flex justify-between items-center text-sm">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={async () => {
                        await updateQuantity(item.id, "decrease");
                        refreshCart();
                      }}
                      className="px-2 py-1 bg-gray-200 rounded"
                      disabled={item.quantity <= 1}
                    >
                      -
                    </button>
                    <span>{item.quantity || 0}</span>
                    <button
                      onClick={async () => {
                        await updateQuantity(item.id, "increase");
                        refreshCart();
                      }}
                      className="px-2 py-1 bg-gray-200 rounded"
                      disabled={item.quantity >= availableStock}
                    >
                      +
                    </button>

                    <p className="text-gray-500 text-xs">
                      {availableStock - item.quantity} left in stock
                    </p>
                  </div>

                  {/* Remove button */}
                  {item.id && (
                    <RemoveFromCartButton
                      itemId={item.id}
                      onRemoved={refreshCart}
                    />
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Summary */}
      <div className="mt-4">
        <div className="flex justify-between font-semibold mb-2">
          <span>Subtotal</span>
          <span>KES {subtotal.toLocaleString()}</span>
        </div>

        <p className="text-gray-500 text-sm mb-4">
          Thank you for shopping at MaaMara Market. To proceed to checkout,
          click the checkout button.
        </p>

        <div className="flex justify-between text-sm">
          <Link to="/shopping-cart">
            <button className="rounded-md py-2 px-4 ring-1 ring-gray-300 text-gray-700 light-button">
              View Cart
            </button>
          </Link>
          
          <button className="rounded-md py-2 px-4 text-white primary-button" onClick={handlediscounts}>
            Checkout
          </button>
        
        </div>
      </div>
    </div>
  );
};

export default CartModal;
