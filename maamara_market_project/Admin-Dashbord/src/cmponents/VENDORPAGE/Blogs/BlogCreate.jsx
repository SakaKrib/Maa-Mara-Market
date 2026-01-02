"use client";

import { useState } from "react";
import api from "../../../Services/Api";
import { Input } from "../../../../components/ui/input";
import { Label } from "../../../../components/ui/label";
import { Textarea } from "../../../../components/ui/textarea";
import { Button } from "../../../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../../components/ui/card";
import { useToast } from "../../../../components/ui/toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../../components/ui/select";
import { useTheme } from "@mui/material";
import {tokens} from "../../../theme"

export default function CreateBlog({ items = [] }) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [image, setImage] = useState(null);
  const [video, setVideo] = useState(null);
  const [item, setItem] = useState("");
  const { toast } = useToast();
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  const handleSubmit = async (e) => {
    e.preventDefault();

     

    const formData = new FormData();
    formData.append("title", title);
    formData.append("content", content);
    if (image) formData.append("image", image);
    if (video) formData.append("video", video);
    if (item) formData.append("item", item);

    try {
      await api.post("/api/blogs/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      toast({
        title: "Blog posted 🎉",
        description: "Your blog has been successfully created.",
      });

      setTitle("");
      setContent("");
      setImage(null);
      setVideo(null);
      setItem("");
    } catch (err) {
      toast({
        title: "Failed to post",
        description: err?.response?.data?.detail || "Something went wrong",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="max-w-xl mx-auto  shadow-md" style={{
      backgroundColor: colors.primary[600], color:colors.gray[100]
    }}>
      <CardHeader>
        <CardTitle>Create Blog Post</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Title</Label>
            <Input
              placeholder="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div>
            <Label>Content</Label>
            <Textarea
              placeholder="Say something..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </div>

          <div>
            <Label>Image (optional)</Label>
            <Input
              type="file"
              accept="image/*"
              onChange={(e) => setImage(e.target.files[0])}
            />
            {image && (
              <img
                src={URL.createObjectURL(image)}
                alt="preview"
                className="mt-2 rounded-md max-h-40 object-cover"
              />
            )}
          </div>

          <div>
            <Label>Video (optional, max 1min)</Label>
            <Input
              type="file"
              accept="video/*"
              onChange={(e) => setVideo(e.target.files[0])}
            />
            {video && (
              <video
                controls
                src={URL.createObjectURL(video)}
                className="mt-2 rounded-md max-h-60 w-full"
              />
            )}
          </div>

          <div>
            <Label>Link to Item (optional)</Label>
            <Select onValueChange={(val) => setItem(val)} value={item}>
              <SelectTrigger>
                <SelectValue placeholder="Select an item to link..." />
              </SelectTrigger>
              <SelectContent>
                {items.length > 0 ? (
                  items.map((itm) => (
                    <SelectItem key={itm.id} value={itm.id.toString()}>
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

          <Button type="submit" className="w-full">
            Post Blog
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
