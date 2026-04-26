"use client";

import { useState, useEffect } from "react";
import { fetchItem, timeAgo } from "../lib/hn-api";
import { depthColors } from "./styles";

export default function HNCommentNode({ comment, depth = 0 }) {
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
