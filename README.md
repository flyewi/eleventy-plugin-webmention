# eleventy-plugin-webmention

Eleventy plugin that fetches received [webmentions](https://webmention.io) (likes, reposts, replies, mentions) for your site and exposes them to templates as global data, plus a filter to group them per page.

## Why

You've registered your site with [webmention.io](https://webmention.io) (via [IndieAuth](https://indieauth.com)) so other sites can notify you when they link to, like, or reply to your posts. This plugin pulls those mentions in at build time, caches them locally, and gives you a simple per-page filter to render them — no client-side JS or server required.

## Installation

```
npm install eleventy-plugin-webmention
```

```js
const webmentionPlugin = require("eleventy-plugin-webmention");

module.exports = function (eleventyConfig) {
  eleventyConfig.addPlugin(webmentionPlugin, {
    host: "https://example.com",
    token: process.env.WEBMENTION_IO_TOKEN,
  });
};
```

In a template:

```njk
{% set wm = webmentions | webmentionsForUrl(page.url) %}

<p>{{ wm.likes.length }} likes · {{ wm.reposts.length }} reposts · {{ wm.replies.length }} replies</p>

<ul>
{% for reply in wm.replies %}
  <li>
    <strong>{{ reply.author.name }}</strong>: {{ reply.content }}
    <a href="{{ reply.source }}">source</a>
  </li>
{% endfor %}
</ul>
```

## Options

| Option | Default | Description |
| --- | --- | --- |
| `host` | *(required)* | Your site's canonical origin, e.g. `"https://example.com"`. Used to resolve relative URLs passed to `webmentionsForUrl`. |
| `token` | `undefined` | Your webmention.io API token. Without it, the plugin uses whatever's already cached and never hits the network — handy for local dev. |
| `endpoint` | `"https://webmention.io/api/mentions.jf2"` | The webmention.io JF2 endpoint to query. |
| `perPage` | `1000` | Max mentions requested per fetch. |
| `cacheFile` | `".cache/webmentions-cache.json"` | Where fetched mentions and the last-fetched timestamp are persisted between builds. |
| `cacheTTL` | `3600000` (1 hour) | How long a cached fetch is considered fresh. Within this window, repeated builds (e.g. `--serve`) never call the network. |
| `sanitize` | `true` | Strip HTML tags from mention content, keeping only plain text. Mentions are third-party content, so this is on by default. |
| `log` | `true` | Log a one-line summary after each fetch. |

## How it works

- `webmentions` is registered as [Eleventy global data](https://www.11ty.dev/docs/data-global/) via an async function, so Eleventy awaits the fetch (or cache read) once, before rendering any template — every page sees the same array.
- On each build, if the cache is older than `cacheTTL`, the plugin fetches only mentions received *since* the last successful fetch (via webmention.io's `since` param) and merges them into the cache, keyed by webmention ID — so an edited/re-sent mention replaces its previous version instead of duplicating.
- If the fetch fails (network error, bad token), the build falls back to the last successfully cached mentions rather than failing outright.
- The `webmentionsForUrl` filter resolves its `url` argument against `host` (so both `page.url` and a full URL work), then buckets matching mentions into `{ likes, reposts, replies, mentions, count }`.

## License

MIT
