import DOMPurify from "dompurify";

const RICH_TEXT_CONFIG = {
  USE_PROFILES: { html: true },
  ALLOWED_TAGS: [
    "p", "br", "strong", "em", "u", "s",
    "h1", "h2", "h3",
    "ul", "ol", "li",
    "blockquote", "pre", "code", "a",
  ],
  ALLOWED_ATTR: ["href", "title", "target", "rel", "style"],
  ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto):|[^a-z]|[a-z+.-]+(?:[^a-z+.-:]|$))/i,
  FORBID_TAGS: ["script", "style", "iframe", "object", "embed", "form", "svg", "math"],
  FORBID_ATTR: [
    "onerror", "onload", "onclick", "onmouseover", "onfocus",
    "onmouseenter", "onmouseleave", "style",
  ],
  SANITIZE_DOM: true,
  SANITIZE_NAMED_PROPS: true,
};

export const sanitizeRichText = (value) => {
  if (!value) return "";
  return DOMPurify.sanitize(String(value), RICH_TEXT_CONFIG);
};
