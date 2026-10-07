import { useCallback, useEffect, useRef, useState } from "react";
import api, { getWebSocketUrl } from "../../../../Services/Api/";

const isFile = (value) =>
  typeof Blob !== "undefined" &&
  value instanceof Blob &&
  typeof value.name === "string";

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
  itemId = null,
  vendorId = null,
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
  const lastSavedFingerprintRef = useRef(null);
  const lastSavedDraftRef = useRef(null);
  const lastServerUpdatedAtRef = useRef(null);
  const scopeKey = itemId ? String(itemId) : "new";
  const valuesRef = useRef(values);
  const mediaRef = useRef(media);
  valuesRef.current = values;
  mediaRef.current = media;

  useEffect(() => {
    setCurrentDraftId(draftId || null);
  }, [draftId]);

  useEffect(() => {
    restoredRef.current = false;
    lastSavedFingerprintRef.current = null;
    lastSavedDraftRef.current = null;
    lastServerUpdatedAtRef.current = null;
    knownSlotsRef.current = new Set();
  }, [scopeKey]);

  useEffect(() => {
    if (!enabled || restoredRef.current) return undefined;

    let cancelled = false;

    const load = async () => {
      try {
        const response = await api.get("/api/item-draft/", {
          withCredentials: true,
          params: itemId ? { item_id: itemId } : {},
        });

        if (cancelled) return;

        const draft = response.data?.draft;
        if (draft?.exists) {
          lastServerUpdatedAtRef.current = draft.updated_at || null;
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
  }, [enabled, itemId, scopeKey, onRestore]);

  const refreshFromServer = useCallback(async () => {
    try {
      const response = await api.get("/api/item-draft/", {
        withCredentials: true,
        params: itemId ? { item_id: itemId } : {},
      });
      const draft = response.data?.draft;

      if (!draft?.exists) return null;

      const incomingUpdatedAt = draft.updated_at || null;
      if (
        incomingUpdatedAt &&
        lastServerUpdatedAtRef.current &&
        new Date(incomingUpdatedAt) <= new Date(lastServerUpdatedAtRef.current)
      ) {
        return draft;
      }

      lastServerUpdatedAtRef.current = incomingUpdatedAt;
      setCurrentDraftId(draft.draft_id);
      knownSlotsRef.current = new Set(
        (draft.media || []).map((asset) => asset.slot_key)
      );
      onRestore?.(draft);
      setError(null);
      return draft;
    } catch (err) {
      setError(
        err?.response?.data?.detail ||
          err?.response?.data?.error ||
          "Draft could not be refreshed."
      );
      return null;
    }
  }, [itemId, onRestore]);

  const save = useCallback(
    async (nextValues = valuesRef.current, nextMedia = mediaRef.current) => {
      if (!enabled || !restoredRef.current) return null;

      const fingerprint = makeDraftFingerprint(nextValues, nextMedia);
      if (fingerprint === lastSavedFingerprintRef.current) {
        return lastSavedDraftRef.current;
      }

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

        if (itemId) {
          formData.append("item_id", String(itemId));
        }
        if (vendorId) {
          formData.append("vendor_id", String(vendorId));
        }

        const response = await api.post("/api/item-draft/", formData, {
          withCredentials: true,
          headers: { "Content-Type": "multipart/form-data" },
        });

        const saved = response.data?.draft || response.data;
        if (saved?.draft_id) setCurrentDraftId(saved.draft_id);
        lastServerUpdatedAtRef.current = saved?.updated_at || lastServerUpdatedAtRef.current;

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
        setError(
          err?.response?.data?.detail ||
            err?.response?.data?.error ||
            "Draft could not be saved."
        );
        return null;
      } finally {
        savingRef.current = false;
        setSaving(false);
      }
    },
    [currentDraftId, enabled, itemId, vendorId, onSaved]
  );

  useEffect(() => {
    if (!enabled) return undefined;

    let socket = null;
    let reconnectTimer = null;
    let cancelled = false;

    const connect = () => {
      if (cancelled) return;

      socket = new WebSocket(getWebSocketUrl("/ws/realtime/"));

      socket.onmessage = async (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (
            payload?.model !== "ItemDraft" ||
            payload?.event !== "item_draft.updated"
          ) {
            return;
          }

          await refreshFromServer();
        } catch {
          // Ignore malformed realtime messages; the normal autosave remains authoritative.
        }
      };

      socket.onclose = () => {
        if (cancelled) return;
        reconnectTimer = window.setTimeout(connect, 2000);
      };

      socket.onerror = () => {
        socket?.close();
      };
    };

    connect();

    return () => {
      cancelled = true;
      window.clearTimeout(reconnectTimer);
      socket?.close();
    };
  }, [enabled, refreshFromServer]);

  useEffect(() => {
    if (!enabled || !restoredRef.current) return undefined;

    const fingerprint = makeDraftFingerprint(values, media);
    if (fingerprint === lastSavedFingerprintRef.current) {
      window.clearTimeout(timerRef.current);
      return undefined;
    }

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
    lastSavedFingerprintRef.current = null;
    lastSavedDraftRef.current = null;
    lastServerUpdatedAtRef.current = null;
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