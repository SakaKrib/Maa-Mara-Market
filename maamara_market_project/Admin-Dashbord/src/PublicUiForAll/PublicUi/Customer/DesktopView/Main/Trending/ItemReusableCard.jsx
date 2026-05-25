import React, { useEffect, useState } from "react";
import { baseUrl } from "../../../../../../cmponents/Constant/Constant";
import { shareOutline, heartOutline, eyeOutline, heart } from "ionicons/icons";
import { IonIcon } from "@ionic/react";
import { Link, useNavigate } from "react-router-dom";
import AddToCartButton from "../CartActionButtons/AddToCartBtn";
import api from "../../../../../../Services/Api";
import { useWishlistContext } from "../../../../../../cmponents/Hooks/WishListHook/Wishlist";

/* ================= MAIN COMPONENT ================= */
const ProductCard = ({
  item,
  items: propItems,
  mode = "card",
  onItemClick,
  onToggleWishlist,
}) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [nextUrl, setNextUrl] = useState(null);
  const [prevUrl, setPrevUrl] = useState(null);

  const { wishlist, addToWishlist, removeFromWishlist } =
    useWishlistContext();

  const navigate = useNavigate();

  /* ================= DATA SOURCE (FIXED) ================= */
  const data =
    mode === "card"
      ? item
        ? [item]
        : propItems || []
      : items;

  /* ================= STOCK UPDATE ================= */
  const updateItemStock = (itemId, updatedItem) => {
    setItems((prev) =>
      prev.map((it) =>
        it.id === itemId
          ? {
              ...it,
              in_stock: updatedItem?.in_stock ?? it.in_stock,
            }
          : it
      )
    );
  };

  /* ================= FETCH ITEMS (ONLY FOR PAGE MODE) ================= */
  const fetchItems = async (url) => {
    try {
      setLoading(true);

      const res = await api.get(url);
      const data = res.data;

      setItems(data.results ?? []);
      setNextUrl(data.next ?? null);
      setPrevUrl(data.previous ?? null);
    } catch (error) {
      console.error("Fetch error:", error);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (mode === "page") {
      fetchItems("/api/items/");
    }
  }, [mode]);

  /* ================= VIEW TRACKING ================= */
  const handleItemClick = async (id) => {
    try {
      await api.get(`/api/items/${id}/`, {
        credentials: "include",
      });
    } catch (err) {
      console.error("Failed to increment view:", err);
    } finally {
      if (onItemClick) onItemClick(id);
      else navigate(`/item/${id}`);
    }
  };

  if (loading && mode === "page") {
    return <p className="text-center mt-10">Loading...</p>;
  }

  return (
    <div className={mode === "page" ? "py-10 px-4 md:px-10 bg-white" : ""}>
      <div className={mode === "page" ? "max-w-7xl mx-auto" : ""}>
        {/* GRID */}
        <div className="">
          {(data || []).map((item) => {
            const isWishlisted = wishlist.some(
              (w) => w.item?.id === item.id || w.id === item.id
            );

            const handleToggleWishlist = async (e) => {
              e.stopPropagation();

              if (onToggleWishlist) {
                onToggleWishlist(item.id);
                return;
              }

              if (isWishlisted) await removeFromWishlist(item.id);
              else await addToWishlist(item.id);
            };

            const availableStock =
              item?.sizes?.length > 0
                ? item.sizes.reduce(
                    (sum, s) => sum + (s.quantity_in_stock || 0),
                    0
                  )
                : item.in_stock ?? 0;

            return (
              <div
                key={item.id}
                className="border rounded-lg shadow-sm hover:shadow-md transition duration-300 bg-white"
              >
                <div
                  className="relative cursor-pointer"
                  onClick={() => handleItemClick(item.id)}
                >
                  <img
                    src={
                      item.image?.startsWith("http")
                        ? item.image
                        : `${baseUrl}${item.image}`
                    }
                    alt={item.name}
                    className="w-full h-52 object-cover rounded-t-lg"
                  />

                  {/* Wishlist */}
                  <div className="absolute top-2 right-2 flex flex-col gap-2 z-10">
                    <button
                      type="button"
                      onClick={handleToggleWishlist}
                      className={`rounded-full flex justify-center items-center p-2 ${
                        isWishlisted ? "bg-red-100" : "bg-gray-100"
                      }`}
                    >
                      <IonIcon
                        icon={isWishlisted ? heart : heartOutline}
                        className={`text-lg ${
                          isWishlisted ? "text-red-500" : "text-gray-400"
                        }`}
                      />
                    </button>

                    <IonIcon
                      icon={eyeOutline}
                      className="text-white bg-blue-500 rounded-full p-2 text-sm"
                    />
                    <IonIcon
                      icon={shareOutline}
                      className="text-white bg-green-500 rounded-full p-2 text-sm"
                    />
                  </div>
                </div>

                <div className="p-4">
                  <Link to={`/item/${item.id}`}>
                    <h3 className="text-base font-semibold text-gray-800 mb-1">
                      {item.name}
                    </h3>
                  </Link>

                  <p className="text-sm text-gray-500 mb-2">
                    ({item.rating || 0} reviews)
                  </p>

                  <h2 className="font-medium text-2xl text-red-600">
                    Ksh {item.final_price?.toLocaleString()}
                  </h2>

                  <div className="flex justify-between text-sm text-gray-500 mb-3">
                    <p>{item.sold || 0} sold</p>
                    <p>{availableStock} in stock</p>
                  </div>

                  <AddToCartButton
                    itemId={item.id}
                    quantity={1}
                    availableStock={availableStock}
                    remainingStock={availableStock}
                    disabled={availableStock === 0}
                    onAddSuccess={(updatedItem) => {
                      updateItemStock(item.id, updatedItem);
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* PAGINATION (ONLY PAGE MODE) */}
        {mode === "page" && (nextUrl || prevUrl) && (
          <div className="flex justify-between items-center mt-10">
            {prevUrl && (
              <button onClick={() => fetchItems(prevUrl)}>
                Previous
              </button>
            )}
            {nextUrl && (
              <button onClick={() => fetchItems(nextUrl)}>Next</button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductCard;