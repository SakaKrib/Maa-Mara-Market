import DOMPurify from "dompurify";

const ALLOWED_TAGS = [
  "a", "b", "blockquote", "br", "code", "em", "h1", "h2", "h3", "h4",
  "h5", "h6", "hr", "i", "li", "ol", "p", "pre", "strong", "u", "ul",
];
const ALLOWED_ATTR = ["href", "title"];

export const getSafeActivityText = (value = "") => {
  const sanitized = DOMPurify.sanitize(String(value ?? ""), {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    FORBID_TAGS: ["script", "style", "iframe", "object", "embed", "form", "input", "svg", "math"],
    FORBID_ATTR: ["style", "onerror", "onclick", "onload"],
  });
  const documentFragment = new DOMParser().parseFromString(sanitized, "text/html");
  return (documentFragment.body.textContent || "").replace(/\\s+/g, " ").trim();
};

const SafeActivityContent = ({ content, className = "" }) => {
  const safeHtml = DOMPurify.sanitize(String(content ?? ""), {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    FORBID_TAGS: ["script", "style", "iframe", "object", "embed", "form", "input", "svg", "math"],
    FORBID_ATTR: ["style", "onerror", "onclick", "onload"],
  });

  if (!safeHtml.trim()) return null;

  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{ __html: safeHtml }}
    />
  );
};

export default SafeActivityContent;
