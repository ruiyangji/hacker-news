"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  FEEDS,
  PER_PAGE,
  resolveUserId,
  fetchJson,
  fetchFeedIds,
  fetchItem,
  fetchItemsInChunks,
  domainOf,
} from "./lib/hn-api";
import { fieldStyle, secondaryButtonStyle } from "./components/styles";
import Sidebar from "./components/Sidebar";
import StoryRow from "./components/StoryRow";
import SubmitModal from "./components/SubmitModal";
import DetailPanel from "./components/DetailPanel";

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
    const data = await fetchJson(`/api/lists?userId=${encodeURIComponent(id)}`);
    setLists(data.lists);
    return data.lists;
  }

  async function refreshListItems(id, listId) {
    const data = await fetchJson(`/api/lists/${encodeURIComponent(listId)}/items?userId=${encodeURIComponent(id)}`);
    setListItems((prev) => ({ ...prev, [listId]: data.items }));
    return data.items;
  }

  async function refreshPosts() {
    const data = await fetchJson("/api/posts");
    setWrapperPosts(data.posts);
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
    await fetchJson(`/api/lists/${encodeURIComponent(listId)}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, story }),
    });
    await refreshLists(userId);
    await refreshListItems(userId, listId);
  }

  async function removeFromList(listId, storyId) {
    await fetchJson(`/api/lists/${encodeURIComponent(listId)}/items`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, storyId }),
    });
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
    await fetchJson("/api/lists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, name }),
    });
    setNewListName("");
    await refreshLists(userId);
  }

  async function createPost(payload) {
    await fetchJson("/api/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, ...payload }),
    });
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
