import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";

import api from "../../../../../../Services/Api";
import { baseUrl } from "../../../../../../cmponents/Constant/Constant";
import { subscribeToRealtimeEvents } from "../../../../../../Services/useRealtimeEvents";
import useItems from "../../../../ItemHook/ItemHook";
import { useCartContext } from "../CartHook/cart";
import ReviewSection from "../Review";
import AddToCartButton from "../CartActionButtons/AddToCartBtn";

const money = (value) => {
  const amount = Number(value || 0);
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 2,
  }).format(amount);
};

const normalizeList = (value) => {
  if (Array.isArray(value)) return value;
  if (value === null || value === undefined || value === "") return [];
  return [value];
};

const SingleItem = () => {
  const { itemId } = useParams();
  const { items, loading } = useItems();
  const { refreshCart } = useCartContext();
