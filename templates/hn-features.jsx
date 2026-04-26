
// ═══════════════════════════════════════════════════════════
//  HN Features — Auth, Search, Modals, Panels
//  LoginModal, SubmitModal, UserProfileModal,
//  SearchBar, BookmarksPanel, ReadLaterPanel,
//  KeyboardShortcutsModal, SettingsModal
// ═══════════════════════════════════════════════════════════

const HN_BASE = 'https://hacker-news.firebaseio.com/v0';
const ALGOLIA  = 'https://hn.algolia.com/api/v1';

// ─── Auth helpers ─────────────────────────────────────────
function loadAuth() {
  try { return JSON.parse(localStorage.getItem('hn_auth') || 'null'); } catch { return null; }
}
function saveAuth(user) {
  if (user) localStorage.setItem('hn_auth', JSON.stringify(user));
  else localStorage.removeItem('hn_auth');
}
function loadSet(key) {
  try { return new Set(JSON.parse(localStorage.getItem(key) || '[]')); } catch { return new Set(); }
}
function saveSet(key, set) { localStorage.setItem(key, JSON.stringify([...set])); }
function loadMap(key) {
  try { return new Map(JSON.parse(localStorage.getItem(key) || '[]')); } catch { return new Map(); }
}
function saveMap(key, map) { localStorage.setItem(key, JSON.stringify([...map])); }

// ─── LoginModal ───────────────────────────────────────────
function LoginModal({ open, onClose, onLogin }) {
  const [username, setUsername] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [mode, setMode] = React.useState('login'); // 'login' | 'create'

  const submit = async () => {
    if (!username.trim() || !password.trim()) { setError('Please fill in all fields.'); return; }
    setLoading(true); setError('');
    // Note: Real HN auth is CORS-blocked; integrate via your backend proxy
    await new Promise(r => setTimeout(r, 700));
    const user = { username: username.trim(), karma: 1, about: '', created: Date.now() };
    saveAuth(user);
    onLogin(user);
    setLoading(false);
    showToast(`Welcome, ${user.username}!`, 'success');
    onClose();
  };

  return (
    <HNModal open={open} onClose={onClose} title={mode === 'login' ? 'Sign in to Hacker News' : 'Create account'}
      subtitle="Your username and password are sent to news.ycombinator.com">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {error && <div style={{ fontSize: 12, color: 'oklch(0.52 0.16 20)', background: 'oklch(0.96 0.04 20)', padding: '8px 12px', borderRadius: 7 }}>{error}</div>}
        <HNInput label="Username" placeholder="your_username" value={username} onChange={e=>setUsername(e.target.value)}
          onKeyDown={e=>e.key==='Enter'&&submit()} autoFocus />
        <HNInput label="Password" type="password" placeholder="••••••••" value={password} onChange={e=>setPassword(e.target.value)}
          onKeyDown={e=>e.key==='Enter'&&submit()} />
        <HNButton onClick={submit} loading={loading} fullWidth>
          {mode === 'login' ? 'Sign in' : 'Create account'}
        </HNButton>
        <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-tertiary)' }}>
          {mode === 'login' ? (
            <>No account? <button onClick={()=>setMode('create')} style={{ background:'none',border:'none',cursor:'pointer',color:'var(--accent-text)',fontFamily:'DM Sans',fontSize:12 }}>Create one</button></>
          ) : (
            <><button onClick={()=>setMode('login')} style={{ background:'none',border:'none',cursor:'pointer',color:'var(--accent-text)',fontFamily:'DM Sans',fontSize:12 }}>Back to sign in</button></>
          )}
        </div>
        <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 12, fontSize: 11, color: 'var(--text-tertiary)', lineHeight: 1.6 }}>
          ⚠️ Browser CORS restrictions prevent direct login to news.ycombinator.com.
          Connect a backend proxy to enable real authentication, voting, and posting.
        </div>
      </div>
    </HNModal>
  );
}

// ─── SubmitModal ──────────────────────────────────────────
function SubmitModal({ open, onClose, user }) {
  const [title, setTitle] = React.useState('');
  const [url, setUrl] = React.useState('');
  const [text, setText] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  const submit = async () => {
    if (!title.trim()) { showToast('Title is required', 'error'); return; }
    if (!url && !text) { showToast('Provide a URL or text body', 'error'); return; }
    setLoading(true);
    await new Promise(r => setTimeout(r, 600));
    setLoading(false);
    showToast('Story submitted! (Backend required to post to HN)', 'success');
    setTitle(''); setUrl(''); setText('');
    onClose();
  };

  return (
    <HNModal open={open} onClose={onClose} title="Submit a story" size="lg">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <HNInput label="Title" placeholder="Story title" value={title} onChange={e=>setTitle(e.target.value)} />
        <HNInput label="URL" placeholder="https://..." value={url} onChange={e=>setUrl(e.target.value)} hint="Leave blank for a text post" />
        {!url && (
          <HNTextarea label="Text" placeholder="What do you want to share?" value={text} onChange={e=>setText(e.target.value)} rows={5} />
        )}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <HNButton variant="secondary" onClick={onClose}>Cancel</HNButton>
          <HNButton onClick={submit} loading={loading}>Submit</HNButton>
        </div>
      </div>
    </HNModal>
  );
}

// ─── UserProfileModal ─────────────────────────────────────
function UserProfileModal({ open, onClose, user, onLogout, stats }) {
  return (
    <HNModal open={open} onClose={onClose} title="Profile" size="sm">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <HNAvatar username={user?.username} size="xl" />
          <div>
            <div style={{ fontSize: 17, fontFamily: 'Newsreader', color: 'var(--text)', fontWeight: 400 }}>{user?.username}</div>
            <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 3 }}>
              <a href={`https://news.ycombinator.com/user?id=${user?.username}`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-text)', textDecoration: 'none' }}>View on HN ↗</a>
            </div>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          {[['Karma', user?.karma?.toLocaleString() || '—'], ['Bookmarks', stats?.bookmarks || 0], ['Read Later', stats?.readLater || 0]].map(([label, val]) => (
            <div key={label} style={{ background: 'var(--bg-card-hover)', borderRadius: 9, padding: '12px 10px', textAlign: 'center', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: 18, fontFamily: 'DM Mono', fontWeight: 600, color: 'var(--text)' }}>{val}</div>
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 3 }}>{label}</div>
            </div>
          ))}
        </div>
        <HNButton variant="danger" onClick={() => { onLogout(); onClose(); }} fullWidth>Sign out</HNButton>
      </div>
    </HNModal>
  );
}

// ─── SearchBar ────────────────────────────────────────────
function SearchBar({ onResults, onClear, style={} }) {
  const [q, setQ] = React.useState('');
  const [focused, setFocused] = React.useState(false);
  const timerRef = React.useRef(null);

  const search = async (query) => {
    if (!query.trim()) { onClear(); return; }
    const res = await fetch(`${ALGOLIA}/search?query=${encodeURIComponent(query)}&tags=story&hitsPerPage=40`);
    const data = await res.json();
    onResults(data.hits.map(h => ({
      id: parseInt(h.objectID),
      title: h.title, url: h.url,
      score: h.points || 0, by: h.author,
      time: h._tags ? new Date(h.created_at).getTime()/1000 : 0,
      descendants: h.num_comments || 0,
    })));
  };

  const handleChange = (e) => {
    const val = e.target.value;
    setQ(val);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => search(val), 300);
  };

  const clear = () => { setQ(''); onClear(); };

  return (
    <div style={{ position: 'relative', ...style }}>
      <svg style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', pointerEvents: 'none' }} width="14" height="14" viewBox="0 0 16 16" fill="none">
        <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
      <input
        value={q} onChange={handleChange} placeholder="Search stories, people, domains…"
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        style={{
          width: '100%', padding: '8px 32px 8px 32px', fontSize: 13,
          fontFamily: 'DM Sans', background: 'var(--bg)',
          border: `1px solid ${focused ? 'var(--accent)' : 'var(--border)'}`,
          borderRadius: 9, color: 'var(--text)', outline: 'none', transition: 'border-color 0.12s',
        }}
      />
      {q && (
        <button onClick={clear} style={{ position: 'absolute', right: 9, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', fontSize: 16, padding: 2, lineHeight: 1 }}>×</button>
      )}
    </div>
  );
}

// ─── BookmarksPanel ───────────────────────────────────────
function BookmarksPanel({ open, onClose, bookmarks, onRemove, onOpen }) {
  const items = [...bookmarks.values()];
  return (
    <HNSheet open={open} onClose={onClose} title="Bookmarks" subtitle={`${items.length} saved`} width={420}>
      {items.length === 0 ? (
        <HNEmptyState icon="🔖" title="No bookmarks yet" description="Click the bookmark icon on any story to save it here." />
      ) : (
        <div>
          {items.map(s => (
            <div key={s.id} style={{ padding: '12px 18px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => { onOpen(s); onClose(); }}>
                <div style={{ fontSize: 13, fontFamily: 'Newsreader', color: 'var(--text)', lineHeight: 1.4, marginBottom: 4 }}>{s.title}</div>
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{s.by} · {s.score} pts</div>
              </div>
              <button onClick={() => onRemove(s.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: '2px 4px', borderRadius: 5, fontSize: 14, lineHeight: 1 }}>×</button>
            </div>
          ))}
        </div>
      )}
    </HNSheet>
  );
}

// ─── ReadLaterPanel ───────────────────────────────────────
function ReadLaterPanel({ open, onClose, readLater, onRemove, onOpen }) {
  const items = [...readLater.values()];
  return (
    <HNSheet open={open} onClose={onClose} title="Read Later" subtitle={`${items.length} queued`} width={420}>
      {items.length === 0 ? (
        <HNEmptyState icon="📖" title="Nothing queued" description="Add stories to your reading list to come back to them." />
      ) : (
        <div>
          {items.map(s => (
            <div key={s.id} style={{ padding: '12px 18px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => { onOpen(s); onClose(); }}>
                <div style={{ fontSize: 13, fontFamily: 'Newsreader', color: 'var(--text)', lineHeight: 1.4, marginBottom: 4 }}>{s.title}</div>
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{s.by} · {s.score} pts</div>
              </div>
              <button onClick={() => onRemove(s.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: '2px 4px', borderRadius: 5, fontSize: 14, lineHeight: 1 }}>×</button>
            </div>
          ))}
        </div>
      )}
    </HNSheet>
  );
}

// ─── KeyboardShortcutsModal ───────────────────────────────
function KeyboardShortcutsModal({ open, onClose }) {
  const shortcuts = [
    ['Navigation', [['j / k', 'Next / prev story'], ['Enter', 'Open selected story'], ['o', 'Open story URL'], ['Esc', 'Close panel / modal']]],
    ['Actions', [['u', 'Upvote selected'], ['b', 'Bookmark selected'], ['r', 'Read later'], ['h', 'Hide story']]],
    ['App', [['/', 'Focus search'], ['n', 'New submission'], ['?', 'Show shortcuts']]],
  ];
  return (
    <HNModal open={open} onClose={onClose} title="Keyboard shortcuts" size="md">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {shortcuts.map(([section, rows]) => (
          <div key={section}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: 10 }}>{section}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {rows.map(([key, desc]) => (
                <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{desc}</span>
                  <HNKbd keys={key.split(' / ')} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </HNModal>
  );
}

// ─── ReadingTimeEstimate ──────────────────────────────────
function readingTime(commentsCount) {
  const mins = Math.max(1, Math.round(commentsCount * 0.15));
  return `~${mins}m read`;
}

Object.assign(window, {
  LoginModal, SubmitModal, UserProfileModal,
  SearchBar, BookmarksPanel, ReadLaterPanel,
  KeyboardShortcutsModal, readingTime,
  loadAuth, saveAuth, loadSet, saveSet, loadMap, saveMap,
  HN_BASE, ALGOLIA,
});
