
// ═══════════════════════════════════════════════════════════
//  HN Design System — Core Components
//  Primitives: Button, Input, Textarea, Modal, Badge, Tag,
//              Avatar, Toast, Tooltip, Score, Divider, EmptyState
// ═══════════════════════════════════════════════════════════

// ─── HNButton ───────────────────────────────────────────────
function HNButton({ variant='primary', size='md', icon, iconRight, loading=false, disabled=false, onClick, children, style={}, fullWidth=false }) {
  const [pressed, setPressed] = React.useState(false);
  const base = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    gap: 6, border: 'none', cursor: disabled||loading ? 'not-allowed' : 'pointer',
    fontFamily: 'DM Sans', fontWeight: 500, borderRadius: 8,
    transition: 'all 0.13s ease', userSelect: 'none',
    opacity: disabled ? 0.45 : 1,
    width: fullWidth ? '100%' : 'auto',
    transform: pressed && !disabled ? 'scale(0.97)' : 'scale(1)',
  };
  const sizes = {
    sm: { fontSize: 12, padding: '5px 11px' },
    md: { fontSize: 13, padding: '8px 16px' },
    lg: { fontSize: 14, padding: '10px 20px' },
  };
  const variants = {
    primary: { background: 'var(--accent)', color: 'white', boxShadow: '0 1px 3px oklch(0 0 0 / 0.15)' },
    secondary: { background: 'var(--bg-card-hover)', color: 'var(--text)', border: '1px solid var(--border)' },
    ghost: { background: 'transparent', color: 'var(--text-secondary)' },
    danger: { background: 'oklch(0.58 0.18 20)', color: 'white' },
    success: { background: 'oklch(0.58 0.14 145)', color: 'white' },
  };
  return (
    <button
      onClick={disabled||loading ? undefined : onClick}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onMouseLeave={() => setPressed(false)}
      style={{ ...base, ...sizes[size], ...variants[variant], ...style }}
    >
      {loading ? <span style={{ display: 'inline-block', width: 13, height: 13, border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', animation: 'hn-spin 0.7s linear infinite' }} /> : icon}
      {children}
      {iconRight}
    </button>
  );
}

// ─── HNInput ────────────────────────────────────────────────
function HNInput({ label, placeholder, type='text', value, onChange, error, hint, icon, autoFocus, onKeyDown, name, style={} }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      {label && <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', letterSpacing: '0.03em' }}>{label}</label>}
      <div style={{ position: 'relative' }}>
        {icon && <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', display: 'flex' }}>{icon}</span>}
        <input
          type={type} value={value} onChange={onChange} placeholder={placeholder}
          autoFocus={autoFocus} onKeyDown={onKeyDown} name={name}
          style={{
            width: '100%', padding: icon ? '9px 12px 9px 34px' : '9px 12px',
            fontSize: 13, fontFamily: 'DM Sans',
            background: 'var(--bg)', color: 'var(--text)',
            border: `1px solid ${error ? 'oklch(0.58 0.18 20)' : 'var(--border)'}`,
            borderRadius: 8, outline: 'none', transition: 'border-color 0.12s',
            ...style,
          }}
          onFocus={e => e.target.style.borderColor = error ? 'oklch(0.58 0.18 20)' : 'var(--accent)'}
          onBlur={e => e.target.style.borderColor = error ? 'oklch(0.58 0.18 20)' : 'var(--border)'}
        />
      </div>
      {error && <span style={{ fontSize: 11, color: 'oklch(0.58 0.18 20)' }}>{error}</span>}
      {hint && !error && <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{hint}</span>}
    </div>
  );
}

// ─── HNTextarea ─────────────────────────────────────────────
function HNTextarea({ label, placeholder, value, onChange, rows=4, hint, style={} }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      {label && <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', letterSpacing: '0.03em' }}>{label}</label>}
      <textarea
        value={value} onChange={onChange} placeholder={placeholder} rows={rows}
        style={{
          width: '100%', padding: '9px 12px', fontSize: 13, fontFamily: 'DM Sans',
          background: 'var(--bg)', color: 'var(--text)',
          border: '1px solid var(--border)', borderRadius: 8,
          outline: 'none', resize: 'vertical', lineHeight: 1.6,
          transition: 'border-color 0.12s', ...style,
        }}
        onFocus={e => e.target.style.borderColor = 'var(--accent)'}
        onBlur={e => e.target.style.borderColor = 'var(--border)'}
      />
      {hint && <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{hint}</span>}
    </div>
  );
}

// ─── HNModal ────────────────────────────────────────────────
function HNModal({ open, onClose, title, subtitle, size='md', children, footer }) {
  React.useEffect(() => {
    if (!open) return;
    const handler = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;
  const widths = { sm: 380, md: 480, lg: 620, xl: 780 };
  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose(); }} style={{
      position: 'fixed', inset: 0, background: 'oklch(0 0 0 / 0.35)',
      backdropFilter: 'blur(4px)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20, animation: 'hn-fade-in 0.15s ease',
    }}>
      <div style={{
        width: '100%', maxWidth: widths[size],
        background: 'var(--bg)', borderRadius: 14,
        border: '1px solid var(--border)',
        boxShadow: '0 20px 60px oklch(0 0 0 / 0.18)',
        animation: 'hn-slide-up 0.18s ease',
        overflow: 'hidden',
      }}>
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h3 style={{ fontFamily: 'Newsreader', fontSize: 19, fontWeight: 400, color: 'var(--text)' }}>{title}</h3>
            {subtitle && <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 3 }}>{subtitle}</p>}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', fontSize: 18, padding: '2px 6px', borderRadius: 6, lineHeight: 1 }}>✕</button>
        </div>
        <div style={{ padding: '20px 24px' }}>{children}</div>
        {footer && <div style={{ padding: '12px 24px 18px', borderTop: '1px solid var(--border-subtle)' }}>{footer}</div>}
      </div>
    </div>
  );
}

// ─── HNSheet (slide-in side panel) ──────────────────────────
function HNSheet({ open, onClose, title, subtitle, side='right', width=400, children }) {
  React.useEffect(() => {
    if (!open) return;
    const handler = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;
  const fromRight = side === 'right';
  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose(); }} style={{
      position: 'fixed', inset: 0, background: 'oklch(0 0 0 / 0.2)',
      backdropFilter: 'blur(2px)', zIndex: 900,
      animation: 'hn-fade-in 0.15s ease',
    }}>
      <div style={{
        position: 'absolute', [fromRight ? 'right' : 'left']: 0, top: 0, bottom: 0,
        width, background: 'var(--bg-panel)',
        borderLeft: fromRight ? '1px solid var(--border)' : 'none',
        borderRight: !fromRight ? '1px solid var(--border)' : 'none',
        display: 'flex', flexDirection: 'column',
        animation: `hn-slide-${fromRight ? 'right' : 'left'} 0.2s ease`,
        overflow: 'hidden',
      }}>
        <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <div>
            <h3 style={{ fontFamily: 'Newsreader', fontSize: 17, fontWeight: 400, color: 'var(--text)' }}>{title}</h3>
            {subtitle && <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>{subtitle}</p>}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', fontSize: 17, padding: '2px 6px', borderRadius: 6, lineHeight: 1 }}>✕</button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>{children}</div>
      </div>
    </div>
  );
}

// ─── HNBadge ────────────────────────────────────────────────
function HNBadge({ children, variant='default', dot=false, size='sm' }) {
  const variants = {
    default: { bg: 'var(--border-subtle)', color: 'var(--text-secondary)' },
    accent:  { bg: 'var(--accent-light)', color: 'var(--accent-text)' },
    green:   { bg: 'oklch(0.92 0.06 145)', color: 'oklch(0.42 0.12 145)' },
    blue:    { bg: 'oklch(0.92 0.04 240)', color: 'oklch(0.42 0.12 240)' },
    red:     { bg: 'oklch(0.93 0.05 20)',  color: 'oklch(0.50 0.16 20)'  },
    purple:  { bg: 'oklch(0.92 0.05 290)', color: 'oklch(0.44 0.12 290)' },
  };
  const v = variants[variant] || variants.default;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      fontSize: size === 'xs' ? 10 : 11, fontWeight: 500,
      padding: size === 'xs' ? '1px 5px' : '2px 7px', borderRadius: 99,
      background: v.bg, color: v.color,
    }}>
      {dot && <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor', display: 'inline-block' }} />}
      {children}
    </span>
  );
}

// ─── HNTag (removable) ──────────────────────────────────────
function HNTag({ children, color='default', onRemove }) {
  const colors = {
    default: 'var(--border-subtle)',
    orange:  'var(--accent-light)',
    green:   'oklch(0.92 0.06 145)',
    blue:    'oklch(0.92 0.04 240)',
    purple:  'oklch(0.92 0.05 290)',
  };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      fontSize: 11, fontWeight: 500, padding: '2px 7px 2px 8px',
      borderRadius: 99, background: colors[color] || colors.default,
      color: 'var(--text-secondary)',
    }}>
      {children}
      {onRemove && (
        <button onClick={onRemove} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'currentColor', opacity: 0.6, fontSize: 12, lineHeight: 1, display: 'flex' }}>×</button>
      )}
    </span>
  );
}

// ─── HNAvatar ───────────────────────────────────────────────
function HNAvatar({ username, size='md', karma }) {
  const sizes = { xs: 20, sm: 26, md: 32, lg: 40, xl: 52 };
  const px = sizes[size] || 32;
  const hue = username ? username.split('').reduce((a,c) => a + c.charCodeAt(0), 0) % 360 : 42;
  return (
    <div title={karma ? `${username} · ${karma?.toLocaleString()} karma` : username} style={{
      width: px, height: px, borderRadius: '50%',
      background: `oklch(0.80 0.09 ${hue})`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: px * 0.38, fontWeight: 600, color: `oklch(0.35 0.09 ${hue})`,
      fontFamily: 'DM Sans', flexShrink: 0,
      border: '1.5px solid oklch(0 0 0 / 0.06)',
    }}>
      {(username||'?')[0].toUpperCase()}
    </div>
  );
}

// ─── HNScore (upvote widget) ─────────────────────────────────
function HNScore({ score, upvoted=false, onUpvote, disabled=false }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, minWidth: 36 }}>
      <button
        onClick={disabled ? undefined : onUpvote}
        title={disabled ? 'Log in to vote' : upvoted ? 'Unvote' : 'Upvote'}
        style={{
          background: 'none', border: 'none', cursor: disabled ? 'default' : 'pointer',
          padding: '3px 6px', borderRadius: 6,
          color: upvoted ? 'var(--accent)' : 'var(--text-tertiary)',
          transition: 'all 0.12s', fontSize: 13,
          transform: upvoted ? 'scale(1.2)' : 'scale(1)',
        }}
        onMouseEnter={e => { if (!disabled && !upvoted) e.currentTarget.style.color = 'var(--accent)'; }}
        onMouseLeave={e => { if (!upvoted) e.currentTarget.style.color = 'var(--text-tertiary)'; }}
      >▲</button>
      <span style={{ fontSize: 13, fontWeight: 600, fontFamily: 'DM Mono', color: upvoted ? 'var(--accent-text)' : 'var(--text-tertiary)', lineHeight: 1 }}>{score}</span>
    </div>
  );
}

// ─── HNDivider ──────────────────────────────────────────────
function HNDivider({ label }) {
  if (!label) return <hr style={{ border: 'none', borderTop: '1px solid var(--border-subtle)', margin: '12px 0' }} />;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '16px 0' }}>
      <div style={{ flex: 1, height: 1, background: 'var(--border-subtle)' }} />
      <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>{label}</span>
      <div style={{ flex: 1, height: 1, background: 'var(--border-subtle)' }} />
    </div>
  );
}

// ─── HNEmptyState ────────────────────────────────────────────
function HNEmptyState({ icon='○', title, description, action }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '40px 24px', textAlign: 'center' }}>
      <div style={{ fontSize: 28, color: 'var(--border)', marginBottom: 4 }}>{icon}</div>
      <div style={{ fontSize: 15, fontFamily: 'Newsreader', color: 'var(--text-secondary)' }}>{title}</div>
      {description && <div style={{ fontSize: 12, color: 'var(--text-tertiary)', maxWidth: 240 }}>{description}</div>}
      {action && <div style={{ marginTop: 6 }}>{action}</div>}
    </div>
  );
}

// ─── HNTooltip ──────────────────────────────────────────────
function HNTooltip({ content, children, position='top' }) {
  const [show, setShow] = React.useState(false);
  const offsets = { top: { bottom: 'calc(100% + 6px)', left: '50%', transform: 'translateX(-50%)' }, bottom: { top: 'calc(100% + 6px)', left: '50%', transform: 'translateX(-50%)' } };
  return (
    <div style={{ position: 'relative', display: 'inline-flex' }} onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      {children}
      {show && content && (
        <div style={{
          position: 'absolute', ...offsets[position],
          background: 'var(--text)', color: 'var(--bg)',
          fontSize: 11, padding: '4px 8px', borderRadius: 5,
          whiteSpace: 'nowrap', zIndex: 999, pointerEvents: 'none',
          animation: 'hn-fade-in 0.12s ease',
        }}>{content}</div>
      )}
    </div>
  );
}

// ─── HNToast system ─────────────────────────────────────────
const toastListeners = [];
function showToast(message, type='info', duration=3000) {
  const id = Date.now() + Math.random();
  toastListeners.forEach(fn => fn({ id, message, type, duration }));
}

function HNToastContainer() {
  const [toasts, setToasts] = React.useState([]);
  React.useEffect(() => {
    const handler = toast => {
      setToasts(prev => [...prev, toast]);
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== toast.id)), toast.duration);
    };
    toastListeners.push(handler);
    return () => { const i = toastListeners.indexOf(handler); if (i > -1) toastListeners.splice(i, 1); };
  }, []);
  if (!toasts.length) return null;
  return (
    <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {toasts.map(t => {
        const colors = { info: 'var(--text)', success: 'oklch(0.40 0.14 145)', error: 'oklch(0.50 0.16 20)', warning: 'oklch(0.52 0.14 65)' };
        return (
          <div key={t.id} style={{
            background: 'var(--bg)', border: '1px solid var(--border)',
            borderLeft: `3px solid ${colors[t.type] || colors.info}`,
            borderRadius: 9, padding: '10px 16px', fontSize: 13,
            color: 'var(--text)', boxShadow: '0 4px 20px oklch(0 0 0 / 0.10)',
            animation: 'hn-slide-right 0.2s ease', maxWidth: 320,
            fontFamily: 'DM Sans',
          }}>{t.message}</div>
        );
      })}
    </div>
  );
}

// ─── HNKbdShortcut ───────────────────────────────────────────
function HNKbd({ keys }) {
  return (
    <span style={{ display: 'inline-flex', gap: 3, alignItems: 'center' }}>
      {keys.map((k, i) => (
        <kbd key={i} style={{
          fontFamily: 'DM Mono', fontSize: 10, padding: '2px 5px',
          background: 'var(--bg-card-hover)', border: '1px solid var(--border)',
          borderRadius: 4, color: 'var(--text-secondary)',
        }}>{k}</kbd>
      ))}
    </span>
  );
}

// ─── Global keyframe styles ──────────────────────────────────
const hnComponentStyles = document.createElement('style');
hnComponentStyles.textContent = `
@keyframes hn-spin { to { transform: rotate(360deg); } }
@keyframes hn-fade-in { from { opacity: 0; } to { opacity: 1; } }
@keyframes hn-slide-up { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
@keyframes hn-slide-right { from { opacity: 0; transform: translateX(12px); } to { opacity: 1; transform: translateX(0); } }
@keyframes hn-slide-left { from { opacity: 0; transform: translateX(-12px); } to { opacity: 1; transform: translateX(0); } }
`;
document.head.appendChild(hnComponentStyles);

// ─── Export all to window ────────────────────────────────────
Object.assign(window, {
  HNButton, HNInput, HNTextarea, HNModal, HNSheet,
  HNBadge, HNTag, HNAvatar, HNScore, HNDivider,
  HNEmptyState, HNTooltip, HNToastContainer, showToast, HNKbd,
});
