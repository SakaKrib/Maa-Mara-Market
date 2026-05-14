import React, { useEffect, useState } from 'react';
import { baseUrl } from '../../../../../../cmponents/Constant/Constant';
import img12 from '../../../../../../assets/products/nativity.jpg';
import CartIcon from "@mui/icons-material/ShoppingCartOutlined";
import {
  shareOutline, heartOutline, eyeOutline, heart
} from "ionicons/icons";
import { IonIcon } from '@ionic/react';
import { Link, useNavigate } from 'react-router-dom';
import AddToCartButton from '../CartActionButtons/AddToCartBtn';
import api from "../../../../../../Services/Api";
import { useWishlistContext } from '../../../../../../cmponents/Hooks/WishListHook/Wishlist';

// Reusable countdown component
function OfferCountdown({ endDateStr }) {
  const endDate = new Date(endDateStr);
  const [timeLeft, setTimeLeft] = useState(() => {
    const now = new Date();
    return Math.max(0, Math.floor((endDate - now) / 1000));
  });

  useEffect(() => {
    if (!endDateStr) return;

    const interval = setInterval(() => {
      const now = new Date();
      const diff = Math.floor((endDate - now) / 1000);
      if (diff <= 0) {
        clearInterval(interval);
        setTimeLeft(0);
      } else {
        setTimeLeft(diff);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [endDateStr]);

  function formatTime(seconds) {
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${d}d ${h}h ${m}m ${s}s`;
  }

  if (timeLeft === 0) return null;

  return (
    <div className="absolute bottom-2 left-2 bg-red-600 text-white text-xs font-semibold px-2 py-1 rounded-full whitespace-nowrap">
      Offer ends in {formatTime(timeLeft)}
    </div>
  );
}


const TrendingProducts = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [nextUrl, setNextUrl] = useState(null);
  const [prevUrl, setPrevUrl] = useState(null);
  const { wishlist, addToWishlist, removeFromWishlist } = useWishlistContext();

  const navigate = useNavigate();
  // console.log("wishlist:", wishlist);


  // handle update the stock for new item
  const updateItemStock = (itemId, newStock) => {
    setItems((prev) =>
      prev.map((it) =>
        it.id === itemId
          ? { ...it, in_stock: newStock }
          : it
      )
    );
  };

 


  const fetchItems = async (url) => {
    try {
      setLoading(true);
      const res = await fetch(url, {
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      console.log("this is item data", data);

      setItems(data.results || []);
      setNextUrl(data.next);
      setPrevUrl(data.previous);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching items:", error);
      setItems([]);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems(`${baseUrl}/api/items/`);
  }, []);

  // ✅ Fixed parameter naming: use 'id' instead of 'itemId'
  const handleItemClick = async (id) => {
    try {
      await api.get(`${baseUrl}/api/items/${id}/`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // to send cookies for visitor_id
      });
    } catch (err) {
      console.error("Failed to increment view:", err);
    } finally {
      navigate(`/item/${id}`);
    }
  };

  // Get the first item with offer for the Featured Offer section (if any)
  const featuredOfferItem = items.find(item => item.in_offer && item.offer?.end_date);

  console.log(items)
  if (loading) return <p className="text-center mt-10">Loading...</p>;

  return (
    <div className="py-10 px-4 md:px-10 bg-white">
      <div className="max-w-7xl mx-auto">
        {/* Section Heading */}
        {featuredOfferItem || items && (
        <div className="mb-6 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-800">Trending Products</h2>
        </div>
        )}

        {/* Featured Offer Item */}
        {featuredOfferItem && (
          <div className="bg-gray-100 p-4 rounded-lg mb-10">
            <div className="relative">
              <img
                src={
                  featuredOfferItem.image.startsWith("http")
                    ? featuredOfferItem.image
                    : `${baseUrl}${featuredOfferItem.image}`
                }
                alt={featuredOfferItem.name}
                className="w-full object-cover rounded-lg max-h-[600px]"
              />
              <div className="absolute top-2 right-2 flex gap-2">
                <a href="#">
                  <IonIcon icon={heartOutline} className="text-white bg-red-500 rounded-full p-2" />
                </a>
                <a href="#">
                  <IonIcon icon={eyeOutline} className="text-white bg-blue-500 rounded-full p-2" />
                </a>
                <a href="#">
                  <IonIcon icon={shareOutline} className="text-white bg-green-500 rounded-full p-2" />
                </a>
              </div>

              <OfferCountdown endDateStr={featuredOfferItem.offer.end_date} />

              {parseFloat(featuredOfferItem.offer.discount_percentage) > 0 && (
                <div className="absolute bottom-2 right-2 bg-red-600 text-white text-xs font-semibold px-2 py-1 rounded-full">
                  {parseFloat(featuredOfferItem.offer.discount_percentage).toFixed(0)}% OFF
                </div>
              )}

            </div>
            <div className="mt-4">
              <h3 className="text-lg font-semibold">{featuredOfferItem.name}</h3>
              <p className="text-sm text-gray-600">({featuredOfferItem.average_rating ?? 0} reviews)</p>
              <div className="flex items-center gap-3 mt-2">
                <span className="text-xl font-bold text-red-600">
                  KES {featuredOfferItem.final_discounted_price?.toLocaleString() || featuredOfferItem.price.toLocaleString()}
                </span>
                {parseFloat(featuredOfferItem.discount_price) > 0 && (
                  <span className="line-through text-gray-500">
                    KES {featuredOfferItem.final_price.toLocaleString()}
                  </span>
                )}
              </div>
              <div className="text-sm text-gray-600 mt-1">
                <p>
                  Stock: <strong>{featuredOfferItem.in_stock}</strong> | Sold: <strong>{featuredOfferItem.sold || 0}</strong>
                </p>
              </div>
            </div>
          </div>
        )}


        {/* Grid of Products */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {items.map(item => {
            const isWishlisted = wishlist.some(w => w.item?.id === item.id || w.id === item.id);

            const handleToggleWishlist = async (e) => {
              e.stopPropagation(); // prevent card click
              if (isWishlisted) {
                await removeFromWishlist(item.id);
              } else {
                await addToWishlist(item.id);
              }
            };

            if (item.in_offer === false) {
              return (
                <div
                  key={item.id}
                  className="border rounded-lg shadow-sm hover:shadow-md transition duration-300 bg-white"
                >
                  <div className="relative cursor-pointer" onClick={() => handleItemClick(item.id)}>
                    <img
                      src={item.image || `${baseUrl}${item.image}`}
                      alt={item.name}
                      className="w-full h-52 object-cover rounded-t-lg"
                    />

                    {/* Hover Icons */}
                    <div className="absolute top-2 right-2 flex flex-col gap-2 z-10">
                      <button
                        type="button"
                        onClick={handleToggleWishlist}
                        aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
                        className={`rounded-full flex justify-center items-center p-2 transition-colors ${
                          isWishlisted ? "bg-red-100" : "bg-gray-100 hover:bg-gray-200"
                        }`}
                      >
                        <IonIcon
                          icon={isWishlisted ? heart : heartOutline}
                          className={`text-lg ${isWishlisted ? "text-red-500" : "text-gray-400"}`}
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

                    {/* Discount Badge */}
                    {item.discount > 0 && (
                      <div className="absolute bottom-2 left-2 bg-red-600 text-white text-xs font-semibold px-2 py-1 rounded-full">
                        {item.discount}% OFF
                      </div>
                    )}
                  </div>

                  <div className="p-4">
                    <Link to={`/item/${item.id}`}>
                      <h3 className="text-base font-semibold text-gray-800 mb-1">{item.name}</h3>
                    </Link>
                    <p className="text-sm text-gray-500 mb-2">({item.rating} reviews)</p>

                    <div className="flex items-center gap-4">
                      {item.discount_price !== "0.00" ? (
                        <>
                          <h2 className="font-medium text-2xl text-red-600">
                            Ksh {item.final_discounted_price.toLocaleString()}
                          </h2>
                          <h3 className="text-lg text-gray-400 line-through">
                            Ksh {item.final_price.toLocaleString()}
                          </h3>
                        </>
                      ) : (
                        <h2 className="font-medium text-2xl text-red-500">
                          Ksh {item.final_price.toLocaleString()}
                        </h2>
                      )}
                    </div>

                    <div className="flex justify-between items-center text-sm text-gray-500 mb-3">
                      <p>{item.sold} sold</p>
                      <p>{item.in_stock} in stock</p>
                    </div>

                    <div>
                      {/* add to cart btn and stock management */}
                    <AddToCartButton
                      itemId={item.id}
                      quantity={1}
                      availableStock={item.in_stock}
                      remainingStock={item.in_stock}
                      disabled={item.in_stock === 0}
                      onAddSuccess={(newStock) => {
                        updateItemStock(item.id, newStock);
                      }}
                    />

                    </div>
                  </div>
                </div>
              );
            }

            // Return null for items that don't meet condition, so React is happy
            return null;
          })}
        </div>


        {/* Pagination Buttons */}
        {(prevUrl || nextUrl) && (
          <div className="flex justify-between items-center mt-10">
            {prevUrl && (
              <button
                onClick={() => fetchItems(prevUrl)}
                className="secondary-button px-4 py-2 rounded-md text-white"
              >
                Previous
              </button>
            )}
            {nextUrl && (
              <button
                onClick={() => fetchItems(nextUrl)}
                className="secondary-button px-4 py-2 rounded-md text-white"
              >
                Next
              </button>
            )}
          </div>
        )}

      </div>
    </div>
  );
};

export default TrendingProducts;
