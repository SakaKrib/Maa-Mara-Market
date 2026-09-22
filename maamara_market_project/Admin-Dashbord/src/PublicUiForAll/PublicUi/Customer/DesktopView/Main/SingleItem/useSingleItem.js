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
  const [selectedAgeVariant, setSelectedAgeVariant] = useState(null);
  const [selectedShoe, setSelectedShoe] = useState(null);
  const [selectedShoeSize, setSelectedShoeSize] = useState(null);
  const [selectedWeight, setSelectedWeight] = useState(null);
  const [selectedLength, setSelectedLength] = useState(null);
  const [customPreferences, setCustomPreferences] = useState("");
  const [selectedImage, setSelectedImage] = useState(null);
  const [quantity, setQuantity] = useState(1);

  const fetchItem = useCallback(async () => {
    if (!itemId) return;
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    try {
      const response = await api.get(`/api/items/${itemId}/`, { signal: controller.signal });
      const data = response.data;
      setItem(data);
      const firstVariant = data?.variants?.[0] || null;
      setSelectedVariant(firstVariant);
      setSelectedSize(null);
      setSelectedAgeVariant(null);
      setSelectedShoe(null);
      setSelectedShoeSize(null);
      setSelectedWeight(null);
      setSelectedLength(null);
      setCustomPreferences("");
      setSelectedImage(null);
      setQuantity(1);
    } catch (err) {
      if (err?.code === "ERR_CANCELED" || controller.signal.aborted) return;
      setError(err);
      setItem(null);
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [itemId]);

  useEffect(() => {
    fetchItem();
  }, [fetchItem]);

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

  const selectAgeVariant = useCallback((age) => setSelectedAgeVariant(age), []);
  const selectShoe = useCallback((shoe) => { setSelectedShoe(shoe); setSelectedShoeSize(null); }, []);
  const selectShoeSize = useCallback((size) => setSelectedShoeSize(size), []);
  const selectWeight = useCallback((weight) => setSelectedWeight(weight), []);
  const selectLength = useCallback((length) => setSelectedLength(length), []);

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
    item, loading, error, selectedVariant, selectedSize, selectedAgeVariant, selectedShoe, selectedShoeSize, selectedWeight, selectedLength, customPreferences, setCustomPreferences, selectedImage,
    quantity, setQuantity, availableStock, remainingStock,
    selectColor, selectSize, selectAgeVariant, selectShoe, selectShoeSize, selectWeight, selectLength, selectImage, refreshItem: fetchItem,
  };
};

export default useSingleItem;
