// Filters the full cached mention list down to one page's incoming
// webmentions, bucketed by type for template use, e.g.:
//   {% set wm = webmentions | webmentionsForUrl(page.url) %}
//   {{ wm.likes.length }} likes, {{ wm.replies.length }} replies
function groupByUrl(mentions, url) {
  if (!Array.isArray(mentions) || !url) {
    return { likes: [], reposts: [], replies: [], mentions: [], count: 0 };
  }

  const normalizedUrl = url.replace(/\/$/, "");
  const matches = mentions.filter((mention) => (mention.target || "").replace(/\/$/, "") === normalizedUrl);

  const BUCKET_KEY = { like: "likes", repost: "reposts", reply: "replies", mention: "mentions" };
  const bucket = { likes: [], reposts: [], replies: [], mentions: [] };
  for (const mention of matches) {
    const key = BUCKET_KEY[mention.type] || "mentions";
    bucket[key].push(mention);
  }
  return { ...bucket, count: matches.length };
}

module.exports = { groupByUrl };
