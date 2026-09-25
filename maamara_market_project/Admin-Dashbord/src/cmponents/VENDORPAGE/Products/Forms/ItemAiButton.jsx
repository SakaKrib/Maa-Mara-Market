import React, { useState } from "react";
import { generateItemWithAI } from "../../../../Services/AI/itemAiService";

const ItemAiButton = ({ field, image, context, onGenerated, onError, label = "Generate with AI" }) => {
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    if (loading) return;

    setLoading(true);
    try {
      const result = await generateItemWithAI({ field, image, context });
      onGenerated(result);
    } catch (error) {
      onError?.(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      disabled={loading || !(image instanceof File)}
      onClick={handleGenerate}
      className="w-fit rounded-full border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
    >
      {loading ? "Generating..." : label}
    </button>
  );
};

export default ItemAiButton;
