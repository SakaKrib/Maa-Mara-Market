import { useState } from "react";
import api from "../../../../src/Services/Api";
import { Button } from "../../../../components/ui/button";
import { Input } from "../../../../components/ui/input";

export default function CommentBox({ postId, comments: initialComments }) {
  const [text, setText] = useState("");
  const [comments, setComments] = useState(initialComments);

  const handleComment = async () => {
    if (!text.trim()) return;

    try {
      const response = await api.post(`api/blogs/${postId}/comment/`, { text });
      const newComment = response.data;

      // 👇 update state without reloading
      setComments(prev => [...prev, newComment]);
      setText("");
    } catch (error) {
      console.error("Failed to post comment", error);
    }
  };

  return (
    <div>
      {/* <div className="space-y-2">
        {comments.map((c) => (
          <p key={c.id}>
            <b>{c.user_name || c.visitor_id || "Guest"}</b>: {c.text}
          </p>
        ))}
      </div> */}

      <div className="flex justify-between items-center mt-3 gap-2">
        <Input
          placeholder="Write a comment..."
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <Button onClick={handleComment}>Send</Button>
      </div>
    </div>
  );
}
