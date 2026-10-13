import React, { useEffect, useState } from "react";
import api from "../../../../Services/Api";
import { useTheme } from "@mui/material";
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

import RichTextEditor from "../../../RichTextEditor/RichTextEdit";

const VendorBlogManagerNotification = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const [open, setOpen] = useState(false);
  const [selectedBlog, setSelectedBlog] = useState(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    title: "",
    content: "",
    image: null,
  });

  // =========================
  // FETCH BLOGS
  // =========================
  useEffect(() => {
    fetchBlogs();
  }, []);

  const fetchBlogs = async () => {
    try {
      const res = await api.get(`/api/vendor/blogs/`, {
        withCredentials: true,
      });

      const data = res.data;
      setBlogs(Array.isArray(data) ? data : data.results || []);
    } catch (err) {
      console.error(err);
      setBlogs([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshBlogs = async () => {
    setLoading(true);
    await fetchBlogs();
    setLoading(false);
  };

  // =========================
  // MODAL
  // =========================
  const openEditModal = (blog) => {
    setSelectedBlog(blog);

    setForm({
      title: blog.title || "",
      content: blog.content || "",
      image: null,
    });

    setOpen(true);
  };

  const closeModal = () => {
    setOpen(false);
    setSelectedBlog(null);
    setForm({ title: "", content: "", image: null });
  };

  // =========================
  // UPDATE
  // =========================
  const handleUpdate = async () => {
    if (!selectedBlog) return;

    setSaving(true);

    try {
      const formData = new FormData();
      formData.append("title", form.title);
      formData.append("content", form.content);

      if (form.image) {
        formData.append("image", form.image);
      }

      await api.patch(
        `/api/vendor/blogs/${selectedBlog.id}/`,
        formData,
        { withCredentials: true }
      );

      setBlogs((prev) =>
        prev.map((b) =>
          b.id === selectedBlog.id
            ? { ...b, title: form.title, content: form.content }
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
      await api.delete(`/api/vendor/blogs/${id}/`, {
        withCredentials: true,
      });

      setBlogs((prev) => prev.filter((b) => b.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  // =========================
  // CARD (FIXED SAFETY HERE)
  // =========================
  const renderCard = (blog) => (
    <Paper
      key={blog.id}
      sx={{
        p: 2,
        width: 320,
        backgroundColor: colors.primary[600],
        borderRadius: 2,
        display: "flex",
        flexDirection: "column",
        gap: 1,
      }}
    >
      {blog.image && (
        <img
          src={blog.image}
          alt={blog.title || "blog image"}
          style={{
            width: "100%",
            height: 160,
            objectFit: "cover",
            borderRadius: 8,
          }}
        />
      )}

      <Typography variant="h6" sx={{ color: colors.gray[100] }}>
        {(blog.title || "")
          .replace(/<[^>]*>/g, "")
          .slice(0, 20)}
      </Typography>

      <Typography variant="body2" color={colors.gray[300]}>
        {(blog.content || "")
          .replace(/<[^>]*>/g, "")
          .slice(0, 80)}
        ...
      </Typography>

      <Chip
        label={blog.approved ? "Published" : "Pending"}
        color={blog.approved ? "success" : "warning"}
      />

      <Stack direction="row" spacing={1}>
        <Button size="small" onClick={() => openEditModal(blog)}>
          Edit
        </Button>

        <Button
          size="small"
          color="error"
          onClick={() => handleDelete(blog.id)}
        >
          Delete
        </Button>
      </Stack>
    </Paper>
  );

  const pending = blogs.filter((b) => !b.approved);
  const approved = blogs.filter((b) => b.approved);

  if (loading) {
    return (
      <Box p={3}>
        <Typography>Loading blogs...</Typography>
      </Box>
    );
  }

  return (
    <Box p={3}>
      <Typography variant="h4" mb={2} color="orange">
        Pending Blogs
      </Typography>

      <Box display="flex" flexWrap="wrap" gap={2} mb={5}>
        {pending.map(renderCard)}
      </Box>

      <Typography variant="h4" mb={2} color="green">
        Published Blogs
      </Typography>

      <Box display="flex" flexWrap="wrap" gap={2}>
        {approved.map(renderCard)}
      </Box>

      {/* MODAL */}
      <Dialog open={open} onClose={closeModal} fullWidth maxWidth="md">
        <DialogTitle>Edit Blog</DialogTitle>

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

            <div>
              <Typography mb={1}>Content</Typography>
              <RichTextEditor
                value={form.content}
                onChange={(val) =>
                  setForm({ ...form, content: val })
                }
              />
            </div>

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
                onClick={async () => {
                    await handleUpdate();
                    await handleRefreshBlogs();
                  }}
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

export default VendorBlogManagerNotification;