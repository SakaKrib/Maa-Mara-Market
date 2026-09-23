import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import api from "../../../../Services/Api";
import ItemAddNew from "./AddingNewItem";
import { useVendor } from "../vendorhooks";

const EditItemPage = () => {
  const { itemId } = useParams();
  const navigate = useNavigate();
  const { vendor } = useVendor();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const loadItem = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await api.get("/api/item-post/update/", {
          withCredentials: true,
        });
        const items = response.data?.results || [];
        const found = items.find((entry) => String(entry.id) === String(itemId));

        if (!found) {
          throw new Error("Item not found.");
        }

        if (!cancelled) {
          setItem(found);
        }
      } catch (err) {
        console.error("Error loading item for edit:", err);
        if (!cancelled) {
          setError(
            err?.response?.data?.detail ||
              err?.message ||
              "Unable to load this item right now."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    if (itemId) {
      loadItem();
    } else {
      setLoading(false);
      setError("No item was selected.");
    }

    return () => {
      cancelled = true;
    };
  }, [itemId]);

  const handleSave = () => {
    navigate("/vendors-dashboard/item-onsite", { replace: true });
  };

  return (
    <section className="min-h-screen w-full bg-[#f8f8f6] px-3 py-4 sm:px-5 sm:py-5 lg:px-8">
      <div className="mx-auto w-full max-w-[1600px]">
        <div className="mb-4 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => navigate("/vendors-dashboard/item-onsite")}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-xs font-semibold text-card-foreground transition hover:bg-muted"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Items OnSite
          </button>

          {item && (
            <p className="truncate text-xs font-semibold text-muted-foreground">
              Editing: {item.name}
            </p>
          )}
        </div>

        {loading ? (
          <div className="rounded-2xl border border-border bg-card p-10 text-center shadow-sm">
            <p className="text-sm text-muted-foreground">Loading item...</p>
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-destructive/30 bg-card p-10 text-center shadow-sm">
            <p className="text-sm text-destructive">{error}</p>
            <button
              type="button"
              onClick={() => navigate("/vendors-dashboard/item-onsite")}
              className="mt-4 rounded-full border border-border bg-card px-4 py-2 text-xs font-semibold text-card-foreground hover:bg-muted"
            >
              Return to Items OnSite
            </button>
          </div>
        ) : item ? (
          <div className="w-full rounded-2xl border border-border bg-card p-3 shadow-sm sm:p-5 lg:p-6">
            <ItemAddNew
              initialItem={item}
              vendorId={vendor?.id}
              itemId={item.id}
              vendor={vendor}
              onSave={handleSave}
            />
          </div>
        ) : null}
      </div>
    </section>
  );
};

export default EditItemPage;
