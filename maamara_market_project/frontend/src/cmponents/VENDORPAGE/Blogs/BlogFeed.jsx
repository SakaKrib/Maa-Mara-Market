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
  
        const blogs = res.data?.results || [];
  
        // ✅ Only approved blogs
        const approvedBlogs = blogs.filter(
          (post) => post.approved === true
        );
  
        setPosts(approvedBlogs);
  
      } catch (err) {
        console.error("Error fetching blogs:", err);
        setError("Failed to load blog posts. Please try again later.");
      } finally {
        setLoading(false);
      }
    };
  
    fetchPosts();
  }, []);

  if (loading) return <p className="container mt-10">Loading blogs...</p>;
  if (error) return <p className="container mt-10" style={{ color: "red" }}>{error}</p>;
  if (posts.length === 0) return <p className="container mt-10">No blogs available at the moment.</p>;

  return (
    <div className="w-full container">
        <h4 className="border-b ">Blogs</h4>
        <div className="max-w-7xl mx-auto mt-4 flex flex-wrap gap-4">
          {posts.map((post) => (
            <div key={post.id} className="w-full md:w-[calc(50%-8px)]">
              <BlogCard post={post} />
            </div>
          ))}
        </div>
    <div className="w-[100%]">
    <PopularBlogs  post={posts}/>
    </div>
    </div>
  );
}
