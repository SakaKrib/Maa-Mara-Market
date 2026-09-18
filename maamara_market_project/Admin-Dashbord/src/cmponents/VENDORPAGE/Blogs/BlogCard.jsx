import CommentBox from "./Comment";
import ReactionButton from "./Reaction";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import DOMPurify from "dompurify";

dayjs.extend(relativeTime);

// ✂️ Safe text truncation (ONLY for plain text fields)
const truncateWords = (text, numWords) => {
  if (!text) return "";
  const words = text.split(" ");
  return words.length > numWords
    ? words.slice(0, numWords).join(" ") + "..."
    : text;
};

export default function BlogCard({ post }) {
  const navigate = useNavigate();

  if (!post) return null;

  const vendor = post.vendor || {};

  const goToPost = () => {
    navigate(`/blogs/${post.id}`);
  };

  return (
    <div>
      <div className="blog-card lg:w-full shadow rounded-[8px] bg-white">

        {/* 🧑 Vendor Header */}
        <div className="flex gap-4 items-center mb-4 p-2 border-b">
          {vendor.profile_picture && (
            <img
              src={vendor.profile_picture}
              alt={vendor.company_name || "Vendor"}
              style={{
                width: "50px",
                height: "50px",
                borderRadius: "50%",
              }}
            />
          )}

          <div>
            <h5 className="font-semibold">
              {vendor.company_name || "Unknown Vendor"}
            </h5>

            <p className="text-gray-500 text-sm">
              {dayjs(post.created_at).fromNow()}
            </p>
          </div>
        </div>

        {/* 📝 Blog Content */}
        <div className="p-2 space-y-2">

          {/* 🖼️ Image */}
          {post.image && (
            <div
              onClick={goToPost}
              className="cursor-pointer hover:opacity-90 transition"
            >
              <img
                src={post.image}
                alt={post.title || "blog image"}
                className="w-full max-w-[200px] max-h-[200px] object-cover rounded-md"
              />
            </div>
          )}

          {/* 📰 Title */}
          <h3
            onClick={goToPost}
            className="font-bold text-lg cursor-pointer hover:text-green-600 transition"
          >
            {truncateWords(post.title, 10) || "Untitled Blog"}
          </h3>

          {/* 🧠 CONTENT (SAFE RENDER) */}
          <div
            className="text-gray-600 text-sm line-clamp-4"
            dangerouslySetInnerHTML={{
              __html: DOMPurify.sanitize(post.content || ""),
            }}
          />

          {/* 🎥 Video */}
          {post.video && (
            <video
              controls
              src={post.video}
              className="w-full rounded-md mt-2"
            />
          )}

          {/* 🛒 Item Link */}
          {post.item && (
            <button
              onClick={() => navigate(`/item/${post.item}`)}
              className="mt-2 light-button ring-1 text-gray-500 px-3 py-2 rounded-md hover:bg-green-700 transition"
            >
              🛒 Buy Now
            </button>
          )}

          {/* 💬 Reactions */}
          <ReactionButton
            postId={post.id}
            reactions={post.reactions || []}
          />

          {/* 💬 Comments */}
          <CommentBox
            postId={post.id}
            comments={post.comments || []}
          />
        </div>
      </div>
    </div>
  );
}