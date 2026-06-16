/**
 * FeedbackWidget.jsx
 * Floating feedback button + dialog, visible on every screen.
 * Admin (kaushik07oct2004@gmail.com) sees all feedbacks and can reply.
 * Regular users can submit feedback and see their own thread.
 */
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabase';
import { useAuth } from '../contexts/AuthContext';

const ADMIN_EMAIL = 'kaushik07oct2004@gmail.com';

export default function FeedbackWidget() {
  const { user, profile } = useAuth();
  const [isOpen, setIsOpen]         = useState(false);
  const [view, setView]             = useState('list'); // 'list' | 'compose' | 'thread'
  const [feedbacks, setFeedbacks]   = useState([]);
  const [selected, setSelected]     = useState(null);
  const [replies, setReplies]       = useState([]);
  const [message, setMessage]       = useState('');
  const [reply, setReply]           = useState('');
  const [sending, setSending]       = useState(false);
  const [loadingList, setLoadingList] = useState(false);
  const [sent, setSent]             = useState(false);
  const [error, setError]           = useState('');
  const dialogRef = useRef(null);

  const isAdmin = user?.email === ADMIN_EMAIL;

  // ── Open/close & initial load ─────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    if (isAdmin) {
      setView('list');
      loadAllFeedbacks();
    } else if (user) {
      setView('list');
      loadMyFeedbacks();
    } else {
      setView('compose');
    }
  }, [isOpen]);

  // ── Close on outside click ────────────────────────────────────────────
  useEffect(() => {
    function handleClick(e) {
      if (dialogRef.current && !dialogRef.current.contains(e.target)) {
        const btn = document.getElementById('feedback-toggle-btn');
        if (btn && btn.contains(e.target)) return;
        setIsOpen(false);
      }
    }
    if (isOpen) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen]);

  // ── Data loaders ──────────────────────────────────────────────────────
  async function loadAllFeedbacks() {
    setLoadingList(true);
    const { data } = await supabase
      .from('feedbacks')
      .select('*')
      .order('created_at', { ascending: false });
    setFeedbacks(data || []);
    setLoadingList(false);
  }

  async function loadMyFeedbacks() {
    if (!user) return;
    setLoadingList(true);
    const { data } = await supabase
      .from('feedbacks')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setFeedbacks(data || []);
    setLoadingList(false);
  }

  async function loadThread(fb) {
    setSelected(fb);
    setView('thread');
    const { data } = await supabase
      .from('feedback_replies')
      .select('*')
      .eq('feedback_id', fb.id)
      .order('created_at', { ascending: true });
    setReplies(data || []);
  }

  // ── Submit feedback ───────────────────────────────────────────────────
  async function handleSubmit(e) {
    e.preventDefault();
    if (!message.trim()) return;
    setSending(true);
    setError('');
    try {
      const { error: err } = await supabase.from('feedbacks').insert({
        user_id:  user?.id  || null,
        email:    user?.email || null,
        username: profile?.username || user?.email?.split('@')[0] || 'Anonymous',
        message:  message.trim(),
        status:   'open',
      });
      if (err) throw err;
      setMessage('');
      setSent(true);
      setTimeout(() => {
        setSent(false);
        setIsOpen(false);
      }, 2500);
    } catch (err) {
      setError(err.message || 'Failed to send.');
    } finally {
      setSending(false);
    }
  }

  // ── Admin reply ───────────────────────────────────────────────────────
  async function handleReply(e) {
    e.preventDefault();
    if (!reply.trim() || !selected) return;
    setSending(true);
    setError('');
    try {
      // Insert reply
      const { error: repErr } = await supabase.from('feedback_replies').insert({
        feedback_id: selected.id,
        author_name: 'Admin',
        message:     reply.trim(),
        is_admin:    true,
      });
      if (repErr) throw repErr;

      // Update feedback status
      await supabase.from('feedbacks').update({ status: 'replied' }).eq('id', selected.id);

      // Send email notification via Supabase
      await sendEmailNotification(selected, reply.trim());

      setReply('');
      // Refresh thread
      const { data } = await supabase
        .from('feedback_replies')
        .select('*')
        .eq('feedback_id', selected.id)
        .order('created_at', { ascending: true });
      setReplies(data || []);
    } catch (err) {
      setError(err.message || 'Failed to reply.');
    } finally {
      setSending(false);
    }
  }

  async function sendEmailNotification(feedback, replyMessage) {
    // Call Supabase Edge Function (or fallback to a no-op if not deployed)
    try {
      await supabase.functions.invoke('send-feedback-reply', {
        body: {
          to:       feedback.email,
          username: feedback.username,
          message:  feedback.message,
          reply:    replyMessage,
        },
      });
    } catch (_) {
      // Edge function not deployed — silently skip
    }
  }

  // ── Status badge ──────────────────────────────────────────────────────
  function StatusBadge({ status }) {
    const colors = {
      open:    { bg: '#2a1a0e', color: '#f59e0b', border: '#92400e' },
      replied: { bg: '#0e2a1a', color: '#34d399', border: '#065f46' },
      closed:  { bg: '#1a1a2e', color: '#94a3b8', border: '#334155' },
    };
    const s = colors[status] || colors.open;
    return (
      <span style={{
        fontSize: '0.65rem', fontWeight: 700, padding: '2px 8px',
        borderRadius: 20, background: s.bg, color: s.color,
        border: `1px solid ${s.border}`, textTransform: 'uppercase', letterSpacing: '0.05em',
      }}>
        {status}
      </span>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <>
      {/* Floating Button */}
      <button
        id="feedback-toggle-btn"
        onClick={() => setIsOpen(o => !o)}
        title="Send Feedback"
        style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          zIndex: 9998,
          width: 52,
          height: 52,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 20px rgba(99,102,241,0.5)',
          transition: 'transform 0.2s, box-shadow 0.2s',
          transform: isOpen ? 'rotate(45deg)' : 'rotate(0)',
        }}
        onMouseEnter={e => e.currentTarget.style.transform = isOpen ? 'rotate(45deg) scale(1.1)' : 'scale(1.1)'}
        onMouseLeave={e => e.currentTarget.style.transform = isOpen ? 'rotate(45deg)' : 'scale(1)'}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          {isOpen
            ? <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>
            : <><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></>
          }
        </svg>
      </button>

      {/* Dialog */}
      {isOpen && (
        <div
          ref={dialogRef}
          style={{
            position: 'fixed',
            bottom: 88,
            right: 24,
            zIndex: 9999,
            width: 380,
            maxWidth: 'calc(100vw - 48px)',
            maxHeight: '70vh',
            background: 'rgba(15, 12, 28, 0.97)',
            border: '1px solid rgba(99,102,241,0.35)',
            borderRadius: 20,
            boxShadow: '0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(99,102,241,0.1)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            backdropFilter: 'blur(20px)',
          }}
        >
          {/* Header */}
          <div style={{
            padding: '16px 20px',
            borderBottom: '1px solid rgba(255,255,255,0.07)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            background: 'rgba(99,102,241,0.08)',
          }}>
            {view === 'thread' && (
              <button
                onClick={() => { setView(isAdmin ? 'list' : (feedbacks.length ? 'list' : 'compose')); setSelected(null); }}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '2px 6px', borderRadius: 6, fontSize: '1rem' }}
              >←</button>
            )}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            <span style={{ fontWeight: 700, color: '#e2e8f0', fontSize: '0.95rem', flex: 1 }}>
              {isAdmin ? '🛡️ Admin — Feedback Inbox' : view === 'thread' ? 'Your Thread' : 'Feedback'}
            </span>
            {!isAdmin && view === 'list' && (
              <button
                onClick={() => setView('compose')}
                style={{ background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.4)', color: '#818cf8', cursor: 'pointer', padding: '4px 12px', borderRadius: 8, fontSize: '0.8rem', fontWeight: 600 }}
              >+ New</button>
            )}
          </div>

          {/* Body */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>

            {/* ── Compose View ── */}
            {view === 'compose' && !sent && (
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: 0 }}>
                  Have a suggestion, bug report, or question? We'd love to hear from you!
                </p>
                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="Type your message here..."
                  required
                  rows={5}
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: 12,
                    color: '#e2e8f0',
                    padding: '12px 14px',
                    fontSize: '0.9rem',
                    resize: 'vertical',
                    outline: 'none',
                    fontFamily: 'inherit',
                  }}
                />
                {error && <p style={{ color: '#f87171', fontSize: '0.82rem', margin: 0 }}>{error}</p>}
                <button
                  type="submit"
                  disabled={sending || !message.trim()}
                  style={{
                    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                    border: 'none',
                    borderRadius: 10,
                    color: '#fff',
                    fontWeight: 700,
                    padding: '11px',
                    cursor: sending ? 'not-allowed' : 'pointer',
                    opacity: sending || !message.trim() ? 0.6 : 1,
                    fontSize: '0.9rem',
                    transition: 'opacity 0.2s',
                  }}
                >
                  {sending ? 'Sending…' : 'Send Feedback'}
                </button>
              </form>
            )}

            {/* ── Sent confirmation ── */}
            {sent && (
              <div style={{ textAlign: 'center', padding: '20px 0', display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
                <div style={{ fontSize: '2.5rem' }}>✅</div>
                <p style={{ color: '#34d399', fontWeight: 700, fontSize: '1rem' }}>Thank you for your feedback!</p>
                <p style={{ color: '#94a3b8', fontSize: '0.82rem' }}>We'll get back to you soon.</p>
              </div>
            )}

            {/* ── List View ── */}
            {view === 'list' && (
              <>
                {loadingList && (
                  <div style={{ textAlign: 'center', color: '#94a3b8', padding: '20px 0' }}>Loading…</div>
                )}
                {!loadingList && feedbacks.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '20px 0' }}>
                    <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
                      {isAdmin ? 'No feedbacks yet.' : 'You haven\'t submitted any feedback yet.'}
                    </p>
                    {!isAdmin && (
                      <button
                        onClick={() => setView('compose')}
                        style={{ background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.4)', color: '#818cf8', cursor: 'pointer', padding: '8px 20px', borderRadius: 8, marginTop: 8, fontWeight: 600, fontSize: '0.85rem' }}
                      >Submit Feedback</button>
                    )}
                  </div>
                )}
                {feedbacks.map(fb => (
                  <div
                    key={fb.id}
                    onClick={() => loadThread(fb)}
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 12,
                      padding: '12px 14px',
                      cursor: 'pointer',
                      transition: 'background 0.15s, border-color 0.15s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.1)'; e.currentTarget.style.borderColor = 'rgba(99,102,241,0.3)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ fontWeight: 700, color: '#e2e8f0', fontSize: '0.88rem' }}>
                        {isAdmin ? (fb.username || 'Anonymous') : 'You'}
                      </span>
                      <StatusBadge status={fb.status} />
                    </div>
                    {isAdmin && (
                      <p style={{ color: '#64748b', fontSize: '0.75rem', margin: '0 0 4px' }}>{fb.email}</p>
                    )}
                    <p style={{
                      color: '#94a3b8', fontSize: '0.85rem', margin: 0,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>{fb.message}</p>
                    <p style={{ color: '#475569', fontSize: '0.72rem', margin: '6px 0 0' }}>
                      {new Date(fb.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                ))}
              </>
            )}

            {/* ── Thread View ── */}
            {view === 'thread' && selected && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {/* Original message */}
                <div style={{
                  background: 'rgba(99,102,241,0.08)',
                  border: '1px solid rgba(99,102,241,0.2)',
                  borderRadius: 12,
                  padding: '12px 14px',
                }}>
                  {isAdmin && (
                    <div style={{ marginBottom: 6 }}>
                      <span style={{ fontWeight: 700, color: '#818cf8', fontSize: '0.85rem' }}>{selected.username}</span>
                      <span style={{ color: '#64748b', fontSize: '0.75rem', marginLeft: 8 }}>{selected.email}</span>
                    </div>
                  )}
                  <p style={{ color: '#e2e8f0', fontSize: '0.88rem', margin: '0 0 6px' }}>{selected.message}</p>
                  <p style={{ color: '#475569', fontSize: '0.72rem', margin: 0 }}>
                    {new Date(selected.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>

                {/* Replies */}
                {replies.map(r => (
                  <div
                    key={r.id}
                    style={{
                      background: r.is_admin ? 'rgba(52,211,153,0.07)' : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${r.is_admin ? 'rgba(52,211,153,0.2)' : 'rgba(255,255,255,0.08)'}`,
                      borderRadius: 12,
                      padding: '10px 14px',
                      marginLeft: r.is_admin ? 0 : 16,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <span style={{ fontWeight: 700, fontSize: '0.8rem', color: r.is_admin ? '#34d399' : '#94a3b8' }}>
                        {r.is_admin ? '🛡️ Admin' : r.author_name}
                      </span>
                      <span style={{ color: '#475569', fontSize: '0.7rem' }}>
                        {new Date(r.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p style={{ color: '#e2e8f0', fontSize: '0.85rem', margin: 0 }}>{r.message}</p>
                  </div>
                ))}

                {replies.length === 0 && !isAdmin && (
                  <p style={{ color: '#64748b', fontSize: '0.82rem', textAlign: 'center', padding: '8px 0' }}>No replies yet. We'll respond soon!</p>
                )}

                {/* Admin reply box */}
                {isAdmin && (
                  <form onSubmit={handleReply} style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
                    <textarea
                      value={reply}
                      onChange={e => setReply(e.target.value)}
                      placeholder="Type your reply as Admin..."
                      rows={3}
                      style={{
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(52,211,153,0.25)',
                        borderRadius: 10,
                        color: '#e2e8f0',
                        padding: '10px 12px',
                        fontSize: '0.85rem',
                        resize: 'vertical',
                        outline: 'none',
                        fontFamily: 'inherit',
                      }}
                    />
                    {error && <p style={{ color: '#f87171', fontSize: '0.8rem', margin: 0 }}>{error}</p>}
                    <button
                      type="submit"
                      disabled={sending || !reply.trim()}
                      style={{
                        background: 'linear-gradient(135deg, #059669, #34d399)',
                        border: 'none',
                        borderRadius: 8,
                        color: '#fff',
                        fontWeight: 700,
                        padding: '9px',
                        cursor: sending ? 'not-allowed' : 'pointer',
                        opacity: sending || !reply.trim() ? 0.6 : 1,
                        fontSize: '0.85rem',
                      }}
                    >
                      {sending ? 'Sending…' : '✉️ Send Reply & Notify User'}
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
