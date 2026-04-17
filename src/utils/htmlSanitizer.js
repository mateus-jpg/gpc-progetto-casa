import sanitizeHtml from "sanitize-html";

export function sanitizeRichText(dirtyHtml) {
  return sanitizeHtml(dirtyHtml || "", {
    allowedTags: [
      "p",
      "br",
      "b",
      "i",
      "em",
      "strong",
      "a",
      "ul",
      "ol",
      "li",
      "blockquote",
      "code",
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "span",
    ],
    allowedAttributes: {
      a: ["href", "title", "target", "rel"],
      // Note: style attributes removed to prevent CSS injection attacks
      span: ["class"],
    },
    // Only allow safe CSS classes, no inline styles
    allowedClasses: {
      span: ["highlight", "bold", "italic", "underline"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    allowedSchemesByTag: {},
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", {
        target: "_blank",
        rel: "noopener noreferrer",
      }),
    },
    // rimuove commenti HTML e script/eventi pericolosi
    allowProtocolRelative: false,
  });
}

export function sanitizePlainText(dirtyText) {
  return sanitizeHtml(dirtyText || "", {
    allowedTags: [],
    allowedAttributes: {},
  });
}

export function stripHtml(html) {
  if (!html) return "";
  return html.replace(/<[^>]+>/g, "").trim();
}
