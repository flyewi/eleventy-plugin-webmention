const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const webmentionPlugin = require("../lib/webmention");

function fakeEleventyConfig() {
  const globalData = {};
  const filters = {};
  return {
    addGlobalData(name, fn) {
      globalData[name] = fn;
    },
    addFilter(name, fn) {
      filters[name] = fn;
    },
    globalData,
    filters,
  };
}

function tmpCacheFile() {
  return path.join(fs.mkdtempSync(path.join(os.tmpdir(), "webmention-plugin-")), "cache.json");
}

test("throws without a host option", () => {
  assert.throws(() => webmentionPlugin(fakeEleventyConfig(), {}), /host/);
});

test("skips fetching and returns an empty list when no cache and no token", async () => {
  const eleventyConfig = fakeEleventyConfig();
  webmentionPlugin(eleventyConfig, {
    host: "https://example.com",
    cacheFile: tmpCacheFile(),
    log: false,
  });

  const mentions = await eleventyConfig.globalData.webmentions();
  assert.deepEqual(mentions, []);
});

test("fetches and caches webmentions when a token is set and the cache is stale", async () => {
  const cacheFile = tmpCacheFile();
  const eleventyConfig = fakeEleventyConfig();
  const originalFetch = global.fetch;
  global.fetch = async () => ({
    ok: true,
    json: async () => ({
      children: [
        {
          "wm-id": 1,
          "wm-property": "like-of",
          "wm-target": "https://example.com/post/",
          url: "https://alice.example/",
          published: "2026-01-01T00:00:00.000Z",
        },
      ],
    }),
  });

  try {
    webmentionPlugin(eleventyConfig, {
      host: "https://example.com",
      token: "secret",
      cacheFile,
      log: false,
    });

    const mentions = await eleventyConfig.globalData.webmentions();
    assert.equal(mentions.length, 1);
    assert.equal(mentions[0].type, "like");

    const persisted = JSON.parse(fs.readFileSync(cacheFile, "utf8"));
    assert.equal(persisted.mentions.length, 1);
    assert.ok(persisted.lastFetched > 0);
  } finally {
    global.fetch = originalFetch;
  }
});

test("uses the cache without fetching when still within the TTL", async () => {
  const cacheFile = tmpCacheFile();
  fs.mkdirSync(path.dirname(cacheFile), { recursive: true });
  fs.writeFileSync(
    cacheFile,
    JSON.stringify({ lastFetched: Date.now(), mentions: [{ id: 1, type: "like" }] })
  );

  const eleventyConfig = fakeEleventyConfig();
  let fetchCalled = false;
  const originalFetch = global.fetch;
  global.fetch = async () => {
    fetchCalled = true;
    return { ok: true, json: async () => ({ children: [] }) };
  };

  try {
    webmentionPlugin(eleventyConfig, {
      host: "https://example.com",
      token: "secret",
      cacheFile,
      cacheTTL: 60 * 60 * 1000,
      log: false,
    });

    const mentions = await eleventyConfig.globalData.webmentions();
    assert.equal(fetchCalled, false);
    assert.deepEqual(mentions, [{ id: 1, type: "like" }]);
  } finally {
    global.fetch = originalFetch;
  }
});

test("falls back to the cache when the fetch fails", async () => {
  const cacheFile = tmpCacheFile();
  fs.mkdirSync(path.dirname(cacheFile), { recursive: true });
  fs.writeFileSync(cacheFile, JSON.stringify({ lastFetched: 0, mentions: [{ id: 1, type: "like" }] }));

  const eleventyConfig = fakeEleventyConfig();
  const originalFetch = global.fetch;
  global.fetch = async () => {
    throw new Error("network down");
  };

  try {
    webmentionPlugin(eleventyConfig, {
      host: "https://example.com",
      token: "secret",
      cacheFile,
      log: false,
    });

    const mentions = await eleventyConfig.globalData.webmentions();
    assert.deepEqual(mentions, [{ id: 1, type: "like" }]);
  } finally {
    global.fetch = originalFetch;
  }
});

test("webmentionsForUrl filter resolves a relative url against host and groups by type", () => {
  const eleventyConfig = fakeEleventyConfig();
  webmentionPlugin(eleventyConfig, {
    host: "https://example.com",
    cacheFile: tmpCacheFile(),
    log: false,
  });

  const mentions = [
    { id: 1, type: "like", target: "https://example.com/post/" },
    { id: 2, type: "reply", target: "https://example.com/post/" },
  ];

  const result = eleventyConfig.filters.webmentionsForUrl(mentions, "/post/");
  assert.equal(result.likes.length, 1);
  assert.equal(result.replies.length, 1);
  assert.equal(result.count, 2);
});
