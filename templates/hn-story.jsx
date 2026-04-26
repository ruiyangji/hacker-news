
// ═══════════════════════════════════════════════════════════
//  HN Story Components
//  StoryCard, DetailPanel, CommentBlock, CommentComposer
// ═══════════════════════════════════════════════════════════

function hnTimeAgo(unix) {
  const s = Math.floor(Date.now() / 1000) - unix;
  if (s < 60)    return `${s}s ago`;
  if (s < 3600)  return `${Math.floor(s/60)}m ago`;
  if (s < 86400) return `${Math.floor(s/3600)}h ago`;
  return `${Math.floor(s/86400)}d ago`;
}
function hnDomain(url) {
  if (!url) return null;
  try { return new URL(url).hostname.replace('www.',''); } catch { return null; }
}

// ─── StoryCard ────────────────────────────────────────────
function StoryCard({
  story, index=0, selected=false,
  upvoted=false, bookmarked=false, readLater=false, hidden=false,
  onSelect, onUpvote, onBookmark, onReadLater, onHide,
  user, density='comfortable',
}) {
  const [hovered, setHovered] = React.useState(false);
  const [actionsVisible, setActionsVisible] = React.useState(false);
  const dm = hnDomain(story.url);
  const py = density === 'compact' ? 11 : density === 'spacious' ? 22 : 15;

  if (hidden) return null;

  return (
    <div
      onMouseEnter={() => { setHovered(true); setActionsVisible(true); }}
      onMouseLeave={() => { setHovered(false); setActionsVisible(false); }}
      style={{
        borderBottom: '1px solid var(--border-subtle)',
        background: selected ? 'var(--accent-light)' : hovered ? 'var(--bg-card-hover)' : 'transparent',
        transition: 'background 0.12s ease',
        opacity: 0,
        animation: `fadeSlideUp 0.35s ease forwards ${Math.min(index * 35, 500)}ms`,
        display: 'flex', gap: 12, alignItems: 'flex-start',
        padding: `${py}px 20px`,
      }}
    >
      {/* Upvote */}
      <div style={{ paddingTop: 2 }}>
        <HNScore
          score={story.score}
          upvoted={upvoted}
          onUpvote={() => user ? onUpvote(story.id) : showToast('Sign in to vote', 'info')}
          disabled={!user}
        />
      </div>

      {/* Main content */}
      <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => onSelect(story)}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 7, flexWrap: 'wrap', marginBottom: 5 }}>
          <span style={{
            fontFamily: 'Newsreader', fontSize: 'var(--story-font, 15px)',
            lineHeight: 1.45, fontWeight: 400, color: 'var(--text)', textWrap: 'pretty',
          }}>{story.title}</span>
          {dm && (
            <a href={story.url} target="_blank" rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              style={{
                fontSize: 11, color: 'var(--text-tertiary)',
                background: hovered ? 'var(--border)' : 'var(--border-subtle)',
                borderRadius: 4, padding: '1px 6px', whiteSpace: 'nowrap',
                flexShrink: 0, textDecoration: 'none', transition: 'background 0.12s',
              }}>{dm}</a>
          )}
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 12, color: 'var(--text-tertiary)', flexWrap: 'wrap' }}>
          <a href={`https://news.ycombinator.com/user?id=${story.by}`} target="_blank" rel="noopener noreferrer"
            onClick={e=>e.stopPropagation()} style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontWeight: 500 }}>
            {story.by}
          </a>
          <span>·</span>
          <span>{hnTimeAgo(story.time)}</span>
          <span>·</span>
          <span style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }} onClick={() => onSelect(story)}>
            <svg width="11" height="11" viewBox="0 0 14 14" fill="none"><path d="M7 1C3.69 1 1 3.69 1 7s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm.5 8.5h-1v-4h1v4zm0-5.5h-1V3h1v1z" fill="currentColor"/></svg>
            {story.descendants || 0} comments
          </span>
          {story.descendants > 10 && (
            <span style={{ color: 'var(--text-tertiary)' }}>{readingTime(story.descendants)}</span>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 4, alignItems: 'center', opacity: actionsVisible ? 1 : 0, transition: 'opacity 0.15s', flexShrink: 0 }}>
        <HNTooltip content={bookmarked ? 'Remove bookmark' : 'Bookmark'} position="top">
          <button onClick={() => onBookmark(story)} style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: '5px 6px', borderRadius: 7,
            color: bookmarked ? 'var(--accent-text)' : 'var(--text-tertiary)',
            fontSize: 14, lineHeight: 1, transition: 'color 0.12s',
          }}>🔖</button>
        </HNTooltip>
        <HNTooltip content={readLater ? 'Remove from queue' : 'Read later'} position="top">
          <button onClick={() => onReadLater(story)} style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: '5px 6px', borderRadius: 7,
            color: readLater ? 'var(--accent-text)' : 'var(--text-tertiary)',
            fontSize: 14, lineHeight: 1, transition: 'color 0.12s',
          }}>📖</button>
        </HNTooltip>
        <HNTooltip content="Hide story" position="top">
          <button onClick={() => onHide(story.id)} style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: '5px 6px', borderRadius: 7,
            color: 'var(--text-tertiary)', fontSize: 13, lineHeight: 1,
          }}>✕</button>
        </HNTooltip>
      </div>
    </div>
  );
}

// ─── CommentComposer ──────────────────────────────────────
function CommentComposer({ parentId, user, onSubmit, depth=0, placeholder='Write a comment…', autoFocus=false }) {
  const [text, setText] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [open, setOpen] = React.useState(depth === 0 || autoFocus);

  const submit = async () => {
    if (!text.trim()) return;
    setLoading(true);
    await new Promise(r => setTimeout(r, 500));
    setLoading(false);
    showToast('Comment posted (backend required to push to HN)', 'success');
    setText('');
    if (depth > 0) setOpen(false);
    onSubmit?.();
  };

  if (!user) return (
    <div style={{ padding: depth === 0 ? '14px 0' : '8px 0', fontSize: 12, color: 'var(--text-tertiary)' }}>
      <button onClick={() => showToast('Please sign in to comment', 'info')}
        style={{ background:'none', border:'none', cursor:'pointer', color:'var(--accent-text)', fontFamily:'DM Sans', fontSize:12, padding:0 }}>
        Sign in to comment
      </button>
    </div>
  );

  if (depth > 0 && !open) return (
    <button onClick={() => setOpen(true)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--accent-text)', fontFamily:'DM Sans', fontSize:12, padding:'6px 0' }}>
      ↩ Reply
    </button>
  );

  return (
    <div style={{ marginTop: depth === 0 ? 0 : 8, marginBottom: depth === 0 ? 0 : 4 }}>
      <HNTextarea value={text} onChange={e=>setText(e.target.value)} placeholder={placeholder} rows={depth === 0 ? 3 : 2} autoFocus={autoFocus} />
      <div style={{ display: 'flex', gap: 8, marginTop: 8, justifyContent: 'flex-end' }}>
        {depth > 0 && <HNButton variant="ghost" size="sm" onClick={() => setOpen(false)}>Cancel</HNButton>}
        <HNButton size="sm" onClick={submit} loading={loading} disabled={!text.trim()}>
          {depth > 0 ? 'Reply' : 'Post comment'}
        </HNButton>
      </div>
    </div>
  );
}

// ─── CommentBlock ─────────────────────────────────────────
function CommentBlock({ comment, depth=0, user, upvoted=false, onUpvote }) {
  const [collapsed, setCollapsed] = React.useState(false);
  const [showReply, setShowReply] = React.useState(false);
  const [childComments, setChildComments] = React.useState([]);
  const [loadedKids, setLoadedKids] = React.useState(false);

  React.useEffect(() => {
    if (!comment?.kids?.length) return;
    const ids = comment.kids.slice(0, 6);
    Promise.all(ids.map(id => fetch(`${HN_BASE}/item/${id}.json`).then(r=>r.json())))
      .then(data => { setChildComments(data.filter(c => c && !c.deleted && !c.dead)); setLoadedKids(true); });
  }, [comment?.id]);

  if (!comment || comment.deleted || comment.dead) return null;

  const hue = comment.by ? comment.by.split('').reduce((a,c) => a+c.charCodeAt(0),0) % 360 : 42;
  const depthColors = ['var(--border)','oklch(0.75 0.06 200)','oklch(0.75 0.06 150)','oklch(0.75 0.06 280)'];

  return (
    <div style={{ marginTop: 16, paddingLeft: depth > 0 ? 16 : 0, borderLeft: depth > 0 ? `2px solid ${depthColors[depth % depthColors.length]}` : 'none' }}>
      {/* Header */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: collapsed ? 0 : 8 }}>
        <HNAvatar username={comment.by} size="xs" />
        <a href={`https://news.ycombinator.com/user?id=${comment.by}`} target="_blank" rel="noopener noreferrer"
          style={{ fontSize: 12, fontWeight: 600, color: `oklch(0.45 0.08 ${hue})`, textDecoration: 'none' }}>
          {comment.by}
        </a>
        <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{hnTimeAgo(comment.time)}</span>
        <button onClick={() => setCollapsed(!collapsed)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--border)', fontSize: 11, padding: '2px 4px', borderRadius: 4 }}>
          {collapsed ? `[+${(comment.kids||[]).length}]` : '−'}
        </button>
      </div>

      {!collapsed && (
        <>
          <div
            style={{ fontSize: 13, lineHeight: 1.7, color: 'var(--text-secondary)', wordBreak: 'break-word' }}
            dangerouslySetInnerHTML={{ __html: comment.text || '' }}
          />
          {/* Comment actions */}
          <div style={{ display: 'flex', gap: 12, marginTop: 8, alignItems: 'center' }}>
            <button
              onClick={() => user ? onUpvote(comment.id) : showToast('Sign in to vote', 'info')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: upvoted ? 'var(--accent-text)' : 'var(--text-tertiary)', padding: '2px 0', fontFamily: 'DM Sans', display: 'flex', gap: 3, alignItems: 'center' }}>
              ▲ {upvoted ? 'Voted' : 'Vote'}
            </button>
            <button onClick={() => setShowReply(!showReply)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: 'var(--text-tertiary)', padding: '2px 0', fontFamily: 'DM Sans' }}>
              ↩ Reply
            </button>
          </div>
          {showReply && (
            <div style={{ marginTop: 10 }}>
              <CommentComposer parentId={comment.id} user={user} depth={1} autoFocus onSubmit={() => setShowReply(false)} />
            </div>
          )}
          {childComments.map(c => (
            <CommentBlock key={c.id} comment={c} depth={depth+1} user={user} upvoted={false} onUpvote={onUpvote} />
          ))}
          {comment.kids && comment.kids.length > 6 && loadedKids && (
            <div style={{ marginTop: 10, paddingLeft: 16, fontSize: 12, color: 'var(--text-tertiary)' }}>
              +{comment.kids.length - 6} more replies — <a href={`https://news.ycombinator.com/item?id=${comment.id}`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-text)', textDecoration: 'none' }}>view on HN</a>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── DetailPanel ─────────────────────────────────────────
function DetailPanel({ story, onClose, user, upvoted, onUpvote, bookmarked, onBookmark, readLater, onReadLater }) {
  const [comments, setComments] = React.useState([]);
  const [loadingComments, setLoadingComments] = React.useState(true);
  const [upvotedComments, setUpvotedComments] = React.useState(new Set());
  const dm = hnDomain(story.url);

  React.useEffect(() => {
    if (!story) return;
    setLoadingComments(true); setComments([]);
    const ids = (story.kids || []).slice(0, 25);
    Promise.all(ids.map(id => fetch(`${HN_BASE}/item/${id}.json`).then(r=>r.json())))
      .then(data => { setComments(data.filter(c => c && !c.deleted && !c.dead)); setLoadingComments(false); });
  }, [story?.id]);

  const toggleCommentVote = (id) => {
    setUpvotedComments(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <div style={{
      width: 'var(--panel-w, 520px)', minWidth: 0,
      borderLeft: '1px solid var(--border)',
      background: 'var(--bg-panel)',
      display: 'flex', flexDirection: 'column', height: '100%',
      animation: 'slideInRight 0.22s ease', overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
          <h2 style={{ fontFamily: 'Newsreader', fontSize: 18, fontWeight: 400, lineHeight: 1.4, color: 'var(--text)', textWrap: 'pretty', flex: 1 }}>
            {story.url ? (
              <a href={story.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', color: 'inherit' }}>{story.title}</a>
            ) : story.title}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', fontSize: 17, padding: '2px 5px', borderRadius: 6, lineHeight: 1, flexShrink: 0 }}>✕</button>
        </div>
        {dm && (
          <a href={story.url} target="_blank" rel="noopener noreferrer"
            style={{ fontSize: 12, color: 'var(--accent-text)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: 10 }}>
            <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M5 2H2a1 1 0 00-1 1v7a1 1 0 001 1h7a1 1 0 001-1V7M7 1h4m0 0v4m0-4L5 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            {dm}
          </a>
        )}

        {/* Meta row */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <HNScore score={story.score} upvoted={upvoted} onUpvote={() => user ? onUpvote(story.id) : showToast('Sign in to vote','info')} disabled={!user} />
          <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>·</span>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{story.by}</span>
          <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>·</span>
          <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{hnTimeAgo(story.time)}</span>
          <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>·</span>
          <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{story.descendants||0} comments</span>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
            <HNTooltip content={bookmarked ? 'Bookmarked' : 'Bookmark'}>
              <button onClick={() => onBookmark(story)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: bookmarked ? 'var(--accent-text)' : 'var(--text-tertiary)', padding: '3px 5px', borderRadius: 6 }}>🔖</button>
            </HNTooltip>
            <HNTooltip content={readLater ? 'In queue' : 'Read later'}>
              <button onClick={() => onReadLater(story)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: readLater ? 'var(--accent-text)' : 'var(--text-tertiary)', padding: '3px 5px', borderRadius: 6 }}>📖</button>
            </HNTooltip>
            <HNTooltip content="View on HN">
              <a href={`https://news.ycombinator.com/item?id=${story.id}`} target="_blank" rel="noopener noreferrer"
                style={{ color: 'var(--text-tertiary)', padding: '3px 5px', borderRadius: 6, fontSize: 13, display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M5 2H2a1 1 0 00-1 1v7a1 1 0 001 1h7a1 1 0 001-1V7M7 1h4m0 0v4m0-4L5 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </a>
            </HNTooltip>
          </div>
        </div>

        {story.text && (
          <div style={{ marginTop: 12, fontSize: 13, lineHeight: 1.7, color: 'var(--text-secondary)', borderTop: '1px solid var(--border-subtle)', paddingTop: 12 }}
            dangerouslySetInnerHTML={{ __html: story.text }} />
        )}
      </div>

      {/* Comments */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px 40px' }}>
        <CommentComposer parentId={story.id} user={user} depth={0} placeholder={`Reply to ${story.by}…`} />
        <HNDivider label={`${story.descendants||0} comments`} />
        {loadingComments ? (
          Array.from({length:5}).map((_,i) => (
            <div key={i} style={{ marginTop: 20 }}>
              <div className="skeleton" style={{ height: 11, width: '28%', marginBottom: 8 }} />
              <div className="skeleton" style={{ height: 11, width: '90%', marginBottom: 5 }} />
              <div className="skeleton" style={{ height: 11, width: '75%' }} />
            </div>
          ))
        ) : comments.length === 0 ? (
          <HNEmptyState icon="💬" title="No comments yet" description="Be the first to start the discussion." />
        ) : (
          comments.map(c => (
            <CommentBlock key={c.id} comment={c} depth={0} user={user}
              upvoted={upvotedComments.has(c.id)} onUpvote={toggleCommentVote} />
          ))
        )}
      </div>
    </div>
  );
}

Object.assign(window, { StoryCard, DetailPanel, CommentBlock, CommentComposer, hnTimeAgo, hnDomain });
