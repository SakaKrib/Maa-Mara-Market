import { useNavigate } from "react-router-dom";
import usePopularBlogs from "./PopularBlog";
import { baseUrl } from "../../Constant/Constant";

export default function AdvertBlogs() {
  const { blogs, loading, error } = usePopularBlogs();
  const navigate = useNavigate();

  if (loading || error || !blogs?.length) {
    return null;
  }
  

  // ⭐ Only show the first blog
  const blog = blogs[0];

  const goToPost = () => navigate(`/blogs/${blog.id}`);

  return (
    <div className="banners mt-5">
      <div className="max-w-7xl mx-auto">
        <div className="wrapper">

          {/* Section Title */}
          <div className="mb-6 text-start sectop mt-5">
            <h2 className="title">Featured Blog</h2>
          </div>

          {/* Blog Advert Box */}
          <div className="column">
            <div className="">
              <div className="row w-full">

                <div
                  className="item get-gray cursor-pointer border p-2 rounded shadow hover:shadow-lg transition w-full"
                  onClick={goToPost}
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

                  <div className="text-content fexcol mt-2">
                    <h3 className="font-semibold text-lg">{blog.title}</h3>

                    <p className="text-gray-500 text-sm mt-1">
                      Comments: {blog.comments.length} | Reactions: {blog.reactions.length}
                    </p>
                  </div>

                  {/* Full clickable overlay */}
                  <div className="over-link" onClick={goToPost}></div>
                </div>

              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
