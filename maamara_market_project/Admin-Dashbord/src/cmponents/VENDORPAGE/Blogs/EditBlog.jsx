import React, { useEffect, useState } from "react";
import {
  Modal,
  Box,
  Typography,
  Stack,
  Button,
  Snackbar,
  Alert,
} from "@mui/material";

import { Input } from "../../../../components/ui/input";
import { Label } from "../../../../components/ui/label";
import RichTextEditor from "../../RichTextEditor/RichTextEdit";
import api from "../../../Services/Api";
import { useTheme } from "@mui/material";
import { tokens } from "../../../theme";

const EditBlogModal = ({ open, onClose, blog, onUpdated }) => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [image, setImage] = useState(null);
  const [video, setVideo] = useState(null);

  const [snack, setSnack] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  // =========================
  // FILL EXISTING DATA
  // =========================
  useEffect(() => {
    if (blog) {
      setTitle(blog.title || "");
      setContent(blog.content || "");
    }
  }, [blog]);

  const showSnack = (message, severity = "success") => {
    setSnack({ open: true, message, severity });
  };

  const handleUpdate = async () => {
    try {
      const formData = new FormData();

      formData.append("title", title);
      formData.append("content", content);

      if (image) formData.append("image", image);
      if (video) formData.append("video", video);

      await api.patch(
        `/api/vendor/blogs/${blog.id}/`,
        formData,
        { withCredentials: true }
      );

      showSnack("Blog updated successfully 🎉", "success");

      if (onUpdated) {
        onUpdated(blog.id, {
          ...blog,
          title,
          content,
        });
      }

      onClose();
    } catch (err) {
      console.error(err);
      showSnack("Update failed", "error");
    }
  };

  return (
    <>
      <Modal open={open} onClose={onClose}>
        <Box
          sx={{
            width: "90%",
            maxWidth: 800,
            mx: "auto",
            mt: 6,
            p: 3,
            borderRadius: 2,
            backgroundColor: colors.primary[600],
            color: "#fff",
          }}
        >
          <Typography variant="h5" mb={2}>
            Edit Blog
          </Typography>

          <Stack spacing={2}>
            {/* TITLE */}
            <div>
              <Label>Title</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            {/* CONTENT (RICH TEXT) */}
            <div>
              <Label>Content</Label>
              <RichTextEditor
                value={content}
                onChange={setContent}
              />
            </div>

            {/* IMAGE */}
            <div>
              <Label>Image</Label>
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => setImage(e.target.files[0])}
              />
            </div>

            {/* VIDEO */}
            <div>
              <Label>Video</Label>
              <Input
                type="file"
                accept="video/*"
                onChange={(e) => setVideo(e.target.files[0])}
              />
            </div>

            {/* ACTIONS */}
            <Stack direction="row" spacing={2}>
              <Button
                variant="contained"
                onClick={handleUpdate}
                sx={{
                  backgroundColor: "#2563eb",
                  "&:hover": { backgroundColor: "#1d4ed8" },
                }}
              >
                Save Changes
              </Button>

              <Button variant="outlined" onClick={onClose}>
                Cancel
              </Button>
            </Stack>
          </Stack>
        </Box>
      </Modal>

      {/* SNACKBAR */}
      <Snackbar
        open={snack.open}
        autoHideDuration={3000}
        onClose={() => setSnack((p) => ({ ...p, open: false }))}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <div className="rounded-[20px] border border-gray-300 bg-card px-4 py-3 text-sm font-semibold text-card-foreground shadow-lg">
          {snack.message}
          <button
            type="button"
            onClick={() => setSnack((p) => ({ ...p, open: false }))}
            className="ml-3 text-xs text-muted-foreground hover:text-card-foreground"
            aria-label="Dismiss notification"
          >
            ×
          </button>
        </div>
      )}
    </>
  );
};

export default EditBlogModal;