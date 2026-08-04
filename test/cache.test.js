const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const { loadCache, saveCache } = require("../lib/cache");

function tmpFile() {
  return path.join(fs.mkdtempSync(path.join(os.tmpdir(), "webmention-cache-")), "cache.json");
}

test("loadCache returns an empty default when no file exists", () => {
  assert.deepEqual(loadCache(tmpFile()), { lastFetched: 0, mentions: [] });
});

test("saveCache then loadCache round-trips, creating parent directories", () => {
  const file = path.join(tmpFile(), "..", "nested", "cache.json");
  const cache = { lastFetched: 123, mentions: [{ id: 1 }] };
  saveCache(file, cache);
  assert.deepEqual(loadCache(file), cache);
});
