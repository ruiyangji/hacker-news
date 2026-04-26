"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const HN_BASE = "https://hacker-news.firebaseio.com/v0";
const PER_PAGE = 30;
const FEEDS = [
  { id: "top", label: "Top Stories", icon: "▲", desc: "Best of today" },
  { id: "new", label: "New", icon: "◆", desc: "Latest submissions" },
  { id: "best", label: "Best", icon: "★", desc: "All-time best" },
  { id: "ask", label: "Ask HN", icon: "?", desc: "Questions & discussions" },
  { id: "show", label: "Show HN", icon: "◎", desc: "What people built" },
  { id: "job", label: "Jobs", icon: "◈", desc: "Hiring & opportunities" },
];

const TTL = {
  feedIds: 5 * 60 * 1000,
  item: 10 * 60 * 1000,
};
const LOCAL_STORE_KEY = "hn-wrapper-static-store-v1";
const BASE_LISTS = [
  { id: "bookmarks", name: "Bookmarks", system: true },
  { id: "read-later", name: "Read Later", system: true },
];
let wrapperBackendMode = "unknown";

function cacheGet(key, maxAgeMs) {
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

function cacheSet(key, data) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify({ ts: Date.now(), data }));
  } catch {}
}

function resolveUserId() {
  if (typeof window === "undefined") return "guest";
  const current = localStorage.getItem("hn-wrapper-user");
  if (current) return current;
  const id = `user-${Math.random().toString(36).slice(2, 10)}`;
  localStorage.setItem("hn-wrapper-user", id);
  return id;
}

async function fetchJson(url, init) {
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

async function fetchHNJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json();
}

async function fetchFeedIds(feed) {
  const key = `hn-cache:feed:${feed}:ids`;
  const cached = cacheGet(key, TTL.feedIds);
  if (cached) return cached;
  const ids = await fetchHNJson(`${HN_BASE}/${feed}stories.json`);
  cacheSet(key, ids ?? []);
  return ids ?? [];
}

async function fetchItem(id) {
  const key = `hn-cache:item:${id}`;
  const cached = cacheGet(key, TTL.item);
  if (cached) return cached;
  const item = await fetchHNJson(`${HN_BASE}/item/${id}.json`);
  cacheSet(key, item);
  return item;
}

async function fetchItemsInChunks(ids, chunkSize = 40) {
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

async function wrapperListLists(userId) {
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

async function wrapperCreateList(userId, name) {
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

async function wrapperListItems(userId, listId) {
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

async function wrapperAddListItem(userId, listId, story) {
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

async function wrapperRemoveListItem(userId, listId, storyId) {
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

async function wrapperListPosts() {
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

async function wrapperCreatePost(userId, payload) {
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

async function wrapperListComments(storyId) {
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

async function wrapperCreateComment(userId, input) {
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
        id: `wrapper-comment-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
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

function domainOf(url) {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return null;
  }
}

function timeAgo(unix) {
  const s = Math.max(1, Math.floor(Date.now() / 1000) - Number(unix || 0));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function Sidebar({
  feed,
  setFeed,
  lists,
  activeListId,
  onSelectList,
  newListName,
  setNewListName,
  onCreateList,
}) {
  return (
    <nav
      style={{
        width: "var(--sidebar-w)",
        flexShrink: 0,
        background: "var(--bg-sidebar)",
        borderRight: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <div style={{ padding: "18px 16px 14px", borderBottom: "1px solid var(--border)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <div
            style={{
              width: 26,
              height: 26,
              background: "var(--accent)",
              borderRadius: 6,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 13,
              fontWeight: 700,
              color: "white",
              fontFamily: "DM Mono",
            }}
          >
            Y
          </div>
          <span style={{ fontFamily: "Newsreader", fontSize: 17, fontWeight: 400 }}>
            Hacker News
          </span>
        </div>
      </div>

      <div style={{ padding: "10px 8px", flex: 1, overflowY: "auto" }}>
        <div
          style={{
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: "0.09em",
            textTransform: "uppercase",
            color: "var(--text-tertiary)",
            padding: "4px 10px 6px",
          }}
        >
          Feeds
        </div>
        {FEEDS.map((f) => (
          <button
            key={f.id}
            onClick={() => {
              onSelectList(null);
              setFeed(f.id);
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 9,
              width: "100%",
              padding: "8px 10px",
              borderRadius: 8,
              border: "none",
              cursor: "pointer",
              background: !activeListId && feed === f.id ? "var(--accent-light)" : "transparent",
              color: !activeListId && feed === f.id ? "var(--accent-text)" : "var(--text-secondary)",
              fontSize: 13,
              fontWeight: !activeListId && feed === f.id ? 600 : 400,
              textAlign: "left",
              marginBottom: 1,
            }}
          >
            <span style={{ fontFamily: "DM Mono", fontSize: 10, width: 14, textAlign: "center" }}>
              {f.icon}
            </span>
            {f.label}
          </button>
        ))}

        <div
          style={{
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: "0.09em",
            textTransform: "uppercase",
            color: "var(--text-tertiary)",
            padding: "14px 10px 6px",
          }}
        >
          My Lists
        </div>

        {lists.map((list) => (
          <button
            key={list.id}
            onClick={() => onSelectList(list.id)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              width: "100%",
              border: "none",
              borderRadius: 8,
              padding: "8px 10px",
              cursor: "pointer",
              textAlign: "left",
              background: activeListId === list.id ? "var(--accent-light)" : "transparent",
              color: activeListId === list.id ? "var(--accent-text)" : "var(--text-secondary)",
            }}
          >
            <span style={{ flex: 1, fontSize: 13 }}>{list.name}</span>
            <span
              style={{
                fontSize: 11,
                padding: "2px 7px",
                borderRadius: 99,
                background: "var(--border-subtle)",
                color: "var(--text-secondary)",
              }}
            >
              {list.count}
            </span>
          </button>
        ))}

        <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6, padding: "0 10px" }}>
          <input
            value={newListName}
            onChange={(e) => setNewListName(e.target.value)}
            placeholder="Create new list..."
            style={{
              width: "100%",
              padding: "7px 8px",
              fontSize: 12,
              borderRadius: 7,
              border: "1px solid var(--border)",
              background: "var(--bg)",
            }}
          />
          <button
            onClick={onCreateList}
            style={{
              border: "1px solid var(--border)",
              borderRadius: 7,
              background: "var(--bg-card-hover)",
              fontSize: 12,
              padding: "7px 8px",
              cursor: "pointer",
            }}
          >
            Add List
          </button>
        </div>
      </div>
    </nav>
  );
}

function StoryRow({ story, selected, isBookmarked, isReadLater, onSelect, onToggleBookmark, onToggleReadLater }) {
  const dm = domainOf(story.url);
  return (
    <button
      onClick={() => onSelect(story)}
      style={{
        width: "100%",
        textAlign: "left",
        border: "none",
        borderBottom: "1px solid var(--border-subtle)",
        background: selected ? "var(--accent-light)" : "transparent",
        cursor: "pointer",
        padding: "14px 20px",
        display: "flex",
        gap: 12,
      }}
    >
      <div style={{ minWidth: 36, textAlign: "center", color: "var(--text-tertiary)" }}>
        <div style={{ fontSize: 12, marginBottom: 4 }}>▲</div>
        <div style={{ fontFamily: "DM Mono", fontSize: 13, fontWeight: 600 }}>{story.score ?? 0}</div>
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontFamily: "Newsreader", fontSize: 16, lineHeight: 1.4, marginBottom: 5 }}>
          {story.title}
        </div>
        <div
          style={{
            fontSize: 12,
            color: "var(--text-tertiary)",
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
            alignItems: "center",
          }}
        >
          <span style={{ color: "var(--text-secondary)", fontWeight: 500 }}>{story.by}</span>
          <span>·</span>
          <span>{timeAgo(story.time)}</span>
          <span>·</span>
          <span>{story.descendants ?? 0} comments</span>
          {dm && (
            <>
              <span>·</span>
              <span>{dm}</span>
            </>
          )}
        </div>
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleBookmark(story);
          }}
          style={{
            border: "none",
            background: "none",
            cursor: "pointer",
            fontSize: 16,
            color: isBookmarked ? "var(--accent-text)" : "var(--text-tertiary)",
          }}
          title="Bookmark"
        >
          🔖
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleReadLater(story);
          }}
          style={{
            border: "none",
            background: "none",
            cursor: "pointer",
            fontSize: 16,
            color: isReadLater ? "var(--accent-text)" : "var(--text-tertiary)",
          }}
          title="Read later"
        >
          📖
        </button>
      </div>
    </button>
  );
}

function SubmitModal({ open, onClose, onSubmit }) {
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  async function submit() {
    setLoading(true);
    setError("");
    try {
      await onSubmit({ title, url, text });
      setTitle("");
      setUrl("");
      setText("");
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{
        position: "fixed",
        inset: 0,
        background: "oklch(0 0 0 / 0.35)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
    >
      <div
        style={{
          width: "min(680px, calc(100vw - 40px))",
          background: "var(--bg)",
          border: "1px solid var(--border)",
          borderRadius: 14,
          overflow: "hidden",
        }}
      >
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border-subtle)", fontFamily: "Newsreader", fontSize: 20 }}>
          Submit to Wrapper
        </div>
        <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 10 }}>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" style={fieldStyle} />
          <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="URL (optional)" style={fieldStyle} />
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Text (optional if URL provided)"
            rows={6}
            style={{ ...fieldStyle, resize: "vertical" }}
          />
          {error ? <div style={{ fontSize: 12, color: "oklch(0.52 0.16 20)" }}>{error}</div> : null}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <button onClick={onClose} style={secondaryButtonStyle}>
              Cancel
            </button>
            <button onClick={submit} disabled={loading} style={primaryButtonStyle}>
              {loading ? "Submitting..." : "Submit"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const depthColors = ["var(--border)", "oklch(0.75 0.06 200)", "oklch(0.75 0.06 150)", "oklch(0.75 0.06 280)"];

function WrapperCommentNode({ comment, depth = 0, childrenByParent, onReply }) {
  const [showReply, setShowReply] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [replyError, setReplyError] = useState("");
  const [replying, setReplying] = useState(false);
  const children = childrenByParent.get(String(comment.id)) ?? [];

  async function submitReply() {
    if (!replyText.trim()) {
      setReplyError("Reply text is required.");
      return;
    }
    setReplyError("");
    setReplying(true);
    try {
      await onReply(String(comment.id), replyText);
      setReplyText("");
      setShowReply(false);
    } catch (e) {
      setReplyError(e.message);
    } finally {
      setReplying(false);
    }
  }

  return (
    <article
      style={{
        marginTop: 14,
        paddingLeft: depth > 0 ? 14 : 0,
        borderLeft: depth > 0 ? `2px solid ${depthColors[depth % depthColors.length]}` : "none",
      }}
    >
      <div style={{ display: "flex", gap: 8, color: "var(--text-tertiary)", fontSize: 11, marginBottom: 7 }}>
        <span style={{ color: "var(--text-secondary)", fontWeight: 500 }}>{comment.by}</span>
        <span>·</span>
        <span>{timeAgo(comment.time)}</span>
        <span style={{ marginLeft: "auto" }}>Wrapper</span>
      </div>
      <div style={{ lineHeight: 1.6, color: "var(--text-secondary)", whiteSpace: "pre-wrap" }}>{comment.text}</div>
      <button
        onClick={() => setShowReply((v) => !v)}
        style={{ border: "none", background: "none", color: "var(--text-tertiary)", fontSize: 11, padding: "4px 0", cursor: "pointer" }}
      >
        ↩ Reply
      </button>

      {showReply ? (
        <div style={{ marginTop: 6 }}>
          <textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            rows={3}
            style={{ ...fieldStyle, resize: "vertical", fontSize: 12 }}
            placeholder={`Reply to ${comment.by}...`}
          />
          {replyError ? <div style={{ fontSize: 12, color: "oklch(0.52 0.16 20)", marginTop: 4 }}>{replyError}</div> : null}
          <div style={{ marginTop: 6, display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button onClick={() => setShowReply(false)} style={secondaryButtonStyle}>
              Cancel
            </button>
            <button onClick={submitReply} disabled={replying} style={primaryButtonStyle}>
              {replying ? "Posting..." : "Post Reply"}
            </button>
          </div>
        </div>
      ) : null}

      {children.map((child) => (
        <WrapperCommentNode key={child.id} comment={child} depth={depth + 1} childrenByParent={childrenByParent} onReply={onReply} />
      ))}
    </article>
  );
}

function HNCommentNode({ comment, depth = 0 }) {
  const [collapsed, setCollapsed] = useState(false);
  const [children, setChildren] = useState([]);
  const [loadedKids, setLoadedKids] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!comment?.kids?.length) return;
      const ids = comment.kids.slice(0, 6);
      const data = await Promise.all(ids.map((id) => fetchItem(id)));
      if (!cancelled) {
        setChildren(data.filter((c) => c && !c.deleted && !c.dead));
        setLoadedKids(true);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [comment?.id]);

  if (!comment || comment.deleted || comment.dead) return null;

  return (
    <article
      style={{
        marginTop: 14,
        paddingLeft: depth > 0 ? 14 : 0,
        borderLeft: depth > 0 ? `2px solid ${depthColors[depth % depthColors.length]}` : "none",
      }}
    >
      <div style={{ display: "flex", gap: 8, color: "var(--text-tertiary)", fontSize: 11, marginBottom: collapsed ? 0 : 7 }}>
        <span style={{ color: "var(--text-secondary)", fontWeight: 500 }}>{comment.by}</span>
        <span>·</span>
        <span>{timeAgo(comment.time)}</span>
        <span style={{ marginLeft: "auto" }}>HN</span>
        <button
          onClick={() => setCollapsed((v) => !v)}
          style={{ border: "none", background: "none", color: "var(--text-tertiary)", fontSize: 11, cursor: "pointer", padding: 0 }}
        >
          {collapsed ? `[+${(comment.kids || []).length}]` : "−"}
        </button>
      </div>

      {!collapsed ? (
        <>
          <div style={{ lineHeight: 1.6, color: "var(--text-secondary)" }} dangerouslySetInnerHTML={{ __html: comment.text || "" }} />
          {children.map((child) => (
            <HNCommentNode key={child.id} comment={child} depth={depth + 1} />
          ))}
          {comment.kids && comment.kids.length > 6 && loadedKids ? (
            <div style={{ marginTop: 8, fontSize: 12, color: "var(--text-tertiary)" }}>
              +{comment.kids.length - 6} more replies on HN
            </div>
          ) : null}
        </>
      ) : null}
    </article>
  );
}

function DetailPanel({ story, onClose, userId, lists, onAddToList, onToggleBookmark, onToggleReadLater, isBookmarked, isReadLater }) {
  const [hnComments, setHnComments] = useState([]);
  const [wrapperComments, setWrapperComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState("");
  const [commentError, setCommentError] = useState("");
  const [targetListId, setTargetListId] = useState(lists[0]?.id ?? "bookmarks");
  const dm = domainOf(story?.url);

  useEffect(() => {
    if (!lists.some((list) => list.id === targetListId)) {
      setTargetListId(lists[0]?.id ?? "bookmarks");
    }
  }, [lists, targetListId]);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!story) return;
      setLoading(true);
      try {
        const localPromise = wrapperListComments(story.id);
        const hnPromise = (async () => {
          if (!Array.isArray(story.kids) || story.kids.length === 0) return [];
          const ids = story.kids.slice(0, 25);
          const raw = await Promise.all(ids.map((id) => fetchItem(id)));
          return raw.filter((item) => item && !item.dead && !item.deleted);
        })();
        const [local, hn] = await Promise.all([localPromise, hnPromise]);
        if (!cancelled) {
          setWrapperComments(local);
          setHnComments(hn);
        }
      } catch {
        if (!cancelled) {
          setWrapperComments([]);
          setHnComments([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [story?.id]);

  if (!story) return null;

  const wrapperTree = useMemo(() => {
    const byId = new Map();
    for (const comment of wrapperComments) byId.set(String(comment.id), comment);
    const tree = new Map();
    for (const comment of wrapperComments) {
      const parentKey =
        comment.parentId && byId.has(String(comment.parentId))
          ? String(comment.parentId)
          : "root";
      if (!tree.has(parentKey)) tree.set(parentKey, []);
      tree.get(parentKey).push(comment);
    }
    for (const [key, comments] of tree.entries()) {
      tree.set(
        key,
        comments.sort((a, b) => a.createdAt - b.createdAt),
      );
    }
    return tree;
  }, [wrapperComments]);

  async function submitComment(parentId = null, textOverride = null) {
    const text = (textOverride ?? commentText).trim();
    if (!text) {
      throw new Error("Comment text is required.");
    }
    if (!parentId) setCommentError("");
    try {
      await wrapperCreateComment(userId, {
        storyId: String(story.id),
        parentId,
        text,
      });
      if (!parentId) setCommentText("");
      const refreshed = await wrapperListComments(story.id);
      setWrapperComments(refreshed);
    } catch (e) {
      if (!parentId) setCommentError(e.message);
      throw e;
    }
  }

  return (
    <aside
      style={{
        width: 540,
        borderLeft: "1px solid var(--border)",
        background: "var(--bg-panel)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <div style={{ padding: "18px 20px 14px", borderBottom: "1px solid var(--border)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
          <h2 style={{ fontFamily: "Newsreader", fontSize: 19, fontWeight: 400, lineHeight: 1.35 }}>
            {story.url ? (
              <a href={story.url} target="_blank" rel="noreferrer">
                {story.title}
              </a>
            ) : (
              story.title
            )}
          </h2>
          <button onClick={onClose} style={{ border: "none", background: "none", fontSize: 18, color: "var(--text-tertiary)", cursor: "pointer" }}>
            ✕
          </button>
        </div>
        <div style={{ marginTop: 10, fontSize: 12, color: "var(--text-tertiary)", display: "flex", gap: 8, flexWrap: "wrap" }}>
          <span>{story.score ?? 0} points</span>
          <span>·</span>
          <span>{story.by}</span>
          <span>·</span>
          <span>{timeAgo(story.time)}</span>
          {dm && (
            <>
              <span>·</span>
              <span>{dm}</span>
            </>
          )}
        </div>
        {story.text ? (
          <div style={{ marginTop: 12, fontSize: 13, lineHeight: 1.6, color: "var(--text-secondary)" }} dangerouslySetInnerHTML={{ __html: story.text }} />
        ) : null}
        <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
          <button onClick={() => onToggleBookmark(story)} style={secondaryButtonStyle}>
            {isBookmarked ? "Remove Bookmark" : "Bookmark"}
          </button>
          <button onClick={() => onToggleReadLater(story)} style={secondaryButtonStyle}>
            {isReadLater ? "Remove Read Later" : "Read Later"}
          </button>
        </div>
        <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
          <select value={targetListId} onChange={(e) => setTargetListId(e.target.value)} style={{ ...fieldStyle, padding: "7px 8px", fontSize: 12 }}>
            {lists.map((list) => (
              <option key={list.id} value={list.id}>
                {list.name}
              </option>
            ))}
          </select>
          <button onClick={() => onAddToList(targetListId, story)} style={secondaryButtonStyle}>
            Add to List
          </button>
        </div>
      </div>

      <div style={{ overflowY: "auto", padding: "14px 20px 28px" }}>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.09em", textTransform: "uppercase", color: "var(--text-tertiary)", marginBottom: 10 }}>
          Comment in Wrapper
        </div>
        <textarea value={commentText} onChange={(e) => setCommentText(e.target.value)} rows={4} style={{ ...fieldStyle, resize: "vertical" }} placeholder="Add a comment..." />
        {commentError ? <div style={{ fontSize: 12, color: "oklch(0.52 0.16 20)", marginTop: 6 }}>{commentError}</div> : null}
        <div style={{ marginTop: 8, display: "flex", justifyContent: "flex-end" }}>
          <button
            onClick={() => {
              submitComment().catch(() => {});
            }}
            style={primaryButtonStyle}
          >
            Post Comment
          </button>
        </div>

        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.09em", textTransform: "uppercase", color: "var(--text-tertiary)", marginTop: 18 }}>
          Comments
        </div>
        {loading ? (
          <div style={{ marginTop: 10, fontSize: 13, color: "var(--text-tertiary)" }}>Loading comments...</div>
        ) : (
          <>
            {(wrapperTree.get("root") ?? []).map((comment) => (
              <WrapperCommentNode key={comment.id} comment={comment} childrenByParent={wrapperTree} onReply={submitComment} />
            ))}
            {hnComments.map((comment) => (
              <HNCommentNode key={comment.id} comment={comment} />
            ))}
            {wrapperComments.length === 0 && hnComments.length === 0 ? (
              <div style={{ marginTop: 10, fontSize: 13, color: "var(--text-tertiary)" }}>No comments yet.</div>
            ) : null}
          </>
        )}
      </div>
    </aside>
  );
}

const fieldStyle = {
  width: "100%",
  padding: "8px 10px",
  fontSize: 13,
  border: "1px solid var(--border)",
  borderRadius: 9,
  background: "var(--bg)",
  color: "var(--text)",
  outline: "none",
};

const secondaryButtonStyle = {
  border: "1px solid var(--border)",
  background: "var(--bg-card-hover)",
  borderRadius: 8,
  padding: "7px 12px",
  fontSize: 12,
  cursor: "pointer",
};

const primaryButtonStyle = {
  border: "none",
  background: "var(--accent)",
  color: "white",
  borderRadius: 8,
  padding: "7px 12px",
  fontSize: 12,
  cursor: "pointer",
};

export default function Page() {
  const [userId, setUserId] = useState("guest");
  const [feed, setFeed] = useState("top");
  const [allIds, setAllIds] = useState([]);
  const [stories, setStories] = useState([]);
  const [wrapperPosts, setWrapperPosts] = useState([]);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [query, setQuery] = useState("");
  const [activeListId, setActiveListId] = useState(null);
  const [lists, setLists] = useState([]);
  const [listItems, setListItems] = useState({});
  const [newListName, setNewListName] = useState("");
  const [showSubmit, setShowSubmit] = useState(false);
  const [fullFeedStoriesByFeed, setFullFeedStoriesByFeed] = useState({});
  const [searchLoading, setSearchLoading] = useState(false);
  const listViewportRef = useRef(null);
  const loadMoreSentinelRef = useRef(null);

  useEffect(() => {
    setUserId(resolveUserId());
  }, []);

  async function refreshLists(id) {
    const nextLists = await wrapperListLists(id);
    setLists(nextLists);
    return nextLists;
  }

  async function refreshListItems(id, listId) {
    const items = await wrapperListItems(id, listId);
    setListItems((prev) => ({ ...prev, [listId]: items }));
    return items;
  }

  async function refreshPosts() {
    const posts = await wrapperListPosts();
    setWrapperPosts(posts);
  }

  useEffect(() => {
    if (userId === "guest") return;
    refreshLists(userId).then(async (serverLists) => {
      const baseline = serverLists.filter((list) => list.id === "bookmarks" || list.id === "read-later");
      await Promise.all(baseline.map((list) => refreshListItems(userId, list.id)));
    });
    refreshPosts();
  }, [userId]);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (activeListId) return;
      setLoading(true);
      setSelected(null);
      setPage(0);
      const ids = await fetchFeedIds(feed);
      if (!cancelled) setAllIds(ids);
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [feed, activeListId]);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (activeListId) {
        setLoading(true);
        await refreshListItems(userId, activeListId);
        if (!cancelled) setLoading(false);
        return;
      }
      if (allIds.length === 0) {
        setStories([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      const slice = allIds.slice(page * PER_PAGE, (page + 1) * PER_PAGE);
      const results = await Promise.all(slice.map((id) => fetchItem(id)));
      if (!cancelled) {
        const rows = results.filter(Boolean);
        setStories((prev) => (page === 0 ? rows : [...prev, ...rows]));
        setLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [allIds, page, activeListId, userId]);

  const fullFeedStories = fullFeedStoriesByFeed[feed] || null;

  useEffect(() => {
    if (activeListId || !query.trim() || !allIds.length || fullFeedStories) {
      setSearchLoading(false);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      setSearchLoading(true);
      const rows = await fetchItemsInChunks(allIds);
      if (!cancelled) {
        setFullFeedStoriesByFeed((prev) => ({ ...prev, [feed]: rows }));
        setSearchLoading(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [activeListId, query, allIds, fullFeedStories, feed]);

  useEffect(() => {
    if (activeListId || query.trim()) return;
    const root = listViewportRef.current;
    const target = loadMoreSentinelRef.current;
    if (!root || !target) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const hit = entries[0];
        if (hit.isIntersecting && !loading && allIds.length > (page + 1) * PER_PAGE) {
          setPage((p) => p + 1);
        }
      },
      { root, rootMargin: "280px 0px" },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [activeListId, query, loading, allIds.length, page]);

  const bookmarkIds = useMemo(() => new Set((listItems.bookmarks || []).map((item) => String(item.id))), [listItems.bookmarks]);
  const readLaterIds = useMemo(
    () => new Set((listItems["read-later"] || []).map((item) => String(item.id))),
    [listItems["read-later"]],
  );

  const pagedFeedStories = useMemo(() => {
    if (feed !== "top") return stories;
    return [...wrapperPosts, ...stories];
  }, [feed, stories, wrapperPosts]);

  const searchFeedStories = useMemo(() => {
    const baseStories = fullFeedStories || stories;
    if (feed !== "top") return baseStories;
    return [...wrapperPosts, ...baseStories];
  }, [feed, stories, wrapperPosts, fullFeedStories]);

  const sourceStories = useMemo(() => {
    if (activeListId) return listItems[activeListId] || [];
    return pagedFeedStories;
  }, [activeListId, pagedFeedStories, listItems]);

  const visibleStories = useMemo(() => {
    const q = query.trim().toLowerCase();
    const pool = q && !activeListId ? searchFeedStories : sourceStories;
    if (!q) return pool;
    return pool.filter((story) => {
      const text = `${story.title || ""} ${story.by || ""} ${domainOf(story.url) || ""}`.toLowerCase();
      return text.includes(q);
    });
  }, [query, sourceStories, searchFeedStories, activeListId]);

  const currentFeed = FEEDS.find((f) => f.id === feed);
  const activeList = lists.find((list) => list.id === activeListId);

  async function addToList(listId, story) {
    await wrapperAddListItem(userId, listId, story);
    await refreshLists(userId);
    await refreshListItems(userId, listId);
  }

  async function removeFromList(listId, storyId) {
    await wrapperRemoveListItem(userId, listId, storyId);
    await refreshLists(userId);
    await refreshListItems(userId, listId);
  }

  async function toggleBookmark(story) {
    if (bookmarkIds.has(String(story.id))) await removeFromList("bookmarks", story.id);
    else await addToList("bookmarks", story);
  }

  async function toggleReadLater(story) {
    if (readLaterIds.has(String(story.id))) await removeFromList("read-later", story.id);
    else await addToList("read-later", story);
  }

  async function createList() {
    const name = newListName.trim();
    if (!name) return;
    await wrapperCreateList(userId, name);
    setNewListName("");
    await refreshLists(userId);
  }

  async function createPost(payload) {
    await wrapperCreatePost(userId, payload);
    await refreshPosts();
  }

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      <Sidebar
        feed={feed}
        setFeed={setFeed}
        lists={lists}
        activeListId={activeListId}
        onSelectList={setActiveListId}
        newListName={newListName}
        setNewListName={setNewListName}
        onCreateList={createList}
      />

      <main style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ padding: "12px 20px", borderBottom: "1px solid var(--border)", display: "flex", gap: 12, alignItems: "center" }}>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search all stories..." style={fieldStyle} />
          <button onClick={() => setShowSubmit(true)} style={secondaryButtonStyle}>
            Submit
          </button>
        </div>

        <div style={{ padding: "10px 20px 8px", borderBottom: "1px solid var(--border-subtle)", display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontFamily: "Newsreader", fontSize: 16 }}>{activeList ? activeList.name : currentFeed?.label}</span>
          <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>{activeList ? "Your wrapper list" : currentFeed?.desc}</span>
          <span style={{ fontSize: 11, padding: "2px 7px", borderRadius: 99, background: "var(--border-subtle)", color: "var(--text-secondary)" }}>
            {sourceStories.length}
          </span>
        </div>

        <div ref={listViewportRef} style={{ overflowY: "auto", flex: 1 }}>
          {loading && sourceStories.length === 0 ? (
            <div style={{ padding: 20, fontSize: 13, color: "var(--text-tertiary)" }}>Loading stories...</div>
          ) : visibleStories.length === 0 ? (
            <div style={{ padding: 20, fontSize: 13, color: "var(--text-tertiary)" }}>No stories found.</div>
          ) : (
            visibleStories.map((story) => (
              <StoryRow
                key={story.id}
                story={story}
                selected={selected?.id === story.id}
                isBookmarked={bookmarkIds.has(String(story.id))}
                isReadLater={readLaterIds.has(String(story.id))}
                onSelect={setSelected}
                onToggleBookmark={toggleBookmark}
                onToggleReadLater={toggleReadLater}
              />
            ))
          )}

          {query && !activeListId && searchLoading ? (
            <div style={{ padding: "14px 24px", textAlign: "center", fontSize: 12, color: "var(--text-tertiary)" }}>
              Searching full feed...
            </div>
          ) : null}

          {!activeListId && !query && allIds.length > (page + 1) * PER_PAGE && (
            <div ref={loadMoreSentinelRef} style={{ padding: "20px 24px 40px", textAlign: "center", fontSize: 12, color: "var(--text-tertiary)" }}>
              {loading ? "Loading..." : "Scroll for more"}
            </div>
          )}
        </div>
      </main>

      {selected && (
        <DetailPanel
          story={selected}
          onClose={() => setSelected(null)}
          userId={userId}
          lists={lists}
          onAddToList={addToList}
          onToggleBookmark={toggleBookmark}
          onToggleReadLater={toggleReadLater}
          isBookmarked={bookmarkIds.has(String(selected.id))}
          isReadLater={readLaterIds.has(String(selected.id))}
        />
      )}

      <SubmitModal open={showSubmit} onClose={() => setShowSubmit(false)} onSubmit={createPost} />
    </div>
  );
}
