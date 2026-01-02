import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../../../Services/Api";
import ReactionButton from "./Reaction";
import CommentBox from "./Comment";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import defaultUser from "../../../../src/assets/profile/default-sender.jpg"

dayjs.extend(relativeTime);

export default function SingleBlogPage() {
  const { id } = useParams(); // 👈 get post ID from URL
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);

  // 📥 Fetch blog post details
  const fetchPost = async () => {
    try {
      const res = await api.get(`/api/blogs/${id}/`);
      setPost(res.data);
    } catch (error) {
      console.error("Failed to load post:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPost();
  }, [id]);

  // 🌀 Show loading state
  if (loading) return <div className="p-6 text-center">Loading post...</div>;
  if (!post) return <div className="p-6 text-center">Post not found.</div>;

  const vendor = post.vendor || {};

  return (
    <div className="max-w-7xl mx-auto lg:w-full p-4 flex gap-4">
        <div className="lg:w-3/4 border-r p-2">
      {/* 🧑 Vendor Info */}
      <div className="flex items-center gap-4 mb-6 border-b pb-4">
        {vendor.profile_picture && (
          <img
            src={vendor.profile_picture}
            alt={vendor.company_name || "Vendor"}
            className="w-14 h-14 rounded-full object-cover"
          />
        )}
        <div>
          <h4 className="font-semibold text-lg">
            {vendor.company_name || "Unknown Vendor"}
          </h4>
          <p className="text-gray-500 text-sm">
            {dayjs(post.created_at).fromNow()}
          </p>
        </div>
      </div>

      {/* 📝 Post Content */}
      {post.image && (
        <img
          src={post.image}
          alt={post.title}
          className="w-full rounded-md mb-6 object-cover max-h-[400px]"
        />
      )}

      <h1 className="text-3xl font-bold mb-4">{post.title}</h1>
      <p className="text-gray-800 mb-6 leading-relaxed">{post.content}</p>

      {post.video && (
        <video
          controls
          src={post.video}
          className="w-full rounded-md mb-6 max-h-[500px]"
        />
      )}

      <div className="flex justify-between items-center p-2">
      {post.item && (
        <button
        onClick={() => navigate(`/item/${post.item}`)}
        className="mt-2 light-button ring-1 text-gray-500 px-3 py-2 rounded-md hover:bg-green-700 transition"
      >
        🛒 Buy Now
      </button>
      )}
      {/* ❤️ Reactions */}
      <div className="mb-6">
        <ReactionButton postId={post.id} reactions={post.reactions || []} />
      </div>
      </div>
      </div>

      <div className="flex-1 lg:w-full ">
        {/* Right column: Comments */}
      {post.comments && post.comments.length > 0 ? (
        <div className="space-y-4 mt-4">
            {post.comments.map((c) => {
            // Determine the image source
            const commenterImage =
                c.user?.profile?.profile_picture || // If logged-in user has a profile picture
                (c.visitor_id ? defaultUser : defaultUser); // Visitor or fallback

            const commenterName = c.user_name || "Guest";

            return (
                <div key={c.id} className="flex items-start gap-3">
                <img
                    src={commenterImage}
                    alt={commenterName}
                    className="w-10 h-10 rounded-full object-cover ring-1"
                />
                <div>
                    <p className="text-gray-700">
                    <b className="text-sm">{commenterName}</b> -{" "}
                    <span className="text-gray-400 text-xs">
                        {dayjs(c.created_at).fromNow()}
                    </span>
                    </p>
                    <p className="text-gray-800 text-sm">{c.text}</p>
                </div>
                </div>
            );
            })}
        </div>
        ) : (
        <p className="text-gray-500">No comments yet.</p>
        )}

        {/* 💬 Comment form */}
        <CommentBox postId={post.id} comments={post.comments || []} />
        </div>

    </div>
  );
}
