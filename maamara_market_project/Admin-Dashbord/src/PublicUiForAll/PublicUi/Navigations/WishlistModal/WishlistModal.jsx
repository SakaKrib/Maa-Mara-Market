import { useWishlistContext } from "../../../../cmponents/Hooks/WishListHook/Wishlist";
import { baseUrl } from "../../../../cmponents/Constant/Constant";
import { Heart, Share2, Trash2 } from "lucide-react"; // ✅ using lucide-react icons

const WishlistModal = () => {
  const { wishlist, loading, removeFromWishlist } = useWishlistContext();

  if (loading) {
    return (
      <div className="w-[500px] absolute p-4 rounded-md shadow bg-white top-12 right-0 flex flex-col gap-6 z-20">
        <p>Loading wishlist...</p>
      </div>
    );
  }

  if (!wishlist || wishlist.length === 0) {
    return (
      <div className="w-[500px] absolute p-4 rounded-md shadow bg-white top-12 right-0 flex flex-col gap-6 z-20">
        <p>Wishlist is empty</p>
      </div>
    );
  }

  const truncateWords = (text, numWords) => {
    if (!text) return "";
    const words = text.split(" ");
    return words.length > numWords
      ? words.slice(0, numWords).join(" ") + "..."
      : text;
  };

  const handleShare = (item) => {
    const itemUrl = `${window.location.origin}/product/${item.slug || item.id}`;
    navigator.clipboard.writeText(itemUrl);
    alert("Item link copied to clipboard!");
  };

  return (
    <div className="w-[500px] absolute p-4 rounded-md shadow-[0_3px_10px_rgb(0,0,0,0.2)] bg-white top-12 right-0 flex flex-col gap-6 z-20">
      <h2 className="text-xl font-semibold border-b border-b-black-100">
        Wishlist ({wishlist.length} items)
      </h2>

      <div
        className="flex flex-col gap-6 overflow-y-auto"
        style={{ maxHeight: "60vh" }}
      >
        {wishlist.map((w) => {
          const item = w.item || w; // in case API returns wrapped item
          return (
            <div key={item.id} className="flex gap-4">
              <img
                src={item.image?.startsWith("http") ? item.image : `${baseUrl}${item.image}`}
                alt={item.name || "Item"}
                width={96}
                height={96}
                className="object-cover rounded-md "
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
                <div className="flex justify-between items-center text-sm mt-1">
                  <div className="flex items-center gap-3">
                    {/* Like (static visual for now) */}
                    <button
                      className="p-1 rounded hover:bg-gray-100"
                      title="Liked"
                    >
                      <Heart className="text-red-500 w-5 h-5" fill="red" />
                    </button>

                    {/* Share */}
                    <button
                      onClick={() => handleShare(item)}
                      className="p-1 rounded hover:bg-gray-100"
                      title="Share"
                    >
                      <Share2 className="w-5 h-5 text-gray-600" />
                    </button>
                  </div>

                  {/* Remove */}
                  <button
                    onClick={() => removeFromWishlist(item.id)}
                    className="p-1 rounded hover:bg-gray-100 text-red-500"
                    title="Remove"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Summary */}
      <div className="mt-4 text-center text-sm text-gray-500">
        💖 Items in your wishlist are saved for later.  
        Share or add them to your cart when ready!
      </div>
    </div>
  );
};

export default WishlistModal;
