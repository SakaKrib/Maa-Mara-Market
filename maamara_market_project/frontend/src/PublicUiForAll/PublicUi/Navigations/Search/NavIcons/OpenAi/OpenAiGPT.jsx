import React, { useState, useEffect, useRef } from "react";
import { FaComments } from "react-icons/fa";
import api from "../../../../../../Services/Api";
import { Link } from "react-router-dom";

const ChatGpt = () => {
  const [messages, setMessages] = useState([
    { from: "bot", text: "Hi! How can I help you today?" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Adjust textarea height dynamically up to max height (~30 rows)
  useEffect(() => {
    if (!textareaRef.current) return;
    const ta = textareaRef.current;
    ta.style.height = "auto";
    const maxHeight = 30 * 24; // 30 rows * 24px line height (adjust if needed)
    ta.style.height = Math.min(ta.scrollHeight, maxHeight) + "px";
  }, [input]);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = input.trim();
    setMessages((prev) => [...prev, { from: "user", text: userMessage }]);
    setInput("");
    setLoading(true);

    try {
      const response = await api.post(
        "/api/ai-chat/",
        { message: userMessage },
        {
          withCredentials: true,
          headers: { "Content-Type": "application/json" },
        }
      );

      if (response.data.reply) {
        setMessages((prev) => [...prev, { from: "bot", text: response.data.reply }]);
      } else {
        setMessages((prev) => [...prev, { from: "bot", text: "Sorry, no response from AI." }]);
      }
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((prev) => [
        ...prev,
        { from: "bot", text: "Oops! Something went wrong. Try again later." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col max-w-xl mx-auto h-[600px] border border-gray-300 rounded-lg bg-gray-50 shadow-md">
      <div className="flex-1 p-4 overflow-y-auto space-y-3">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`max-w-3/4 p-3 rounded-lg shadow-sm whitespace-pre-wrap
              ${msg.from === "user" ? "bg-purple-300 self-end w-fit" : "bg-gray-100 text-gray-700 self-start w-fit"}`}
          >
            {msg.text}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* live chat */}
      <div className="flex gap-4 p-4 items-center">
          <p className="text-sm text-gray-500">Are you satisfied? Or do you want to join a live chat?</p>
          <Link to={'/customer-join-chat'}><button className="light-button">group chat</button></Link>
        </div>

      <form
        className="flex border-t border-gray-300 p-3 gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          sendMessage();
        }}
      >
      
        <div className="flex w-full gap-2 items-center">
        <textarea
          ref={textareaRef}
          rows={1}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your message..."
          className="flex-1 resize-none rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          disabled={loading}
          style={{ maxHeight: "720px", overflowY: "auto" }}
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className={`rounded-full px-5 py-2 font-semibold text-blue-500 ring ring-1 h-fit
            ${loading || !input.trim() ? " cursor-not-allowed" : " hover:ring-blue-600 hover:bg-gray-100"}`}
        >
          {loading ? "..." : "Send"}
        </button>
        </div>
      </form>
    </div>
  );
};

const ChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Floating Chat Icon */}
      <button
        onClick={() => setIsOpen((open) => !open)}
        className="fixed bottom-6 right-6 z-40 flex items-center justify-center w-14 h-14 rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700 focus:outline-none"
        aria-label="Open chat"
        title={isOpen ? "Close chat" : "Open chat"}
      >
        <FaComments size={28} />
      </button>

      {/* Modal Overlay + Chat Box */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-end bg-black bg-opacity-50">
          <div className="relative w-full max-w-xl mx-4 mb-6">
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-2 right-2 text-gray-700 hover:text-gray-900 focus:outline-none text-2xl font-bold"
              aria-label="Close chat"
              title="Close chat"
            >
              &times;
            </button>
            <ChatGpt />
          </div>
        </div>
      )}
    </>
  );
};

export default ChatWidget;
