export const HN_BASE = "https://hacker-news.firebaseio.com/v0";
export const PER_PAGE = 30;
export const FEEDS = [
  { id: "top", label: "Top Stories", icon: "▲", desc: "Best of today" },
  { id: "new", label: "New", icon: "◆", desc: "Latest submissions" },
  { id: "best", label: "Best", icon: "★", desc: "All-time best" },
  { id: "ask", label: "Ask HN", icon: "?", desc: "Questions & discussions" },
  { id: "show", label: "Show HN", icon: "◎", desc: "What people built" },
  { id: "job", label: "Jobs", icon: "◈", desc: "Hiring & opportunities" },
];

export const TTL = {
  feedIds: 5 * 60 * 1000,
  item: 10 * 60 * 1000,
};

export function cacheGet(key, maxAgeMs) {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.ts || Date.now() - parsed.ts > maxAgeMs) return null;
    return parsed.data ?? null;
  } catch {
    return null;
  }
}

export function cacheSet(key, data) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify({ ts: Date.now(), data }));
  } catch {}
}

export function resolveUserId() {
  if (typeof window === "undefined") return "guest";
  const current = localStorage.getItem("hn-wrapper-user");
  if (current) return current;
  const id = `user-${crypto.randomUUID()}`;
  localStorage.setItem("hn-wrapper-user", id);
  return id;
}

export async function fetchJson(url, init) {
  const res = await fetch(url, init);
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || `Request failed: ${res.status}`);
  return data;
}

export async function fetchHNJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json();
}

export async function fetchFeedIds(feed) {
  const key = `hn-cache:feed:${feed}:ids`;
  const cached = cacheGet(key, TTL.feedIds);
  if (cached) return cached;
  const ids = await fetchHNJson(`${HN_BASE}/${feed}stories.json`);
  cacheSet(key, ids ?? []);
  return ids ?? [];
}

export async function fetchItem(id) {
  const key = `hn-cache:item:${id}`;
  const cached = cacheGet(key, TTL.item);
  if (cached) return cached;
  const item = await fetchHNJson(`${HN_BASE}/item/${id}.json`);
  cacheSet(key, item);
  return item;
}

export async function fetchItemsInChunks(ids, chunkSize = 40) {
  const all = [];
  for (let i = 0; i < ids.length; i += chunkSize) {
    const chunk = ids.slice(i, i + chunkSize);
    const rows = await Promise.all(chunk.map((id) => fetchItem(id)));
    all.push(...rows.filter(Boolean));
  }
  return all;
}

export function domainOf(url) {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return null;
  }
}

export function timeAgo(unix) {
  const s = Math.max(1, Math.floor(Date.now() / 1000) - Number(unix || 0));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}
