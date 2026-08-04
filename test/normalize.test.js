const test = require("node:test");
const assert = require("node:assert/strict");

const { normalizeMention, mergeMentions } = require("../lib/normalize");

const rawLike = {
  "wm-id": 1,
  "wm-property": "like-of",
  "wm-target": "https://example.com/post/",
  url: "https://alice.example/",
  published: "2026-01-01T00:00:00.000Z",
  author: { name: "Alice", photo: "https://alice.example/photo.jpg", url: "https://alice.example/" },
};

const rawReply = {
  "wm-id": 2,
  "wm-property": "in-reply-to",
  "wm-target": "https://example.com/post/",
  url: "https://bob.example/reply",
  "wm-received": "2026-01-02T00:00:00.000Z",
  content: { html: "<p>Great <b>post</b>!</p>", text: "Great post!" },
};

test("maps wm-property to a flat type", () => {
  assert.equal(normalizeMention(rawLike).type, "like");
  assert.equal(normalizeMention(rawReply).type, "reply");
  assert.equal(normalizeMention({ "wm-property": "repost-of" }).type, "repost");
  assert.equal(normalizeMention({ "wm-property": "mention-of" }).type, "mention");
  assert.equal(normalizeMention({}).type, "mention");
});

test("prefers content.text, falling back to stripped content.html", () => {
  const mention = normalizeMention({ content: { html: "<p>Hi <b>there</b></p>" } });
  assert.equal(mention.content, "Hi there");
});

test("sanitize: false keeps raw HTML content", () => {
  const mention = normalizeMention(rawReply, { sanitize: false });
  assert.equal(mention.content, "<p>Great <b>post</b>!</p>");
});

test("falls back to wm-received when published is missing", () => {
  assert.equal(normalizeMention(rawReply).published, "2026-01-02T00:00:00.000Z");
});

test("mergeMentions dedupes by id, newer entry wins, sorted newest-first", () => {
  const existing = [
    { id: 1, published: "2026-01-01T00:00:00.000Z", content: "old" },
    { id: 2, published: "2026-01-02T00:00:00.000Z", content: "b" },
  ];
  const incoming = [{ id: 1, published: "2026-01-03T00:00:00.000Z", content: "edited" }];

  const merged = mergeMentions(existing, incoming);
  assert.deepEqual(
    merged.map((m) => m.id),
    [1, 2]
  );
  assert.equal(merged[0].content, "edited");
});
