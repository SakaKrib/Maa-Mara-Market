import { useEffect, useState } from "react";
import api from "../../../Services/Api"; // Adjust the path
import dayjs from "dayjs";

export default function useNewBlogs() {
  const [newBlogCount, setNewBlogCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNewBlogs = async () => {
      try {
        const res = await api.get("/api/blogs/"); // Fetch all blogs
        const blogs = res.data.results || [];

        const oneWeekAgo = dayjs().subtract(7, "day");

        const newBlogs = blogs.filter(
          (b) => dayjs(b.created_at).isAfter(oneWeekAgo) && !b.seen_by_admin
        );

        setNewBlogCount(newBlogs.length);
      } catch (err) {
        console.error("Failed to fetch new blogs:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchNewBlogs();
  }, []);

  return { newBlogCount, loading };
}
