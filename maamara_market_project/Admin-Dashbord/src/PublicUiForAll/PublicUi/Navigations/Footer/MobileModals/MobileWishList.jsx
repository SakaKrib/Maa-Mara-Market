import React from "react";
import MobileBottomSheet from "./MobileBottomSheet";
import { useNavigate } from "react-router-dom";
import { baseUrl } from "../../../../../cmponents/Constant/Constant";
import { Heart, Share2 } from "lucide-react";
import { useWishlistContext } from "../../../../../cmponents/Hooks/WishListHook/Wishlist";

const MobileWishlistModal = ({ open, onClose }) => {
  const navigate = useNavigate();
  const { wishlist: items = [] } = useWishlistContext();

  const getImage = (image) => image?.startsWith("http") ? image : `${baseUrl}${image || ""}`;

  const handleShare = async (item) => {
    const url = `${window.location.origin}/item/${item.slug || item.id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: item.name || "Maa Mara Market", text: `Check out ${item.name || "this item"}`, url });
        return;
      }
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        return;
      }
    } catch (error) {
      if (error?.name !== "AbortError") console.error("Share error:", error);
    }
  };

  return (
    <MobileBottomSheet open={open} onClose={onClose} title="Wishlist">
      {items.length === 0 ? (
        <div className="mm-mobile-empty-state">
          <Heart size={28} />
          <p>No saved items yet</p>
        </div>
      ) : (
        <div className="mm-mobile-sheet-stack">
          <div className="mm-mobile-sheet-list">
            {items.map((entry, index) => {
              const item = entry.item || entry;
              return (
                <div key={item.id || index} className="mm-mobile-line-item">
                  <img src={getImage(item.image)} alt={item.name || "Wishlist item"} />
                  <div className="mm-mobile-line-copy">
                    <strong>{item.name}</strong>
                    <span>KES {Number(item.final_price || 0).toLocaleString()}</span>
                  </div>
                  <div className="mm-mobile-line-actions">
                    <button type="button" onClick={() => { navigate(`/item/${item.slug || item.id}`); onClose?.(); }}>View</button>
                    <button type="button" aria-label="Share item" onClick={() => handleShare(item)}><Share2 size={15} /></button>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mm-mobile-sheet-note">Items saved in your wishlist for later access.</p>
        </div>
      )}
    </MobileBottomSheet>
  );
};

export default MobileWishlistModal;