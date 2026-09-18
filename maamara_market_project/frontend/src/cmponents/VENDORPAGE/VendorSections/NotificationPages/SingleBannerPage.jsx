import React, { useEffect, useState } from "react";
import api from "../../../../Services/Api";
import { baseUrl } from "../../../Constant/Constant";
import { useTheme, MenuItem } from "@mui/material";
import { tokens } from "../../../../theme";

import {
  Box,
  Typography,
  Paper,
  Button,
  Stack,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  CircularProgress,
} from "@mui/material";

const VendorBannerManager = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  const [banners, setBanners] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const [open, setOpen] = useState(false);
  const [selectedBanner, setSelectedBanner] = useState(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    title: "",
    subtitle: "",
    background_color: "",
    cta_type: "item",
    cta_item: "",
    cta_url: "",
    image: null,
  });

  // =========================
  // FETCH DATA
  // =========================
  useEffect(() => {
    fetchBanners();
    fetchItems();
  }, []);

  const fetchBanners = async () => {
    setLoading(true);
    try {
      const res = await api.get(`${baseUrl}/api/banners-list/`, {
        withCredentials: true,
      });

      const data = res.data;
      setBanners(data.results || []);
    } catch (err) {
      console.error(err);
      setBanners([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchItems = async () => {
    try {
      const res = await api.get(`${baseUrl}/api/items/`, {
        withCredentials: true,
      });

      const data = res.data;
      setItems(data.results || []);
    } catch (err) {
      console.error(err);
      setItems([]);
    }
  };

  // =========================
  // OPEN EDIT
  // =========================
  const openEditModal = (banner) => {
    setSelectedBanner(banner);

    setForm({
      title: banner.title || "",
      subtitle: banner.subtitle || "",
      background_color: banner.background_color || "",
      cta_type: banner.cta_type || "item",
      cta_item: banner.cta_item || banner.item || "",
      cta_url: banner.cta_url || "",
      image: null,
    });

    setOpen(true);
  };

  const closeModal = () => {
    setOpen(false);
    setSelectedBanner(null);

    setForm({
      title: "",
      subtitle: "",
      background_color: "",
      cta_type: "item",
      cta_item: "",
      cta_url: "",
      image: null,
    });
  };

  // =========================
  // UPDATE
  // =========================
  const handleUpdate = async () => {
    if (!selectedBanner) return;

    setSaving(true);

    try {
      const formData = new FormData();

      formData.append("title", form.title);
      formData.append("subtitle", form.subtitle);
      formData.append("background_color", form.background_color);

      formData.append("cta_type", form.cta_type);

      if (form.cta_type === "item") {
        formData.append("cta_item", form.cta_item || "");
        formData.append("cta_url", "");
      } else {
        formData.append("cta_item", "");
        formData.append("cta_url", form.cta_url || "");
      }

      if (form.image) {
        formData.append("image", form.image);
      }

      await api.patch(
        `${baseUrl}/api/vendor/banners/${selectedBanner.id}/`,
        formData,
        { withCredentials: true }
      );

      // update UI
      setBanners((prev) =>
        prev.map((b) =>
          b.id === selectedBanner.id
            ? {
                ...b,
                ...form,
              }
            : b
        )
      );

      closeModal();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  // =========================
  // DELETE
  // =========================
  const handleDelete = async (id) => {
    try {
      await api.delete(`${baseUrl}/api/vendor/banners/${id}/`, {
        withCredentials: true,
      });

      setBanners((prev) => prev.filter((b) => b.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  // =========================
  // CTA URL LOGIC
  // =========================
  const getCtaUrl = (banner) => {
    if (banner.cta_type === "item") {
      return banner.cta_item || banner.item
        ? `/product/${banner.cta_item || banner.item}/`
        : null;
    }

    return banner.cta_url;
  };

  // =========================
  // CARD
  // =========================
  const renderCard = (banner) => {
    const url = getCtaUrl(banner);

    return (
      <Paper
        key={banner.id}
        sx={{
          p: 2,
          width: 320,
          backgroundColor: colors.primary[600],
          borderRadius: 2,
        }}
      >
        {banner.image && (
          <img
            src={banner.image}
            alt={banner.title}
            style={{
              width: "100%",
              height: 160,
              objectFit: "cover",
              borderRadius: 8,
            }}
          />
        )}

        <Typography variant="h6" color="#fff">
          {banner.title}
        </Typography>

        <Typography variant="body2" color={colors.gray[300]}>
          {banner.subtitle}
        </Typography>

        <Chip
          label={banner.is_active ? "Active" : "Inactive"}
          color={banner.is_active ? "success" : "warning"}
        />

        {url && (
          <Typography variant="caption" color="#fff">
            CTA → {url}
          </Typography>
        )}

        <Stack direction="row" spacing={1} mt={1}>
          <Button
            size="small"
            variant="contained"
            onClick={() => openEditModal(banner)}
          >
            Edit
          </Button>

          <Button
            size="small"
            color="error"
            variant="outlined"
            onClick={() => handleDelete(banner.id)}
          >
            Delete
          </Button>
        </Stack>
      </Paper>
    );
  };

  if (loading) {
    return (
      <Box p={3}>
        <Typography>Loading banners...</Typography>
      </Box>
    );
  }

  return (
    <Box p={3}>
      <Typography variant="h4" mb={2} sx={{color:colors.gray[100]}}>
        My Banners
      </Typography>

      <Box display="flex" flexWrap="wrap" gap={2}>
        {banners.map(renderCard)}
      </Box>

      {/* MODAL */}
      <Dialog open={open} onClose={closeModal} fullWidth maxWidth="md">
        <DialogTitle>Edit Banner</DialogTitle>

        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField
              label="Title"
              value={form.title}
              onChange={(e) =>
                setForm({ ...form, title: e.target.value })
              }
              fullWidth
            />

            <TextField
              label="Subtitle"
              value={form.subtitle}
              onChange={(e) =>
                setForm({ ...form, subtitle: e.target.value })
              }
              fullWidth
            />

            <TextField
              label="Background Color"
              value={form.background_color}
              onChange={(e) =>
                setForm({ ...form, background_color: e.target.value })
              }
              fullWidth
            />

            {/* CTA TYPE */}
            <TextField
              select
              label="CTA Type"
              value={form.cta_type}
              onChange={(e) =>
                setForm({ ...form, cta_type: e.target.value })
              }
              fullWidth
            >
              <MenuItem value="item">Product</MenuItem>
              <MenuItem value="external">External URL</MenuItem>
            </TextField>

            {/* ITEM */}
            {form.cta_type === "item" && (
              <TextField
                select
                label="Select Product"
                value={form.cta_item}
                onChange={(e) =>
                  setForm({ ...form, cta_item: e.target.value })
                }
                fullWidth
              >
                {items.map((item) => (
                  <MenuItem key={item.id} value={item.id}>
                    {item.name}
                  </MenuItem>
                ))}
              </TextField>
            )}

            {/* URL */}
            {form.cta_type === "external" && (
              <TextField
                label="External URL"
                value={form.cta_url}
                onChange={(e) =>
                  setForm({ ...form, cta_url: e.target.value })
                }
                fullWidth
              />
            )}

            <input
              type="file"
              accept="image/*"
              onChange={(e) =>
                setForm({ ...form, image: e.target.files[0] })
              }
            />

            <Stack direction="row" spacing={2}>
              <Button
                variant="contained"
                onClick={handleUpdate}
                disabled={saving}
              >
                {saving ? (
                  <CircularProgress size={18} />
                ) : (
                  "Save Changes"
                )}
              </Button>

              <Button onClick={closeModal}>Cancel</Button>
            </Stack>
          </Stack>
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default VendorBannerManager;