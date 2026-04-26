"use client";

import { domainOf, timeAgo } from "../lib/hn-api";

export default function StoryRow({ story, selected, isBookmarked, isReadLater, onSelect, onToggleBookmark, onToggleReadLater }) {
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
