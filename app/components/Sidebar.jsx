"use client";

import { FEEDS } from "../lib/hn-api";

export default function Sidebar({
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
