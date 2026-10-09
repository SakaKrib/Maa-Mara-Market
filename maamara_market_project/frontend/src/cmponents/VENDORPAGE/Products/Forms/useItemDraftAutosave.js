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
  approvalRequestId = null,
  onRestore,
  onSaved,
}) {
  const [currentDraftId, setCurrentDraftId] = useState(draftId || null);
  const [restoring, setRestoring] = useState(Boolean(enabled));
  const [saving, setSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const [error, setError] = useState(null);
  const [restoredReady, setRestoredReady] = useState(false);

  const approvalEndpoint = approvalRequestId
    ? `/api/vendor-item-create-requests/${approvalRequestId}/save-draft/`
    : null;
  const draftEndpoint = approvalEndpoint || "/api/item-draft/";

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
  const onRestoreRef = useRef(onRestore);
  onRestoreRef.current = onRestore;
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
        endpoint: draftEndpoint,
        itemId: itemId ?? null,
        approvalRequestId: approvalRequestId ?? null,
      });
      try {
        const response = await api.get(draftEndpoint, {
          withCredentials: true,
          ...(approvalRequestId
            ? {}
            : {
                params: {
                  ...(itemId ? { item_id: itemId } : {}),
                  ...(vendorId ? { vendor_id: vendorId } : {}),
                },
              }),
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
          // Let the form decide whether this draft belongs to its current flow
          // before adopting its ID or media slots. New-item routes can receive
          // an unrelated existing-item draft from the unscoped GET endpoint.
          const restoreDecision = onRestoreRef.current?.(draft);
          if (restoreDecision === false || restoreDecision === "ignore") {
            console.info("[ItemDraftDebug] Existing draft rejected by form restore guard", {
              draftId: draft.draft_id ?? null,
              itemId: itemId ?? null,
            });
          } else {
            setCurrentDraftId(draft.draft_id);
            // The GET response is already a persisted draft. Cache it so an
            // unchanged restored form can submit without an unnecessary POST.
            // The save shortcut below still requires a valid draft_id.
            lastSavedDraftRef.current = draft;
            knownSlotsRef.current = new Set(
              (draft.media || []).map((asset) => asset.slot_key)
            );
            restoredDraftPendingRef.current = true;
          }
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
  }, [draftId, enabled, itemId, vendorId, approvalRequestId, draftEndpoint]);

  const save = useCallback(
    async (nextValues = valuesRef.current, nextMedia = mediaRef.current) => {
      if (!enabled || !restoredRef.current) return null;

      const fingerprint = makeDraftFingerprint(nextValues, nextMedia);
      if (
        fingerprint === lastSavedFingerprintRef.current &&
        lastSavedDraftRef.current?.draft_id
      ) {
        return lastSavedDraftRef.current;
      }

      if (savingRef.current) {
        // Submission must not interpret an in-flight autosave as a failure.
        // Wait for the active request, then persist the latest form/media state.
        pendingSaveRef.current = true;
        while (savingRef.current) {
          await new Promise((resolve) => window.setTimeout(resolve, 10));
        }
        pendingSaveRef.current = false;

        const latestValues = valuesRef.current;
        const latestMedia = mediaRef.current;
        const latestFingerprint = makeDraftFingerprint(latestValues, latestMedia);
        if (
          latestFingerprint === lastSavedFingerprintRef.current &&
          lastSavedDraftRef.current?.draft_id
        ) {
          return lastSavedDraftRef.current;
        }
        return save(latestValues, latestMedia);
      }

      savingRef.current = true;
      setSaving(true);

      const fileCount = nextMedia.filter((asset) => isFile(asset?.value)).length;
      console.info("[ItemDraftDebug] Draft save started", {
        endpoint: draftEndpoint,
        method: approvalRequestId ? "PATCH" : "POST",
        itemId: itemId ?? null,
        draftId: currentDraftId ?? null,
        approvalRequestId: approvalRequestId ?? null,
        fieldCount: nextValues && typeof nextValues === "object" ? Object.keys(nextValues).length : 0,
        mediaCount: nextMedia.length,
        fileCount,
      });

      try {
        const formData = new FormData();
        formData.append(
          approvalRequestId ? "draft_item" : "data",
          JSON.stringify(stripFiles(nextValues))
        );

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

        if (!approvalRequestId) {
          if (itemId) formData.append("item_id", String(itemId));
          if (vendorId) formData.append("vendor_id", String(vendorId));
          if (currentDraftId) formData.append("draft_id", currentDraftId);
        }

        const response = approvalRequestId
          ? await api.patch(draftEndpoint, formData, { withCredentials: true })
          : await api.post(draftEndpoint, formData, { withCredentials: true });

        const saved = response.data?.draft || response.data;
        console.info("[ItemDraftDebug] Draft save succeeded", {
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
        console.error("[ItemDraftDebug] Draft save FAILED", {
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
    [currentDraftId, enabled, itemId, vendorId, approvalRequestId, draftEndpoint, onSaved]
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

      // Files picked while the initial GET was in flight are newer than the
      // persisted draft. Do not mark them as saved; let normal autosave persist
      // them instead of suppressing the save based on the restored snapshot.
      const hasPendingFileUploads = media.some((asset) => isFile(asset?.value));
      if (!hasPendingFileUploads) {
        lastSavedFingerprintRef.current = fingerprint;
        window.clearTimeout(timerRef.current);
        return undefined;
      }

      lastSavedFingerprintRef.current = null;
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
      params: {
        ...(itemId ? { item_id: itemId } : {}),
        ...(vendorId ? { vendor_id: vendorId } : {}),
      },
    });
    setCurrentDraftId(null);
    knownSlotsRef.current.clear();
    lastSavedFingerprintRef.current = null;
    lastSavedDraftRef.current = null;
  }, [currentDraftId, itemId, vendorId]);

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