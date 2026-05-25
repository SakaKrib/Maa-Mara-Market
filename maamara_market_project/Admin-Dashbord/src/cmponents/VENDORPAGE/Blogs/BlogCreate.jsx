"use client";

import { useState } from "react";
import api from "../../../Services/Api";

import { Input } from "../../../../components/ui/input";
import { Label } from "../../../../components/ui/label";
import { Textarea } from "../../../../components/ui/textarea";
import { Button } from "../../../../components/ui/button";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../../components/ui/card";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../../components/ui/select";

import {
  useTheme,
  Snackbar,
  Alert,
  CircularProgress,
} from "@mui/material";

import { tokens } from "../../../theme";
import RichTextEditor from "../../RichTextEditor/RichTextEdit";

export default function CreateBlog({ items = [] }) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const [image, setImage] = useState(null);
  const [video, setVideo] = useState(null);

  const [item, setItem] = useState("");

  // ✅ Loading state
  const [submitting, setSubmitting] = useState(false);

  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  // ✅ Snackbar state
  const [snack, setSnack] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  // =========================
  // SHOW SNACK
  // =========================
  const showSnack = (
    message,
    severity = "success"
  ) => {
    setSnack({
      open: true,
      message,
      severity,
    });
  };

  // =========================
  // CLOSE SNACK
  // =========================
  const handleCloseSnack = () => {
    setSnack((prev) => ({
      ...prev,
      open: false,
    }));
  };

  // =========================
  // HANDLE SUBMIT
  // =========================
  const handleSubmit = async (e) => {
    e.preventDefault();

    // ✅ Prevent multiple submissions
    if (submitting) return;

    setSubmitting(true);

    const formData = new FormData();

    formData.append("title", title);
    formData.append("content", content);

    if (image) {
      formData.append("image", image);
    }

    if (video) {
      formData.append("video", video);
    }

    if (item) {
      formData.append("item", item);
    }

    try {
      await api.post(
        "/api/blogs/",
        formData,
        {
          headers: {
            "Content-Type":
              "multipart/form-data",
          },
        }
      );

      // ✅ Success snackbar
      showSnack(
        "Blog posted successfully 🎉",
        "success"
      );

      // ✅ Reset form
      setTitle("");
      setContent("");

      setImage(null);
      setVideo(null);

      setItem("");

    } catch (err) {
      console.error(err);

      // ✅ Error snackbar
      showSnack(
        err?.response?.data?.detail ||
          "Something went wrong",
        "error"
      );

    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card
      className="max-w-xl mx-auto shadow-md"
      style={{
        backgroundColor:
          colors.primary[600],

        color: colors.gray[100],
      }}
    >
      <CardHeader>
        <CardTitle>
          Create Blog Post
        </CardTitle>
      </CardHeader>

      <CardContent>
        <form
          onSubmit={handleSubmit}
          className="space-y-4"
        >
          {/* TITLE */}
          <div>
            <Label>
              Title
            </Label>

            <Input
              placeholder="Title"
              value={title}
              onChange={(e) =>
                setTitle(e.target.value)
              }
              style={{
                backgroundColor:
                  colors.primary[500],
                color: colors.gray[100],
              }}
            />
          </div>

          {/* CONTENT */}
          <div>
            <Label>
              Content
            </Label>

            <RichTextEditor
              placeholder="Say something..."
              value={content}
              onChange={setContent}
              style={{
                backgroundColor:
                  colors.primary[500],
                color: colors.gray[100],
              }}
            />
          </div>

          {/* IMAGE */}
          <div>
            <Label>
              Image (optional)
            </Label>

            <Input
              type="file"
              accept="image/*"
              onChange={(e) =>
                setImage(
                  e.target.files[0]
                )
              }
              style={{
                backgroundColor:
                  colors.primary[500],
                color: colors.gray[100],
              }}
            />

            {image && (
              <img
                src={URL.createObjectURL(
                  image
                )}
                alt="preview"
                className="mt-2 rounded-md max-h-40 object-cover"
              />
            )}
          </div>

          {/* VIDEO */}
          <div>
            <Label>
              Video (optional, max 1min)
            </Label>

            <Input
              type="file"
              accept="video/*"
              onChange={(e) =>
                setVideo(
                  e.target.files[0]
                )
              }
              style={{
                backgroundColor:
                  colors.primary[500],
                color: colors.gray[100],
              }}
            />

            {video && (
              <video
                controls
                src={URL.createObjectURL(
                  video
                )}
                className="mt-2 rounded-md max-h-60 w-full"
              />
            )}
          </div>

          {/* SELECT ITEM */}
          <div>
            <Label>
              Link to Item (optional)
            </Label>

            <Select
              onValueChange={(val) =>
                setItem(val)
              }
              value={item}
            >
              <SelectTrigger
                style={{
                  backgroundColor:
                    colors.primary[500],

                  color:
                    colors.gray[100],
                }}
              >
                <SelectValue placeholder="Select an item to link..." />
              </SelectTrigger>

              <SelectContent>
                {items.length > 0 ? (
                  items.map((itm) => (
                    <SelectItem
                      key={itm.id}
                      value={itm.id.toString()}
                    >
                      {itm.name}
                    </SelectItem>
                  ))
                ) : (
                  <div className="px-3 py-2 text-sm text-gray-500">
                    No items available
                  </div>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* SUBMIT BUTTON */}
          <Button
            type="submit"
            disabled={submitting}
            className="w-full text-white font-bold"
            style={{
              backgroundColor:
                colors.greenAccent[500],

              opacity: submitting
                ? 0.8
                : 1,

              cursor: submitting
                ? "not-allowed"
                : "pointer",
            }}
          >
            {submitting ? (
              <div className="flex items-center justify-center gap-2">
                <CircularProgress
                  size={18}
                  color="inherit"
                />

                Posting Blog...
              </div>
            ) : (
              "Post Blog"
            )}
          </Button>
        </form>
      </CardContent>

      {/* =========================
          SNACKBAR
      ========================= */}
      <Snackbar
        open={snack.open}
        autoHideDuration={4000}
        onClose={handleCloseSnack}
        anchorOrigin={{
          vertical: "top",
          horizontal: "right",
        }}
      >
        <Alert
          onClose={handleCloseSnack}
          severity={snack.severity}
          variant="filled"
          elevation={6}
          sx={{
            width: "100%",
            borderRadius: "10px",
            fontWeight: "bold",
          }}
        >
          {snack.message}
        </Alert>
      </Snackbar>
    </Card>
  );
}