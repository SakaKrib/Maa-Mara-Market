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
      // Keep the base item as the initial purchase configuration.
      // A variant becomes active only after the customer explicitly selects it.
      setSelectedVariant(null);
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

  const selectColor = useCallback((variantOrColor) => {
    const variant =
      typeof variantOrColor === "object"
        ? variantOrColor
        : item?.variants?.find(
            (candidate) => candidate.color?.toLowerCase() === variantOrColor?.toLowerCase()
          );

    if (variant) {
      setSelectedVariant(variant);
      setSelectedSize(null);
      setSelectedImage(null);
      setQuantity(1);
    }
  }, [item]);

  const selectSize = useCallback((size) => {
    setSelectedSize(size);
    setSelectedImage(null);
    setQuantity(1);
  }, []);

  const selectAgeVariant = useCallback((age) => {
    setSelectedAgeVariant(age);
    setQuantity(1);
  }, []);
  const selectShoe = useCallback((shoe) => {
    setSelectedShoe(shoe);
    setSelectedShoeSize(null);
    setQuantity(1);
  }, []);
  const selectShoeSize = useCallback((size) => {
    setSelectedShoeSize(size);
    setQuantity(1);
  }, []);
  const selectWeight = useCallback((weight) => {
    setSelectedWeight(weight);
    setQuantity(1);
  }, []);
  const selectLength = useCallback((length) => {
    setSelectedLength(length);
    setQuantity(1);
  }, []);

  const selectImage = useCallback((image) => {
    setSelectedImage(image);
  }, []);

  const variantStock = selectedVariant
    ? (Array.isArray(selectedVariant.sizes)
        ? selectedVariant.sizes.reduce(
            (sum, size) => sum + Number(size.quantity_in_stock || 0),
            0
          )
        : null)
    : null;

  const sizeOnlyStock = !selectedVariant && Array.isArray(item?.size_only_icon)
    ? item.size_only_icon.reduce(
        (sum, size) => sum + Number(size.quantity_in_stock || 0),
        0
      )
    : null;

  const availableStock =
    selectedSize?.quantity_in_stock ??
    selectedAgeVariant?.quantity_in_stock ??
    (selectedShoe && selectedShoeSize ? 1 : null) ??
    (variantStock !== null ? variantStock : null) ??
    (sizeOnlyStock !== null ? sizeOnlyStock : null) ??
    Number(item?.in_stock || 0);

  const remainingStock = Math.max(Number(availableStock || 0) - quantity, 0);

  return {
    item,
    loading,
    error,
    selectedVariant,
    selectedSize,
    selectedAgeVariant,
    selectedShoe,
    selectedShoeSize,
    selectedWeight,
    selectedLength,
    customPreferences,
    setCustomPreferences,
    selectedImage,
    quantity,
    setQuantity,
    availableStock,
    remainingStock,
    selectColor,
    selectSize,
    selectAgeVariant,
    selectShoe,
    selectShoeSize,
    selectWeight,
    selectLength,
    selectImage,
    refreshItem: fetchItem,
  };
};

export default useSingleItem;
