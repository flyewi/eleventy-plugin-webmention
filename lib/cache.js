const fs = require("node:fs");
const path = require("node:path");

function loadCache(cacheFile) {
  try {
    return JSON.parse(fs.readFileSync(cacheFile, "utf8"));
  } catch {
    return { lastFetched: 0, mentions: [] };
  }
}

function saveCache(cacheFile, cache) {
  fs.mkdirSync(path.dirname(cacheFile), { recursive: true });
  fs.writeFileSync(cacheFile, JSON.stringify(cache, null, 2), "utf8");
}

module.exports = { loadCache, saveCache };
