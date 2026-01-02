import { useEffect, useState } from "react";
import api from "../../../../src/Services/Api";
import BlogCard from "./BlogCard";
import PopularBlogs from "../../Hooks/BlogHooksNew/PouplarBlogsFetch";

export default function BlogFeed() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);   // ⏳ For better UX
  const [error, setError] = useState(null);       // ❌ Error handling

 
  useEffect(() => {
    const fetchPosts = async () => {
      try {
        setLoading(true);
        const res = await api.get("api/blogs/");
        console.log(res);
        setPosts(res.data?.results || []);
      } catch (err) {
        console.error("Error fetching blogs:", err);
        setError("Failed to load blog posts. Please try again later.");
      } finally {
        setLoading(false);
      }
    };
  
    fetchPosts();
  }, []);

  if (loading) return <p>Loading blogs...</p>;
  if (error) return <p style={{ color: "red" }}>{error}</p>;
  if (posts.length === 0) return <p>No blogs available at the moment.</p>;

  return (
    <div className="w-full container">
        <h4 className="border-b ">Blogs</h4>
    <div className="flex gap-2 mt-4  max-w-7xl mx-auto">
      {posts.map(post => (
        <BlogCard key={post.id} post={post} />
      ))}
    </div>
    <div className="w-[100%]">
    <PopularBlogs  post={posts}/>
    </div>
    </div>
  );
}
