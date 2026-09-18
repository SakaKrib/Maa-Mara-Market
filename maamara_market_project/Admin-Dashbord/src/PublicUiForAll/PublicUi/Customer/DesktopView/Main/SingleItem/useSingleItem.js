import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../../../../../../Services/Api";

const useSingleItem = () => {
  const { itemId } = useParams();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [selectedSize, setSelectedSize] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [quantity, setQuantity] = useState(1);

  const fetchItem = useCallback(async () => {
    if (!itemId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await api.get(`/api/items/${itemId}/`);
      const data = response.data;
      setItem(data);
      const firstVariant = data?.variants?.[0] || null;
      setSelectedVariant(firstVariant);
      setSelectedSize(null);
      setSelectedImage(null);
      setQuantity(1);
    } catch (err) {
      setError(err);
      setItem(null);
    } finally {
      setLoading(false);
    }
  }, [itemId]);

  useEffect(() => { fetchItem(); }, [fetchItem]);

  const selectColor = useCallback((color) => {
    const variant = item?.variants?.find(
      (candidate) => candidate.color?.toLowerCase() === color?.toLowerCase()
    );
    if (variant) {
      setSelectedVariant(variant);
      setSelectedSize(null);
      setSelectedImage(null);
    }
  }, [item]);

  const selectSize = useCallback((size) => {
    setSelectedSize(size);
    setSelectedImage(null);
  }, []);

  const selectImage = useCallback((image) => {
    setSelectedImage(image);
  }, []);

  const availableStock =
    selectedSize?.quantity_in_stock ??
    (Array.isArray(selectedVariant?.sizes)
      ? selectedVariant.sizes.reduce((sum, size) => sum + Number(size.quantity_in_stock || 0), 0)
      : null) ??
    Number(item?.in_stock || 0);

  const remainingStock = Math.max(availableStock - quantity, 0);

  return {
    item, loading, error, selectedVariant, selectedSize, selectedImage,
    quantity, setQuantity, availableStock, remainingStock,
    selectColor, selectSize, selectImage, refreshItem: fetchItem,
  };
};

export default useSingleItem;
