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
const LOCAL_STORE_KEY = "hn-wrapper-static-store-v1";
const BASE_LISTS = [
  { id: "bookmarks", name: "Bookmarks", system: true },
  { id: "read-later", name: "Read Later", system: true },
];
let wrapperBackendMode = "unknown";

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
  const raw = await res.text();
  let data = null;
  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    data = null;
  }
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

function createEmptyLocalStore() {
  return { users: {}, posts: [], comments: [] };
}

function readLocalStore() {
  if (typeof window === "undefined") return createEmptyLocalStore();
  try {
    const raw = localStorage.getItem(LOCAL_STORE_KEY);
    if (!raw) return createEmptyLocalStore();
    const parsed = JSON.parse(raw);
    return {
      users: parsed.users ?? {},
      posts: parsed.posts ?? [],
      comments: parsed.comments ?? [],
    };
  } catch {
    return createEmptyLocalStore();
  }
}

function writeLocalStore(store) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LOCAL_STORE_KEY, JSON.stringify(store));
}

function ensureLocalUser(store, userId) {
  if (!store.users[userId]) {
    store.users[userId] = {
      lists: BASE_LISTS.map((l) => ({ ...l, createdAt: Date.now() })),
      listItems: {},
    };
  }
  const user = store.users[userId];
  if (!Array.isArray(user.lists)) user.lists = [];
  if (!user.listItems || typeof user.listItems !== "object") user.listItems = {};
  for (const base of BASE_LISTS) {
    if (!user.lists.some((l) => l.id === base.id)) {
      user.lists.push({ ...base, createdAt: Date.now() });
    }
  }
  return user;
}

async function withWrapperBackend(apiCall, localFallback) {
  if (wrapperBackendMode === "local") return localFallback();
  try {
    const result = await apiCall();
    wrapperBackendMode = "api";
    return result;
  } catch {
    wrapperBackendMode = "local";
    return localFallback();
  }
}

export async function wrapperListLists(userId) {
  return withWrapperBackend(
    async () => {
      const data = await fetchJson(`/api/lists?userId=${encodeURIComponent(userId)}`);
      return data.lists;
    },
    async () => {
      const store = readLocalStore();
      const user = ensureLocalUser(store, userId);
      writeLocalStore(store);
      return user.lists.map((list) => ({ ...list, count: (user.listItems[list.id] ?? []).length }));
    },
  );
}

export async function wrapperCreateList(userId, name) {
    return withWrapperBackend(
      async () => {
        const data = await fetchJson("/api/lists", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, name }),
        });
        return data.list;
      },
      async () => {
        const normalized = name.trim();
        if (!normalized) throw new Error("List name is required.");
        const store = readLocalStore();
        const user = ensureLocalUser(store, userId);
        const list = { id: `list-${Date.now()}`, name: normalized, system: false, createdAt: Date.now() };
        user.lists.push(list);
        writeLocalStore(store);
        return list;
      },
    );
  }

  export async function wrapperListItems(userId, listId) {
    return withWrapperBackend(
      async () => {
        const data = await fetchJson(`/api/lists/${encodeURIComponent(listId)}/items?userId=${encodeURIComponent(userId)}`);
        return data.items;
      },
      async () => {
        const store = readLocalStore();
        const user = ensureLocalUser(store, userId);
        writeLocalStore(store);
        return user.listItems[listId] ?? [];
      },
    );
  }

  export async function wrapperAddListItem(userId, listId, story) {
    return withWrapperBackend(
      async () => {
        const data = await fetchJson(`/api/lists/${encodeURIComponent(listId)}/items`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, story }),
        });
        return data.item;
      },
      async () => {
        const store = readLocalStore();
        const user = ensureLocalUser(store, userId);
        if (!user.listItems[listId]) user.listItems[listId] = [];
        const next = {
          id: String(story.id),
          title: story.title ?? "Untitled",
          url: story.url ?? null,
          by: story.by ?? "unknown",
          time: story.time ?? Math.floor(Date.now() / 1000),
          score: story.score ?? 0,
          descendants: story.descendants ?? 0,
        };
        user.listItems[listId] = [next, ...user.listItems[listId].filter((i) => String(i.id) !== String(story.id))];
        writeLocalStore(store);
        return next;
      },
    );
  }

  export async function wrapperRemoveListItem(userId, listId, storyId) {
    return withWrapperBackend(
      async () => {
        await fetchJson(`/api/lists/${encodeURIComponent(listId)}/items`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, storyId }),
        });
        return true;
      },
      async () => {
        const store = readLocalStore();
        const user = ensureLocalUser(store, userId);
        user.listItems[listId] = (user.listItems[listId] ?? []).filter((i) => String(i.id) !== String(storyId));
        writeLocalStore(store);
        return true;
      },
    );
  }

  export async function wrapperListPosts() {
    return withWrapperBackend(
      async () => {
        const data = await fetchJson("/api/posts");
        return data.posts;
      },
      async () => {
        const store = readLocalStore();
        return [...store.posts].sort((a, b) => b.createdAt - a.createdAt);
      },
    );
  }

  export async function wrapperCreatePost(userId, payload) {
    return withWrapperBackend(
      async () => {
        const data = await fetchJson("/api/posts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, ...payload }),
        });
        return data.post;
      },
      async () => {
        const title = String(payload?.title ?? "").trim();
        const url = String(payload?.url ?? "").trim();
        const text = String(payload?.text ?? "").trim();
        if (!title) throw new Error("Post title is required.");
        if (!url && !text) throw new Error("Provide a URL or post text.");
        const store = readLocalStore();
        const post = {
          id: `wrapper-post-${Date.now()}`,
          type: "wrapper-post",
          title,
          url: url || null,
          text: text || null,
          by: userId,
          score: 1,
          descendants: 0,
          time: Math.floor(Date.now() / 1000),
          createdAt: Date.now(),
        };
        store.posts.unshift(post);
        writeLocalStore(store);
        return post;
      },
    );
  }

  export async function wrapperListComments(storyId) {
    return withWrapperBackend(
      async () => {
        const data = await fetchJson(`/api/comments?storyId=${encodeURIComponent(storyId)}`);
        return data.comments;
      },
      async () => {
        const store = readLocalStore();
        return store.comments
          .filter((c) => String(c.storyId) === String(storyId))
          .sort((a, b) => b.createdAt - a.createdAt);
      },
    );
  }

  export async function wrapperCreateComment(userId, input) {
    return withWrapperBackend(
      async () => {
        const data = await fetchJson("/api/comments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, ...input }),
        });
        return data.comment;
      },
      async () => {
        const text = String(input?.text ?? "").trim();
        if (!text) throw new Error("Comment text is required.");
        const store = readLocalStore();
        const comment = {
          id: `wrapper-comment-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`,
          type: "wrapper-comment",
          storyId: String(input.storyId),
          parentId: input.parentId ? String(input.parentId) : null,
          text,
          by: userId,
          time: Math.floor(Date.now() / 1000),
          createdAt: Date.now(),
        };
        store.comments.unshift(comment);
        writeLocalStore(store);
        return comment;
      },
    );
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
