"use client";

import { useState } from "react";
import { timeAgo } from "../lib/hn-api";
import { depthColors, fieldStyle, secondaryButtonStyle, primaryButtonStyle } from "./styles";

export default function WrapperCommentNode({ comment, depth = 0, childrenByParent, onReply }) {
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
