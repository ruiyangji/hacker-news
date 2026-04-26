"use client";

import { useState } from "react";
import { fieldStyle, secondaryButtonStyle, primaryButtonStyle } from "./styles";

export default function SubmitModal({ open, onClose, onSubmit }) {
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
