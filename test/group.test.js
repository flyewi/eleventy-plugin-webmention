const test = require("node:test");
const assert = require("node:assert/strict");

const { groupByUrl } = require("../lib/group");

const mentions = [
  { id: 1, type: "like", target: "https://example.com/post/" },
  { id: 2, type: "repost", target: "https://example.com/post/" },
  { id: 3, type: "reply", target: "https://example.com/post/" },
  { id: 4, type: "mention", target: "https://example.com/post/" },
  { id: 5, type: "like", target: "https://example.com/other/" },
];

test("buckets mentions matching the given url by type", () => {
  const result = groupByUrl(mentions, "https://example.com/post/");
  assert.equal(result.likes.length, 1);
  assert.equal(result.reposts.length, 1);
  assert.equal(result.replies.length, 1);
  assert.equal(result.mentions.length, 1);
  assert.equal(result.count, 4);
});

test("ignores a trailing slash mismatch between mention target and url", () => {
  const result = groupByUrl(mentions, "https://example.com/post");
  assert.equal(result.count, 4);
});

test("returns an empty bucket set for a url with no mentions", () => {
  const result = groupByUrl(mentions, "https://example.com/nothing/");
  assert.deepEqual(result, { likes: [], reposts: [], replies: [], mentions: [], count: 0 });
});
