const TYPE_BY_PROPERTY = {
  "like-of": "like",
  "repost-of": "repost",
  "in-reply-to": "reply",
  "mention-of": "mention",
  "bookmark-of": "mention",
};

function stripTags(html) {
  return String(html)
    .replace(/<[^>]*>/g, "")
    .trim();
}

// Converts a raw webmention.io JF2 entry into the shape templates consume:
// a flat `type` (like/repost/reply/mention) instead of the mf2 "wm-property"
// vocabulary, and plain-text `content` (HTML stripped by default) since
// mentions are attacker-controlled and shouldn't be rendered as raw markup
// without the site author opting in explicitly.
function normalizeMention(raw, { sanitize = true } = {}) {
  const property = raw["wm-property"] || "mention-of";
  const content = raw.content || {};
  // With sanitize on, prefer the already-plain-text field and fall back to
  // stripping the HTML field; with it off, prefer the richer HTML field so
  // callers who opted out of sanitizing actually get markup back.
  const value = sanitize
    ? content.text || stripTags(content.html || "")
    : content.html || content.text || "";

  return {
    id: raw["wm-id"],
    type: TYPE_BY_PROPERTY[property] || "mention",
    source: raw.url,
    target: raw["wm-target"],
    published: raw.published || raw["wm-received"] || null,
    author: {
      name: (raw.author && raw.author.name) || "",
      photo: (raw.author && raw.author.photo) || "",
      url: (raw.author && raw.author.url) || "",
    },
    content: value,
  };
}

// Merges freshly fetched mentions into the cached list, keyed by webmention.io's
// `wm-id` so an edited/re-sent mention replaces its previous version instead of
// appearing twice. Sorted newest-first for direct use in a template.
function mergeMentions(existing, incoming) {
  const byId = new Map(existing.map((mention) => [mention.id, mention]));
  for (const mention of incoming) byId.set(mention.id, mention);
  return [...byId.values()].sort(
    (a, b) => new Date(b.published || 0) - new Date(a.published || 0)
  );
}

module.exports = { normalizeMention, mergeMentions };
