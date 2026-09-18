import api from "../../../../../../Services/Api";
import { baseUrl } from "../../../../../../cmponents/Constant/Constant";
import { useCartContext } from "../CartHook/cart";
import useItems from "../../../../ItemHook/ItemHook";
import { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import ReviewSection from "../Review";
import AddToCartButton from "../CartActionButtons/AddToCartBtn";

const SingleItem = () => {
  const { itemId } = useParams();
  const { items, loading } = useItems();
  const { refreshCart } = useCartContext();

  const [item, setItem] = useState(null);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [selectedSize, setSelectedSize] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [quantity, setQuantity] = useState(1);

  const variantStock = Array.isArray(selectedVariant?.sizes)
    ? selectedVariant.sizes.reduce(
        (sum, size) => sum + Number(size.quantity_in_stock || 0),
        0
      )
    : 0;

  const availableStock =
    selectedSize?.quantity_in_stock ??
    (variantStock > 0 ? variantStock : item?.in_stock ?? 0);





  //avalable stock left as you add to the the qty
  const remainingStock = Math.max(availableStock - quantity, 0);

// fetch item details
  const fetchItemDetails = async () => {
    try {
      const res = await api.get(`${baseUrl}/api/items/${itemId}/`);
      if (res.data) {
        setItem(res.data);
  
      }
    } catch (error) {
      // Keep the existing page state if a background refresh fails.
    }
  };
  

  // arrow buttons config
  const rightRef = useRef(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!rightRef.current) return;

      // Prevent arrow keys from interfering with page scroll
      if (e.key === "ArrowDown") {
        e.preventDefault();
        rightRef.current.scrollBy({ top: 100, behavior: "smooth" });
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        rightRef.current.scrollBy({ top: -100, behavior: "smooth" });
      }
    };

    

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);



  useEffect(() => {
    if (!loading) {
      const found = items.find((itm) => itm.id === parseInt(itemId));
      if (found) {
        setItem(found);
        if (
          found.variants?.length > 0 &&
          (!selectedVariant || selectedVariant.item !== found.id)
        ) {
          setSelectedVariant(found.variants[0]);
          setSelectedSize(null);
          setSelectedImage(null);
        }
      }
    }
  }, [loading, items, itemId]);

  const handleColorChange = (variantId) => {
    if (!item) return;
    const variant = item.variants.find(
      (v) => String(v.id) === String(variantId)
    );
    if (variant) {
      setSelectedVariant(variant);
      setSelectedSize(null);
      setSelectedImage(null);
    }
  };

  const handleSizeChange = (sizeObj) => {
    setSelectedSize(sizeObj);
    setSelectedImage(null);
  };

  const handlePreviewImageClick = (imageUrl) => {
    // Image previews must not clear the selected color or size.
    setSelectedImage(imageUrl);
  };

  if (loading) return <div>Loading...</div>;
  if (!item) return <div>Item not found</div>;

  const previewImages = item.images?.length > 0 ? item.images : [item.image];
  const mainImageSrc = selectedImage || selectedSize?.image || selectedVariant?.image || item.image;

  // monitor add to cart button
  const isDisabled =
  quantity > availableStock ||
  availableStock === 0 ||
  (selectedVariant?.sizes?.length > 0 && !selectedSize);


  return (
    <div className="px-4 md:px-8 lg:px-16 xl:px-32 2xl:px-64 flex flex-col lg:flex-row gap-16 mt-10 " style={{maxHeight: '90vh', overflowY:'auto'}}>
      {/* Left: Image and previews */}
      <div className="w-full lg:w-1/2 lg:sticky lg:top-0 ">
  <div className="h-[75vh] relative">
    <img src={mainImageSrc} className="object-cover rounded-md w-full h-full" alt={item.name} />
  </div>
  <div className="flex flex-wrap gap-4 mt-6">
    <div className="mt-6 flex flex-wrap gap-4">
      {previewImages.map((img, idx) => (
        <div
          key={idx}
          onClick={() => handlePreviewImageClick(img)}
          className={`w-20 h-20 rounded-md overflow-hidden cursor-pointer border ${
            selectedImage === img ? "ring-2 ring-black" : ""
          }`}
        >
          <img src={img} className="object-cover w-full h-full" alt={`Preview ${idx + 1}`} />
        </div>
      ))}
    </div>

    <div className="flex flex-wrap gap-4 mt-6">
      {item.variants?.map((variant) => (
        <div
          key={variant.id}
          onClick={() => handleColorChange(variant.id)}
          className={`w-20 h-20 rounded-md overflow-hidden cursor-pointer border ${
            selectedVariant?.id === variant.id ? "ring-2 ring-black" : ""
          }`}
          title={variant.color}
        >
          {variant.image ? (
            <img src={variant.image} className="object-cover w-full h-full" alt={variant.color} />
          ) : (
            <div className="w-full h-full" style={{ backgroundColor: variant.color.toLowerCase() }} />
          )}
        </div>
      ))}
    </div>
  </div>
</div>


      {/* Right: Info and unified form */}
      <div className="w-full lg:w-1/2 flex flex-col gap-6">
        <h1 className="text-4xl font-medium">{item.name}</h1>
        <p className="text-gray-500">{item.description}</p>
        <div className="h-[2px] bg-gray-100" />

        <div>
          <h5 className="text-sm">Reviews: ({item.review_count ?? 0})</h5>
          <h3 className={`text-lg mt-2 ${(
              selectedSize ? selectedSize.quantity_in_stock :
              selectedVariant?.sizes ? selectedVariant.sizes.reduce((sum, s) => sum + s.quantity_in_stock, 0)
              : item.in_stock) < 5 ? "text-red-500" : "text-green-500"}`}>
            {selectedSize
              ? `${selectedSize.quantity_in_stock} In stock`
              : selectedVariant?.sizes
              ? `${selectedVariant.sizes.reduce((sum, s) => sum + s.quantity_in_stock, 0)} In stock`
              : `${item.in_stock} In stock`}
          </h3>
        </div>

        <div className="flex items-center gap-4">
          {item.discount_price !== "0.00" ? (
            <>
              <h3 className="text-lg text-gray-400 line-through">Ksh {item.final_price}</h3>
              <h2 className="font-medium text-2xl text-red-600">Ksh {item.final_discounted_price}</h2>
            </>
          ) : (
            <h2 className="font-medium text-2xl">Ksh {item.final_price}</h2>
          )}
        </div>

        {/* Unified form starts here */}
        <form onSubmit={(e) => e.preventDefault()} className="flex flex-col gap-6 mt-6">
          {/* Color Selection */}
          <div>
            <p className="font-medium mb-2">Select Color</p>
            <div className="flex flex-wrap gap-4">
              {(item.variants || []).map((variant) => {
                const color = variant.color.toLowerCase();
                return (
                  <label key={variant.id} className="inline-block">
                    <input
                      type="radio"
                      name="color"
                      value={variant.id}
                      checked={selectedVariant?.id === variant.id}
                      onChange={() => handleColorChange(variant.id)}
                      className="hidden"
                    />
                    <span
                      className={`block w-6 h-6 rounded-full border cursor-pointer ${
                        selectedVariant?.id === variant.id ? "ring-2 ring-offset-1" : "hover:ring-2 hover:ring-offset-1"
                      }`}
                      style={{ backgroundColor: color }}
                      title={color}
                    ></span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Size Selection */}
          {selectedVariant?.sizes?.length > 0 && (
            <div>
              <p className="font-medium mb-2">Select Size</p>
              <div className="flex flex-wrap gap-4">
                {selectedVariant.sizes.map((sizeObj) => {
                  const { id, size, quantity_in_stock } = sizeObj;
                  return (
                    <label key={id}>
                      <input
                        type="radio"
                        name="size"
                        checked={selectedSize?.id === id}
                        onChange={() => handleSizeChange(sizeObj)}
                        className="hidden"
                        disabled={quantity_in_stock === 0}
                      />
                      <span
                        className={`inline-block border rounded px-2 py-1 text-sm cursor-pointer ${
                          quantity_in_stock === 0 ? "opacity-40 cursor-not-allowed" : ""
                        } ${selectedSize?.id === id ? "ring-2 ring-black" : ""}`}
                      >
                        {size} {quantity_in_stock === 0 ? "(Out)" : ""}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quantity */}
<div className="">
  <p className="font-medium mb-2">Choose Quantity</p>
  <div className="flex items-center gap-10">
    <div className="bg-gray-100 py-2 px-4 rounded-3xl flex items-center w-32 justify-between">
      <button
        type="button"
        onClick={() => setQuantity((q) => Math.max(1, q - 1))}
        disabled={quantity <= 1}
        className="disabled:opacity-40"
      >
        -
      </button>
      <span>{quantity}</span>
      <button
        type="button"
        onClick={() => setQuantity((q) => Math.min(q + 1, availableStock))}
        disabled={quantity >= availableStock}
        className="disabled:opacity-40"
      >
        +
      </button>
    </div>

    <div className="w-96 flex justify-between items-center">
      <p className="text-sm whitespace-nowrap inline relative top-4">
      {remainingStock > 0 ? (
        <>
          Only{" "}
          <span className={`font-medium ${remainingStock < 5 ? "text-red-500" : "text-green-500"}`}>
            {remainingStock}
          </span>{" "}
          left in stock
        </>
      ) : (
        <span className="font-medium text-red-600">This is the last item in stock!</span>
      )}
    </p>


      {/* size check */}
      {selectedVariant?.sizes?.length > 0 && !selectedSize && (
        <p className="text-sm text-red-500">
          Please select a size
        </p>
      )}


      {/* Submit Button */}
      <AddToCartButton
        itemId={item.id}
        quantity={quantity}
        variantId={selectedVariant?.id}
        sizeId={selectedSize?.id}
        availableStock={availableStock}
        remainingStock={remainingStock}
        disabled={isDisabled}
        onAddSuccess={() => {
          refreshCart();
          fetchItemDetails();
        }}
      />


    </div>
  </div>



          
          </div>

          {/* Wishlist / Share */}
          <ul className="flex gap-6 mt-4 text-sm">
            <li className="flex items-center gap-1 cursor-pointer">
              <i className="ri-heart-line text-lg" />
              Wishlist
            </li>
            <li className="flex items-center gap-1 cursor-pointer">
              <i className="ri-share-line text-lg" />
              Share
            </li>
          </ul>
        </form>

        {/* More Info */}
        <div className="text-sm mt-6">
          <div className="font-medium mb-4">More Info</div>
          <p>Lorem ipsum dolor sit amet consectetur adipisicing elit. Animi ipsam est laudantium, blanditiis suscipit iure id libero aliquam qui porro facilis fuga, voluptate excepturi impedit velit quam vitae corrupti consequatur.</p>
        </div>

        <div className="text-sm mt-6">
          <div className="font-medium mb-4">Returns</div>

          {item?.is_returnable ? (
            <p>
              This item is eligible for return. If you receive a damaged, defective, or incorrect product,
              you may request a return within the allowed return period after delivery. The product must
              remain unused, in its original packaging, and in the same condition you received it.
              Refunds or replacements will be processed after inspection.
            </p>
          ) : (
            <p>
              This item is non-returnable. Due to hygiene, customization, or product nature, we cannot
              accept returns or exchanges once the order has been delivered. Please review product
              details carefully before purchasing. If the item arrives damaged or incorrect, you may
              still contact support within 24 hours of delivery for assistance. <br /> <p className="flex gap-2">For more info read our <p className="underline text-blue-500">return policy</p>
            </p></p>
          )}
        </div>

        <div>
        <ReviewSection item={item} />
        </div>
      </div>
    </div>
  );
};

export default SingleItem;
