import { useCallback, useEffect, useRef, useState } from "react";
import api from "../../../../Services/Api/";

const isFile = (value) =>
  typeof File !== "undefined" && value instanceof File;

const stripFiles = (value) => {
  if (isFile(value)) return null;
  if (Array.isArray(value)) return value.map(stripFiles);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, stripFiles(item)])
    );
  }
  return value;
};

const makeUploadKey = (slotKey) =>
  "draft_" + slotKey.replace(/[^a-zA-Z0-9_-]/g, "_");

export default function useItemDraftAutosave({
  enabled = true,
  values,
  media = [],
  draftId,
  onRestore,
  onSaved,
}) {
  const [currentDraftId, setCurrentDraftId] = useState(draftId || null);
  const [restoring, setRestoring] = useState(Boolean(enabled));
  const [saving, setSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const [error, setError] = useState(null);

  const restoredRef = useRef(false);
  const timerRef = useRef(null);
  const savingRef = useRef(false);
  const knownSlotsRef = useRef(new Set());
  const valuesRef = useRef(values);
  const mediaRef = useRef(media);
  valuesRef.current = values;
  mediaRef.current = media;

  useEffect(() => {
    setCurrentDraftId(draftId || null);
  }, [draftId]);

  useEffect(() => {
    if (!enabled || restoredRef.current) return undefined;

    let cancelled = false;

    const load = async () => {
      try {
        const response = await api.get("/api/item-draft/", {
          withCredentials: true,
        });

        if (cancelled) return;

        const draft = response.data?.draft;
        if (draft?.exists) {
          setCurrentDraftId(draft.draft_id);
          knownSlotsRef.current = new Set(
            (draft.media || []).map((asset) => asset.slot_key)
          );
          onRestore?.(draft);
        }
        setError(null);
      } catch (err) {
        if (!cancelled) setError(err);
      } finally {
        if (!cancelled) {
          restoredRef.current = true;
          setRestoring(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [enabled, onRestore]);

  const save = useCallback(
    async (nextValues = valuesRef.current, nextMedia = mediaRef.current) => {
      if (!enabled || !restoredRef.current) return null;

      if (savingRef.current) {
        await new Promise((resolve) => {
          const waitForSave = () => {
            if (!savingRef.current) {
              resolve();
              return;
            }
            window.setTimeout(waitForSave, 100);
          };
          waitForSave();
        });
        return save(nextValues, nextMedia);
      }

      savingRef.current = true;
      setSaving(true);

      try {
        const formData = new FormData();
        formData.append("data", JSON.stringify(stripFiles(nextValues)));

        const manifest = [];
        const currentSlots = new Set();

        nextMedia.forEach((asset, index) => {
          if (!asset?.slotKey || !asset.kind) return;

          currentSlots.add(asset.slotKey);
          const uploadKey = makeUploadKey(asset.slotKey);

          manifest.push({
            slot_key: asset.slotKey,
            kind: asset.kind,
            variant_key: asset.variantKey || "",
            sort_order: asset.sortOrder ?? index,
            upload_key: uploadKey,
          });

          if (isFile(asset.value)) {
            formData.append(uploadKey, asset.value);
          }
        });

        const removedSlots = [...knownSlotsRef.current].filter(
          (slot) => !currentSlots.has(slot)
        );

        formData.append("media_manifest", JSON.stringify(manifest));
        formData.append("removed_media_slots", JSON.stringify(removedSlots));

        if (currentDraftId) {
          formData.append("draft_id", currentDraftId);
        }

        const response = await api.post("/api/item-draft/", formData, {
          withCredentials: true,
          headers: { "Content-Type": "multipart/form-data" },
        });

        const saved = response.data?.draft || response.data;
        if (saved?.draft_id) setCurrentDraftId(saved.draft_id);

        knownSlotsRef.current = new Set(
          (saved?.media || []).map((asset) => asset.slot_key)
        );
        setLastSavedAt(saved?.updated_at || new Date().toISOString());
        setError(null);
        onSaved?.(saved);
        return saved;
      } catch (err) {
        setError(
          err?.response?.data?.detail ||
            err?.response?.data?.error ||
            "Draft could not be saved."
        );
      } finally {
        savingRef.current = false;
        setSaving(false);
      }
    },
    [currentDraftId, enabled, onSaved]
  );

  useEffect(() => {
    if (!enabled || !restoredRef.current) return undefined;

    window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      save(values, media);
    }, 1200);

    return () => window.clearTimeout(timerRef.current);
  }, [enabled, media, save, values]);

  const clearDraft = useCallback(async () => {
    if (!currentDraftId) return;

    await api.delete("/api/item-draft/", {
      withCredentials: true,
    });
    setCurrentDraftId(null);
    knownSlotsRef.current.clear();
  }, [currentDraftId]);

  return {
    draftId: currentDraftId,
    restoring,
    saving,
    lastSavedAt,
    error,
    saveNow: save,
    clearDraft,
  };
}
