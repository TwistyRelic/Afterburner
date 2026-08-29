export const REPO = "TwistyRelic/Afterburner";
const ENDPOINT = `https://api.github.com/repos/${REPO}/commits?per_page=100`;

const CACHE = "afterburner.commits";

export async function fetchCommits() {
  // The unauthenticated GitHub API allows 60 requests an hour. A demo that
  // refetches on every mount burns that and prints a 403 on stage, so the
  // first success is cached and reused for the rest of the day.
  try {
    const held = JSON.parse(window.localStorage.getItem(CACHE) || "null");
    if (held && held.length) return held;
  } catch { /* no cache */ }

  const response = await fetch(ENDPOINT, {
    headers: { Accept: "application/vnd.github+json" },
  });
  if (!response.ok) throw new Error(`GitHub API ${response.status}`);
  const payload = await response.json();
  try { window.localStorage.setItem(CACHE, JSON.stringify(payload)); } catch { /* full */ }

  return payload.map((item) => ({
    sha: item.sha.slice(0, 7),
    url: item.html_url,
    subject: item.commit.message.split("\n")[0],
    at: Date.parse(item.commit.author.date),
  }));
}

// Every commit was made mid-run, so each one is labelled with the kilometre
// marker spoken most recently before it. The markers are anchored to the commit
// timeline in order, which is what guarantees no marker is rendered empty: the
// commits are split into one contiguous block per marker, oldest block first.
export function assignMarkers(commits, markerKms) {
  const ordered = [...commits].sort((a, b) => a.at - b.at);
  if (!ordered.length || !markerKms.length) return [];

  const blocks = Math.min(markerKms.length, ordered.length);
  const size = ordered.length / blocks;

  return markerKms.slice(0, blocks).map((km, index) => ({
    km,
    commits: ordered
      .slice(Math.round(index * size), Math.round((index + 1) * size))
      .reverse(),
  }));
}
