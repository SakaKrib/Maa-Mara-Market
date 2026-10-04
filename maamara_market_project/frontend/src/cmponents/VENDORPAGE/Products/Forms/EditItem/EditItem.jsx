import React from "react";
import { useNavigate } from "react-router-dom";

const EditItem = ({ item }) => {
  const itemId = item?.id ?? null;
  const navigate = useNavigate();

  if (!itemId) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={() => navigate(`/vendors-dashboard/edit-item/${itemId}`)}
      className="inline-flex items-center rounded-lg bg-white px-2 py-1 text-xs font-semibold text-black transition hover:bg-gray-100"
    >
      Edit Item
    </button>
  );
};

export default EditItem;
