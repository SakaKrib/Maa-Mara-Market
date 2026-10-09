import { useCallback, useEffect, useRef, useState } from "react";
import api from "../../../../Services/Api/";

const isFile = (value) =>
  typeof Blob !== "undefined" &&
  value instanceof Blob &&
  typeof value.name === "string" &&
  value.name.trim() !== "";

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

const mediaValueSignature = (value) => {
  if (isFile(value)) {
    return {
      type: "file",
      name: value.name,
      size: value.size,
      mime: value.type,
      lastModified: value.lastModified,
    };
  }

  return {
    type: "stored",
    value: value || null,
  };
};

const makeDraftFingerprint = (values, media = []) =>
  JSON.stringify({
    data: stripFiles(values),
    media: media.map((asset, index) => ({
      slotKey: asset?.slotKey || "",
      kind: asset?.kind || "",
      variantKey: asset?.variantKey || "",
      sortOrder: asset?.sortOrder ?? index,
      value: mediaValueSignature(asset?.value),
    })),
  });

export default function useItemDraftAutosave({
  enabled = true,
  values,
  media = [],
  draftId,
  itemId,
  vendorId = null,
  onRestore,
  onSaved,
}) {
  const [currentDraftId, setCurrentDraftId] = useState(draftId || null);
  const [restoring, setRestoring] = useState(Boolean(enabled));
  const [saving, setSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const [error, setError] = useState(null);
  const [restoredReady, setRestoredReady] = useState(false);

  const restoredRef = useRef(false);
  const timerRef = useRef(null);
  const savingRef = useRef(false);
  const pendingSaveRef = useRef(false);
  const knownSlotsRef = useRef(new Set());
  const lastSavedFingerprintRef = useRef(null);
  const lastSavedDraftRef = useRef(null);
  const restoredDraftPendingRef = useRef(false);
  const valuesRef = useRef(values);
  const mediaRef = useRef(media);
  valuesRef.current = values;
  mediaRef.current = media;

  useEffect(() => {
    console.info("[ItemDraftDebug] Autosave hook state", {
      enabled,
      itemId: itemId ?? null,
      draftId: draftId ?? null,
      mediaCount: media.length,
      fieldCount: values && typeof values === "object" ? Object.keys(values).length : 0,
    });
    if (!enabled) {
      console.warn("[ItemDraftDebug] Autosave is DISABLED; no draft GET/POST will run from this hook.");
      return undefined;
    }

    let cancelled = false;
    restoredRef.current = false;
    knownSlotsRef.current = new Set();
    lastSavedFingerprintRef.current = null;
    lastSavedDraftRef.current = null;
    restoredDraftPendingRef.current = false;
    setCurrentDraftId(draftId || null);
    setRestoring(true);
    setRestoredReady(false);

    const load = async () => {
      console.info("[ItemDraftDebug] GET draft started", {
        endpoint: "/api/item-draft/",
        itemId: itemId ?? null,
      });
      try {
        const response = await api.get("/api/item-draft/", {
          withCredentials: true,
          params: {
          ...(itemId ? { item_id: itemId } : {}),
          ...(vendorId ? { vendor_id: vendorId } : {}),
        },
        });

        if (cancelled) return;

        const draft = response.data?.draft;
        console.info("[ItemDraftDebug] GET draft completed", {
          status: response.status,
          exists: Boolean(draft?.exists),
          draftId: draft?.draft_id ?? null,
          mediaCount: Array.isArray(draft?.media) ? draft.media.length : 0,
        });
        if (draft?.exists) {
          setCurrentDraftId(draft.draft_id);
          knownSlotsRef.current = new Set(
            (draft.media || []).map((asset) => asset.slot_key)
          );
          restoredDraftPendingRef.current = true;
          onRestore?.(draft);
        }
        setError(null);
      } catch (err) {
        console.error("[ItemDraftDebug] GET draft FAILED", {
          status: err?.response?.status ?? null,
          message: err?.response?.data?.detail || err?.response?.data?.error || err?.message || "Unknown error",
        });
        if (!cancelled) setError(err);
      } finally {
        if (!cancelled) {
          restoredRef.current = true;
          setRestoredReady(true);
          setRestoring(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [draftId, enabled, itemId, vendorId, onRestore]);

  const save = useCallback(
    async (nextValues = valuesRef.current, nextMedia = mediaRef.current) => {
      if (!enabled || !restoredRef.current) return null;

      const fingerprint = makeDraftFingerprint(nextValues, nextMedia);
      if (fingerprint === lastSavedFingerprintRef.current) {
        return lastSavedDraftRef.current;
      }

      if (savingRef.current) {
        // Do not wait recursively for the active request. The active save
        // cannot finish until this invocation returns, so waiting here can
        // deadlock autosave whenever the user changes a field while a save is
        // still in flight. Mark the latest state as pending; the finally block
        // below will persist the current refs after the active request ends.
        pendingSaveRef.current = true;
        return null;
      }

      savingRef.current = true;
      setSaving(true);

      const fileCount = nextMedia.filter((asset) => isFile(asset?.value)).length;
      console.info("[ItemDraftDebug] POST draft started", {
        endpoint: "/api/item-draft/",
        itemId: itemId ?? null,
        draftId: currentDraftId ?? null,
        fieldCount: nextValues && typeof nextValues === "object" ? Object.keys(nextValues).length : 0,
        mediaCount: nextMedia.length,
        fileCount,
      });

      try {
        const formData = new FormData();
        formData.append("data", JSON.stringify(stripFiles(nextValues)));

        const manifest = [];
        const currentSlots = new Set();

        nextMedia.forEach((asset, index) => {
          if (!asset?.slotKey || !asset.kind) return;

          if (!isFile(asset.value) && !knownSlotsRef.current.has(asset.slotKey)) return;

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

        if (itemId) {
          formData.append("item_id", String(itemId));
        }
        if (vendorId) {
          formData.append("vendor_id", String(vendorId));
        }
        if (currentDraftId) {
          formData.append("draft_id", currentDraftId);
        }

        const response = await api.post("/api/item-draft/", formData, {
          withCredentials: true,
        });

        const saved = response.data?.draft || response.data;
        console.info("[ItemDraftDebug] POST draft succeeded", {
          status: response.status,
          draftId: saved?.draft_id ?? null,
          mediaCount: Array.isArray(saved?.media) ? saved.media.length : 0,
        });
        if (saved?.draft_id) setCurrentDraftId(saved.draft_id);

        // A request can finish after the user has already changed another
        // field or added another file. Do not let that older server response
        // become the UI state or the "last saved" snapshot. The follow-up
        // autosave will persist the newer state.
        const latestFingerprint = makeDraftFingerprint(
          valuesRef.current,
          mediaRef.current
        );

        if (latestFingerprint !== fingerprint) {
          return saved;
        }

        knownSlotsRef.current = new Set(
          (saved?.media || []).map((asset) => asset.slot_key)
        );
        lastSavedFingerprintRef.current = fingerprint;
        lastSavedDraftRef.current = saved;
        setLastSavedAt(saved?.updated_at || new Date().toISOString());
        setError(null);
        onSaved?.(saved);
        return saved;
      } catch (err) {
        console.error("[ItemDraftDebug] POST draft FAILED", {
          status: err?.response?.status ?? null,
          message: err?.response?.data?.detail || err?.response?.data?.error || err?.message || "Unknown error",
        });
        setError(
          err?.response?.data?.detail ||
            err?.response?.data?.error ||
            "Draft could not be saved."
        );
        return null;
      } finally {
        savingRef.current = false;
        setSaving(false);

        if (pendingSaveRef.current) {
          pendingSaveRef.current = false;
          // Let the current save fully release its lock before starting the
          // queued latest-state save. valuesRef/mediaRef are authoritative.
          window.setTimeout(() => {
            save(valuesRef.current, mediaRef.current);
          }, 0);
        }
      }
    },
    [currentDraftId, enabled, itemId, vendorId, onSaved]
  );

  useEffect(() => {
    if (!enabled || !restoredRef.current) {
      if (enabled && !restoredRef.current) {
        console.info("[ItemDraftDebug] Change observed before draft initialization completed; waiting for GET to finish.");
      }
      return undefined;
    }

    const fingerprint = makeDraftFingerprint(values, media);

    // Restoring a draft updates React state asynchronously. Never autosave the
    // pre-restore Item state, because that would mark restored media as removed.
    if (restoredDraftPendingRef.current) {
      restoredDraftPendingRef.current = false;
      lastSavedFingerprintRef.current = fingerprint;
      window.clearTimeout(timerRef.current);
      return undefined;
    }

    if (fingerprint === lastSavedFingerprintRef.current) {
      window.clearTimeout(timerRef.current);
      return undefined;
    }

    window.clearTimeout(timerRef.current);
    console.info("[ItemDraftDebug] Form change detected; autosave scheduled", {
      delayMs: 1200,
      fieldCount: values && typeof values === "object" ? Object.keys(values).length : 0,
      mediaCount: media.length,
      fileCount: media.filter((asset) => isFile(asset?.value)).length,
    });
    timerRef.current = window.setTimeout(() => {
      console.info("[ItemDraftDebug] Autosave timer fired");
      save(values, media);
    }, 1200);

    return () => window.clearTimeout(timerRef.current);
  }, [enabled, media, restoredReady, save, values]);

  const clearDraft = useCallback(async () => {
    if (!currentDraftId) return;

    await api.delete("/api/item-draft/", {
      withCredentials: true,
    });
    setCurrentDraftId(null);
    knownSlotsRef.current.clear();
    lastSavedFingerprintRef.current = null;
    lastSavedDraftRef.current = null;
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