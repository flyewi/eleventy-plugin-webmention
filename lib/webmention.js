const { fetchMentions } = require("./fetch");
const { loadCache, saveCache } = require("./cache");
const { normalizeMention, mergeMentions } = require("./normalize");
const { groupByUrl } = require("./group");

const DEFAULTS = {
  host: undefined,
  token: undefined,
  endpoint: "https://webmention.io/api/mentions.jf2",
  perPage: 1000,
  cacheFile: ".cache/webmentions-cache.json",
  cacheTTL: 60 * 60 * 1000,
  sanitize: true,
  log: true,
};

function toAbsoluteUrl(host, url) {
  return new URL(url, host).toString();
}

module.exports = function webmentionPlugin(eleventyConfig, userOptions = {}) {
  const options = { ...DEFAULTS, ...userOptions };

  if (!options.host) {
    throw new Error(
      'eleventy-plugin-webmention: the "host" option is required, e.g. { host: "https://example.com" }'
    );
  }

  function log(...args) {
    if (options.log) console.log("[webmention]", ...args);
  }

  // An async global data function: Eleventy awaits it before rendering, so
  // every template sees the same already-fetched `webmentions` array without
  // each page needing to know about caching or the network call itself.
  eleventyConfig.addGlobalData("webmentions", async () => {
    const cache = loadCache(options.cacheFile);
    const mentions = cache.mentions || [];

    // Skip the network entirely on repeated --serve/--watch rebuilds within
    // the TTL window, and whenever no token is configured (e.g. local dev).
    if (Date.now() - (cache.lastFetched || 0) < options.cacheTTL) {
      log(`using cached webmentions (${mentions.length})`);
      return mentions;
    }

    if (!options.token) {
      log('no "token" option set, skipping fetch and using cached webmentions');
      return mentions;
    }

    try {
      const raw = await fetchMentions({
        endpoint: options.endpoint,
        token: options.token,
        since: cache.lastFetched ? new Date(cache.lastFetched).toISOString() : undefined,
        perPage: options.perPage,
      });
      const incoming = raw.map((entry) => normalizeMention(entry, { sanitize: options.sanitize }));
      const merged = mergeMentions(mentions, incoming);
      saveCache(options.cacheFile, { lastFetched: Date.now(), mentions: merged });
      log(`fetched ${incoming.length} webmention(s) since last run, ${merged.length} total`);
      return merged;
    } catch (error) {
      // A flaky webmention.io request shouldn't fail the whole site build —
      // fall back to whatever was cached from the last successful fetch.
      log("fetch failed, using cached webmentions:", error.message);
      return mentions;
    }
  });

  eleventyConfig.addFilter("webmentionsForUrl", (mentions, url) =>
    groupByUrl(mentions, toAbsoluteUrl(options.host, url))
  );
};

module.exports.toAbsoluteUrl = toAbsoluteUrl;
module.exports.groupByUrl = groupByUrl;
module.exports.normalizeMention = normalizeMention;
module.exports.mergeMentions = mergeMentions;
