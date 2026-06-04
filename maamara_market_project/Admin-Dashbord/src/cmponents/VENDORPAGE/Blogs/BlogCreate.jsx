import React, { useEffect, useState } from "react";
import api from "../../../Services/Api";
import { baseUrl } from "../../../cmponents/Constant/Constant";

import {
  Box,
  Typography,
  Paper,
  Button,
  Modal,
  Stack,
  Chip,
  Snackbar,
  Alert,
} from "@mui/material";

import { useTheme } from "@mui/material";
import { tokens } from "../../../theme";

import {
  Input,
} from "../../../../components/ui/input";

import {
  Label,
} from "../../../../components/ui/label";

import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "../../../../components/ui/select";

import RichTextEditor from "../../RichTextEditor/RichTextEdit";

/**
 * Utility: strip HTML + truncate words
 */
const getShortTitle = (html, limit = 3) => {
  const text = html?.replace(/<[^>]*>/g, "") || "";
  return text.split(" ").slice(0, limit).join(" ") + "...";
};

const VendorBlogManager = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);

  // modal
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(null);

  // edit fields
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [image, setImage] = useState(null);
  const [video, setVideo] = useState(null);
  const [item, setItem] = useState("");

  const [snack, setSnack] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  // ======================
  // FETCH BLOGS
  // ======================
  useEffect(() => {
    const fetchBlogs = async () => {
      try {
        const res = await api.get(`${baseUrl}/api/vendor/blogs/`, {
          withCredentials: true,
        });

        // ensure array
        setBlogs(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error(err);
        setBlogs([]);
      } finally {
        setLoading(false);
      }
    };

    fetchBlogs();
  }, []);

  // ======================
  // OPEN EDIT MODAL
  // ======================
  const handleEditOpen = (blog) => {
    setSelected(blog);

    setTitle(blog.title || "");
    setContent(blog.content || "");
    setItem(blog.item ? blog.item.toString() : "");

    setImage(null);
    setVideo(null);

    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setSelected(null);
  };

  // ======================
  // UPDATE BLOG
  // ======================
  const handleUpdate = async () => {
    try {
      const formData = new FormData();

      formData.append("title", title);
      formData.append("content", content);
      if (item) formData.append("item", item);
      if (image) formData.append("image", image);
      if (video) formData.append("video", video);

      await api.patch(
        `${baseUrl}/api/vendor/blogs/${selected.id}/`,
        formData,
        { withCredentials: true }
      );

      setSnack({
        open: true,
        message: "Blog updated successfully",
        severity: "success",
      });

      // refresh
      setBlogs((prev) =>
        prev.map((b) =>
          b.id === selected.id
            ? { ...b, title, content }
            : b
        )
      );

      handleClose();
    } catch (err) {
      setSnack({
        open: true,
        message: "Update failed",
        severity: "error",
      });
    }
  };

  // ======================
  // DELETE BLOG
  // ======================
  const handleDelete = async (id) => {
    try {
      await api.delete(
        `${baseUrl}/api/vendor/blogs/${id}/`,
        { withCredentials: true }
      );

      setBlogs((prev) =>
        prev.filter((b) => b.id !== id)
      );

      setSnack({
        open: true,
        message: "Blog deleted",
        severity: "success",
      });
    } catch (err) {
      setSnack({
        open: true,
        message: "Delete failed",
        severity: "error",
      });
    }
  };

  // ======================
  // SPLIT BLOGS
  // ======================
  const approved = Array.isArray(blogs)
    ? blogs.filter((b) => b.approved)
    : [];

  const pending = Array.isArray(blogs)
    ? blogs.filter((b) => !b.approved)
    : [];

  if (loading) {
    return (
      <Typography color={colors.gray[300]}>
        Loading blogs...
      </Typography>
    );
  }

  return (
    <Box p={3}>
      <Typography variant="h4" mb={3}>
        My Blogs
      </Typography>

      {/* ================= APPROVED ================= */}
      <Typography variant="h6" mb={2} color="green">
        Approved Blogs
      </Typography>

      <Stack spacing={2} mb={4}>
        {approved.map((blog) => (
          <Paper
            key={blog.id}
            sx={{
              p: 2,
              display: "flex",
              justifyContent: "space-between",
              backgroundColor: colors.primary[600],
            }}
          >
            <Box>
              <Typography fontWeight="bold">
                {getShortTitle(blog.content)}
              </Typography>

              <Chip
                label="Approved"
                color="success"
                size="small"
              />
            </Box>

            <Stack direction="row" spacing={1}>
              <Button
                variant="outlined"
                onClick={() => handleEditOpen(blog)}
              >
                Edit
              </Button>

              <Button
                color="error"
                variant="contained"
                onClick={() => handleDelete(blog.id)}
              >
                Delete
              </Button>
            </Stack>
          </Paper>
        ))}
      </Stack>

      {/* ================= PENDING ================= */}
      <Typography variant="h6" mb={2} color="orange">
        Pending Blogs
      </Typography>

      <Stack spacing={2}>
        {pending.map((blog) => (
          <Paper
            key={blog.id}
            sx={{
              p: 2,
              display: "flex",
              justifyContent: "space-between",
              backgroundColor: colors.primary[500],
            }}
          >
            <Box>
              <Typography>
                {getShortTitle(blog.content)}
              </Typography>

              <Chip
                label="Pending"
                color="warning"
                size="small"
              />
            </Box>

            <Stack direction="row" spacing={1}>
              <Button
                variant="outlined"
                onClick={() => handleEditOpen(blog)}
              >
                Edit
              </Button>

              <Button
                color="error"
                variant="contained"
                onClick={() => handleDelete(blog.id)}
              >
                Delete
              </Button>
            </Stack>
          </Paper>
        ))}
      </Stack>

      {/* ================= EDIT MODAL ================= */}
      <Modal open={open} onClose={handleClose}>
        <Box
          sx={{
            width: "80%",
            maxWidth: 800,
            mx: "auto",
            mt: 5,
            p: 3,
            backgroundColor: colors.primary[600],
            borderRadius: 2,
          }}
        >
          <Typography variant="h5" mb={2}>
            Edit Blog
          </Typography>

          <Stack spacing={2}>
            <div>
              <Label>Title</Label>
              <Input
                value={title}
                onChange={(e) =>
                  setTitle(e.target.value)
                }
              />
            </div>

            <div>
              <Label>Content</Label>
              <RichTextEditor
                value={content}
                onChange={setContent}
              />
            </div>

            <div>
              <Label>Image</Label>
              <Input
                type="file"
                onChange={(e) =>
                  setImage(e.target.files[0])
                }
              />
            </div>

            <div>
              <Label>Video</Label>
              <Input
                type="file"
                onChange={(e) =>
                  setVideo(e.target.files[0])
                }
              />
            </div>

            <Button
              variant="contained"
              onClick={handleUpdate}
            >
              Save Changes
            </Button>
          </Stack>
        </Box>
      </Modal>

      {/* ================= SNACKBAR ================= */}
      <Snackbar
        open={snack.open}
        autoHideDuration={3000}
        onClose={() =>
          setSnack({ ...snack, open: false })
        }
      >
        <Alert severity={snack.severity}>
          {snack.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default VendorBlogManager;