"use client";

import { useState, useEffect, useMemo } from "react";
import { fetchJson, fetchItem, domainOf, timeAgo } from "../lib/hn-api";
import { fieldStyle, secondaryButtonStyle, primaryButtonStyle } from "./styles";
import WrapperCommentNode from "./WrapperCommentNode";
import HNCommentNode from "./HNCommentNode";

export default function DetailPanel({ story, onClose, userId, lists, onAddToList, onToggleBookmark, onToggleReadLater, isBookmarked, isReadLater }) {
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
      const localPromise = fetchJson(`/api/comments?storyId=${encodeURIComponent(story.id)}`).then((d) => d.comments);
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
        setLoading(false);
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
      await fetchJson("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          storyId: String(story.id),
          parentId,
          text,
        }),
      });
      if (!parentId) setCommentText("");
      const refreshed = await fetchJson(`/api/comments?storyId=${encodeURIComponent(story.id)}`);
      setWrapperComments(refreshed.comments);
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
