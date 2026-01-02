import { useNavigate } from "react-router-dom";
import usePopularBlogs from "./PopularBlog";
import { baseUrl } from "../../Constant/Constant";

export default function PopularBlogs({ posts }) {
  const { blogs, loading, error, refetch } = usePopularBlogs();
  const navigate = useNavigate();

  if (loading) return <p>Loading popular blogs...</p>;
  if (error) return <p>Error loading blogs.</p>;
  if (!blogs.length) return <p>No popular blogs yet.</p>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-4 mt-2">
      {blogs.map(blog => {
        const goToPost = () => {
          navigate(`/blogs/${blog.id}`); // Correct reference here
        };

        return (
          <div
            key={blog.id}
            className="cursor-pointer border p-2 rounded shadow hover:shadow-lg transition w-[100%]"
            onClick={() => navigate(`/blogs/${blog.id}`)}
          >
            {blog.image && (
            <div
              onClick={goToPost}
              className="cursor-pointer hover:opacity-90 transition w-full"
            >
              <img
                src={`${baseUrl}${blog.image}`}
                alt={blog.title || "blog image"}
                className="w-full h-[500px] object-cover rounded-md"
              />
            </div>
          )}
            <h3 className="font-semibold text-lg">{blog.title}</h3>
            <p className="text-gray-500 text-sm">
              Comments: {blog.comments.length} | Reactions: {blog.reactions.length}
            </p>
          </div>
        );
      })}
    </div>
  );
}
