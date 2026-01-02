import React, { useState, useEffect } from "react";
import { useTheme } from "@mui/material";
import { tokens } from "../../../../../src/theme";

const Input = ({ message, setMessage, sendMessage, onTyping }) => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);

  console.log("Selected file:", selectedFile); 
  // Cleanup object URL when selectedFile changes or component unmounts
  useEffect(() => {
    if (!selectedFile) {
      setPreview(null);
      return;
    }
    if (selectedFile.type.startsWith("image/")) {
      const objectUrl = URL.createObjectURL(selectedFile);
      setPreview(objectUrl);

      return () => URL.revokeObjectURL(objectUrl);
    } else {
      setPreview(null);
    }
  }, [selectedFile]);

  const handleFileChange = (e) => {
    if (!e.target.files || e.target.files.length === 0) {
      setSelectedFile(null);
      return;
    }
  
    const file = e.target.files[0];
    setSelectedFile(file);
    // ✅ correct
  };
  

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message && !selectedFile) return;

    let fileUrl = null;

    if (selectedFile) {
      const formData = new FormData();
      formData.append("file", selectedFile);

      try {
        const res = await fetch("http://127.0.0.1:8000/api/upload/", {
          method: "POST",
          body: formData,
        });
        const data = await res.json();
        fileUrl = data.fileUrl;
        console.log("File uploaded, URL:", fileUrl);
      } catch (err) {
        console.error("❌ File upload failed", err);
      }
    }

    sendMessage({
      text: message,
      fileUrl,
      fileName: selectedFile ? selectedFile.name : null,
    });
    console.log("file url",fileUrl)

    setMessage("");
    setSelectedFile(null);
  };

  const handleChange = (e) => {
    setMessage(e.target.value);
    if (onTyping) onTyping(e.target.value);
  };

  return (
    <form className="w-full flex items-center p-2 gap-2" onSubmit={handleSubmit}>
      <label
        htmlFor="file-input"
        style={{
          padding: "0.5rem",
          cursor: "pointer",
          borderRadius: "50%",
          backgroundColor: colors.gray[100],
          border: `1.5px solid ${colors.primary[500]}`,
        }}
      >
        📎
      </label>
      <input
        id="file-input"
        type="file"
        style={{ display: "none" }}
        onChange={handleFileChange}
      />

      <input
        type="text"
        placeholder="Type a message..."
        value={message}
        onChange={handleChange}
        onKeyDown={(e) => e.key === "Enter" && handleSubmit(e)}
        style={{
          flexGrow: 1,
          padding: "0.5rem 1rem",
          fontSize: "1rem",
          borderRadius: "9999px",
          border: `1.5px solid ${colors.primary[500]}`,
          backgroundColor: colors.gray[50],
          color: colors.gray[900],
          outline: "none",
          transition: "border-color 0.3s",
        }}
        onFocus={(e) => (e.target.style.borderColor = colors.primary[700])}
        onBlur={(e) => (e.target.style.borderColor = colors.primary[500])}
      />

      {preview && (
        <div
          style={{
            width: "40px",
            height: "40px",
            overflow: "hidden",
            borderRadius: "8px",
            border: `1px solid ${colors.primary[300]}`,
          }}
        >
          <img
            src={preview}
            alt="preview"
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </div>
      )}

      <button
        type="submit"
        className="ml-2 px-4 py-2 rounded-full font-semibold transition-colors primary-button"
        style={{
          backgroundColor: colors.primary[500],
          color: colors.gray[50],
          border: "none",
          cursor: "pointer",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = colors.primary[700])}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = colors.primary[500])}
      >
        Send
      </button>
    </form>
  );
};

export default Input;
