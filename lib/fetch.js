// Fetches webmentions from a webmention.io-compatible JF2 endpoint
// (https://webmention.io/api/mentions.jf2), which returns `{ children: [...] }`.
// `since` (an ISO date) limits the request to mentions received after the
// last successful fetch, so incremental builds don't re-download everything.
async function fetchMentions({ endpoint, token, since, perPage = 1000, fetchImpl = fetch }) {
  const url = new URL(endpoint);
  url.searchParams.set("token", token);
  url.searchParams.set("per-page", String(perPage));
  if (since) url.searchParams.set("since", since);

  const response = await fetchImpl(url.toString());
  if (!response.ok) {
    throw new Error(`webmention.io request failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data.children || [];
}

module.exports = { fetchMentions };
