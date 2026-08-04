const test = require("node:test");
const assert = require("node:assert/strict");

const { fetchMentions } = require("../lib/fetch");

test("requests the endpoint with token, per-page, and since params", async () => {
  let requestedUrl;
  const fetchImpl = async (url) => {
    requestedUrl = url;
    return { ok: true, json: async () => ({ children: [{ "wm-id": 1 }] }) };
  };

  const result = await fetchMentions({
    endpoint: "https://webmention.io/api/mentions.jf2",
    token: "abc123",
    since: "2026-01-01T00:00:00.000Z",
    perPage: 50,
    fetchImpl,
  });

  const url = new URL(requestedUrl);
  assert.equal(url.searchParams.get("token"), "abc123");
  assert.equal(url.searchParams.get("per-page"), "50");
  assert.equal(url.searchParams.get("since"), "2026-01-01T00:00:00.000Z");
  assert.deepEqual(result, [{ "wm-id": 1 }]);
});

test("omits the since param when not given", async () => {
  let requestedUrl;
  const fetchImpl = async (url) => {
    requestedUrl = url;
    return { ok: true, json: async () => ({ children: [] }) };
  };

  await fetchMentions({ endpoint: "https://webmention.io/api/mentions.jf2", token: "abc123", fetchImpl });

  assert.equal(new URL(requestedUrl).searchParams.has("since"), false);
});

test("throws on a non-ok response", async () => {
  const fetchImpl = async () => ({ ok: false, status: 401, statusText: "Unauthorized" });

  await assert.rejects(
    fetchMentions({ endpoint: "https://webmention.io/api/mentions.jf2", token: "bad", fetchImpl }),
    /401/
  );
});

test("returns an empty array when the response has no children", async () => {
  const fetchImpl = async () => ({ ok: true, json: async () => ({}) });

  const result = await fetchMentions({
    endpoint: "https://webmention.io/api/mentions.jf2",
    token: "abc123",
    fetchImpl,
  });
  assert.deepEqual(result, []);
});
