import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export const NoticeBoard: React.FC = () => {
  const { token, user } = useAuth();
  const [notices, setNotices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingNotice, setEditingNotice] = useState<any | null>(null);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isImportant, setIsImportant] = useState(false);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [approxDuration, setApproxDuration] = useState('Approx. 4 Hours');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const [extendingNotice, setExtendingNotice] = useState<any | null>(null);
  const [extendHours, setExtendHours] = useState<number>(4);
  const [isExtending, setIsExtending] = useState(false);
  const [noticeToDelete, setNoticeToDelete] = useState<any | null>(null);

  const fetchNotices = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/notices', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setNotices(data.notices || []);
      }
    } catch (e) {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotices();
  }, [token]);

  const toInputDateTime = (date: Date) => {
    const pad = (n: number) => (n < 10 ? '0' + n : n);
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };

  const handleApplyPreset = (hours: number, label: string) => {
    const now = new Date();
    const end = new Date(now.getTime() + hours * 60 * 60 * 1000);
    setStartTime(toInputDateTime(now));
    setEndTime(toInputDateTime(end));
    setApproxDuration(`Approx. ${label}`);
  };

  const handleOpenCreateModal = () => {
    setEditingNotice(null);
    setTitle('');
    setContent('');
    setIsImportant(false);
    const now = new Date();
    const end = new Date(now.getTime() + 4 * 60 * 60 * 1000);
    setStartTime(toInputDateTime(now));
    setEndTime(toInputDateTime(end));
    setApproxDuration('Approx. 4 Hours');
    setShowModal(true);
  };

  const handleOpenEditModal = (notice: any) => {
    setEditingNotice(notice);
    setTitle(notice.title);
    setContent(notice.content);
    setIsImportant(notice.is_important || false);
    setStartTime(notice.start_time ? toInputDateTime(new Date(notice.start_time)) : toInputDateTime(new Date()));
    setEndTime(notice.end_time ? toInputDateTime(new Date(notice.end_time)) : '');
    setApproxDuration(notice.approx_duration || 'Approx. Scheduled Window');
    setShowModal(true);
  };

  const handleSaveNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setStatusMsg(null);

    try {
      const url = editingNotice ? `/api/notices/${editingNotice.id}` : '/api/notices';
      const method = editingNotice ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title,
          content,
          is_important: isImportant,
          start_time: startTime ? new Date(startTime).toISOString() : null,
          end_time: endTime ? new Date(endTime).toISOString() : null,
          approx_duration: approxDuration,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const dispatched = data.dispatched_count;
        setTitle('');
        setContent('');
        setIsImportant(false);
        setEditingNotice(null);
        setShowModal(false);
        setStatusMsg(
          editingNotice
            ? 'Announcement updated successfully.'
            : `Announcement published and email notification dispatched to ${dispatched || 'all'} registered resident(s).`
        );
        fetchNotices();
        setTimeout(() => setStatusMsg(null), 5000);
      }
    } catch (e) {
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExtendSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!extendingNotice) return;
    setIsExtending(true);

    try {
      const res = await fetch(`/api/notices/${extendingNotice.id}/extend`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          hours: extendHours,
          approx_duration: `Approx. Extended Window (+${extendHours}h)`,
        }),
      });

      if (res.ok) {
        setStatusMsg(`Announcement schedule extended by Approx. ${extendHours} hours.`);
        setExtendingNotice(null);
        fetchNotices();
        setTimeout(() => setStatusMsg(null), 5000);
      }
    } catch (e) {
    } finally {
      setIsExtending(false);
    }
  };

  const handleMarkNoticeRead = async (noticeId: string) => {
    try {
      await fetch(`/api/notices/${noticeId}/read`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotices((prev) =>
        prev.map((n) => (n.id === noticeId ? { ...n, is_read: true } : n))
      );
    } catch (e) {}
  };

  const handleMarkAllAsRead = async () => {
    try {
      await fetch('/api/notices/read-all', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotices((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (e) {}
  };

  const handleDeleteNotice = async (noticeId: string) => {
    setDeletingId(noticeId);
    setStatusMsg(null);
    try {
      const res = await fetch(`/api/notices/${noticeId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        setStatusMsg('Announcement deleted successfully.');
        setNoticeToDelete(null);
        fetchNotices();
        setTimeout(() => setStatusMsg(null), 4000);
      }
    } catch (e) {
    } finally {
      setDeletingId(null);
    }
  };

  const getRemainingApproxTime = (endTimeStr: string | null) => {
    if (!endTimeStr) return null;
    const end = new Date(endTimeStr).getTime();
    const now = Date.now();
    const diffMs = end - now;
    if (diffMs <= 0) return 'Approx. Schedule Concluded (Expired)';
    const diffMins = Math.floor(diffMs / 60000);
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    if (hours >= 24) {
      const days = Math.floor(hours / 24);
      return `Active (Approx. ${days}d ${hours % 24}h remaining)`;
    }
    if (hours > 0) {
      return `Active (Approx. ${hours}h ${mins}m remaining)`;
    }
    return `Active (Approx. ${mins}m remaining)`;
  };

  const isNoticeExpired = (notice: any) => {
    if (notice.status === 'EXPIRED') return true;
    if (notice.end_time && new Date(notice.end_time).getTime() <= Date.now()) return true;
    return false;
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <p className="eyebrow">ANNOUNCEMENTS & NOTICES</p>
          <h1>Building Notice Board</h1>
          <p className="page-description">
            Official announcements, maintenance schedules, and time-tracked notifications.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {notices.some((n) => !n.is_read) && (
            <button
              type="button"
              className="button secondary"
              onClick={handleMarkAllAsRead}
              style={{ fontSize: '0.82rem', padding: '0.65rem 0.95rem' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              Mark All as Acknowledged
            </button>
          )}

          {user?.role === 'ADMIN' && (
            <button className="button primary" onClick={handleOpenCreateModal}>
              + Publish Announcement
            </button>
          )}
        </div>
      </div>

      {statusMsg && (
        <div style={{ background: '#dcfce7', color: '#15803d', padding: '0.75rem 1.25rem', borderLeft: '3px solid #15803d', marginBottom: '1.5rem', fontSize: '0.88rem', borderRadius: '4px', fontWeight: 600 }}>
          {statusMsg}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--muted)' }}>Loading notices...</div>
      ) : notices.length === 0 ? (
        <div className="data-panel" style={{ textAlign: 'center', padding: '3rem', color: 'var(--muted)' }}>
          No announcements published yet.
        </div>
      ) : (
        <div className="notice-list">
          {notices.map((notice) => {
            const expired = isNoticeExpired(notice);
            const remaining = getRemainingApproxTime(notice.end_time);

            return (
              <div
                key={notice.id}
                className={`notice-item ${notice.is_important ? 'important' : ''}`}
                style={expired ? { opacity: 0.75, background: 'rgba(0,0,0,0.02)', padding: '1.25rem', borderRadius: '6px', marginBottom: '1.25rem' } : { marginBottom: '1.25rem' }}
              >
                <div className="notice-meta" style={{ flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span
                      style={{
                        color: notice.is_important ? 'var(--red)' : 'var(--blue)',
                        background: notice.is_important ? 'rgba(184, 58, 50, 0.1)' : 'rgba(30, 79, 120, 0.08)',
                        padding: '0.2rem 0.5rem',
                        borderRadius: '3px',
                        fontWeight: 700,
                      }}
                    >
                      {notice.is_important ? 'URGENT ANNOUNCEMENT' : 'GENERAL NOTICE'}
                    </span>

                    {notice.approx_duration && (
                      <span
                        style={{
                          background: 'rgba(0,0,0,0.05)',
                          color: 'var(--muted)',
                          padding: '0.2rem 0.5rem',
                          borderRadius: '3px',
                          fontWeight: 600,
                        }}
                      >
                        {notice.approx_duration}
                      </span>
                    )}

                    {remaining && (
                      <span
                        style={{
                          background: expired ? '#fee2e2' : '#e0ecf5',
                          color: expired ? 'var(--red)' : 'var(--blue)',
                          padding: '0.2rem 0.5rem',
                          borderRadius: '3px',
                          fontWeight: 600,
                        }}
                      >
                        {remaining}
                      </span>
                    )}
                  </div>

                  <span>Published: {new Date(notice.created_at).toLocaleDateString()}</span>
                </div>

                <h2 style={{ marginTop: '0.75rem', marginBottom: '0.45rem' }}>{notice.title}</h2>
                <p style={{ margin: '0 0 0.75rem', lineHeight: 1.6 }}>{notice.content}</p>

                {notice.start_time && notice.end_time && (
                  <div
                    style={{
                      background: 'var(--surface)',
                      border: '1px solid var(--line)',
                      borderRadius: '4px',
                      padding: '0.5rem 0.85rem',
                      fontSize: '0.78rem',
                      color: 'var(--muted)',
                      fontFamily: 'var(--font-mono)',
                      display: 'inline-block',
                      marginBottom: '0.75rem',
                    }}
                  >
                    Approx. Scheduled Period: {new Date(notice.start_time).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })} &ndash; {new Date(notice.end_time).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.85rem', paddingTop: '0.75rem', borderTop: '1px solid var(--line)', flexWrap: 'wrap', gap: '0.6rem' }}>
                  <div>
                    {!notice.is_read ? (
                      <button
                        type="button"
                        className="button secondary"
                        onClick={() => handleMarkNoticeRead(notice.id)}
                        style={{
                          padding: '0.35rem 0.75rem',
                          fontSize: '0.8rem',
                          color: 'var(--blue)',
                          fontWeight: 600,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                        }}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                        Mark as Acknowledged
                      </button>
                    ) : (
                      <span
                        style={{
                          fontSize: '0.78rem',
                          color: 'var(--green)',
                          fontWeight: 600,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          background: '#dcfce7',
                          padding: '0.25rem 0.6rem',
                          borderRadius: '4px',
                        }}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                        Acknowledged
                      </span>
                    )}
                  </div>

                  {user?.role === 'ADMIN' && (
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      {expired && (
                        <button
                          type="button"
                          className="button primary"
                          style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                          onClick={() => setExtendingNotice(notice)}
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10"></circle>
                            <polyline points="12 6 12 12 16 14"></polyline>
                          </svg>
                          Extend Schedule
                        </button>
                      )}

                      <button
                        type="button"
                        className="button secondary"
                        style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                        onClick={() => handleOpenEditModal(notice)}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                        Edit Announcement
                      </button>

                      <button
                        type="button"
                        className="button secondary"
                        disabled={deletingId === notice.id}
                        style={{
                          padding: '0.35rem 0.75rem',
                          fontSize: '0.8rem',
                          color: 'var(--red)',
                          borderColor: 'rgba(184, 58, 50, 0.35)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                        }}
                        onClick={() => setNoticeToDelete(notice)}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6"></polyline>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                        {deletingId === notice.id ? 'Deleting...' : 'Delete Announcement'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {extendingNotice && (
        <div className="modal-backdrop" onClick={() => setExtendingNotice(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <div>
                <p className="eyebrow" style={{ marginBottom: '0.2rem' }}>SCHEDULE EXTENSION</p>
                <h2>Extend Announcement Window</h2>
              </div>
              <button className="modal-close-btn" onClick={() => setExtendingNotice(null)} aria-label="Close">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
                <span>Close</span>
              </button>
            </div>

            <form onSubmit={handleExtendSchedule}>
              <p style={{ fontSize: '0.9rem', color: 'var(--muted)', margin: '0 0 1rem' }}>
                Extending: <strong>{extendingNotice.title}</strong>
              </p>

              <div>
                <label style={{ fontWeight: 600, fontSize: '0.86rem', color: 'var(--ink)', display: 'block', marginBottom: '0.45rem' }}>
                  Select Approximate Extension Period
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginBottom: '1rem' }}>
                  {[2, 4, 8, 24, 48].map((hrs) => (
                    <button
                      key={hrs}
                      type="button"
                      onClick={() => setExtendHours(hrs)}
                      style={{
                        padding: '0.55rem',
                        borderRadius: '4px',
                        border: extendHours === hrs ? '2px solid var(--blue)' : '1px solid var(--line)',
                        background: extendHours === hrs ? 'rgba(30, 79, 120, 0.08)' : 'var(--surface)',
                        color: extendHours === hrs ? 'var(--blue)' : 'var(--ink)',
                        fontWeight: 600,
                        fontSize: '0.82rem',
                        cursor: 'pointer',
                      }}
                    >
                      +{hrs} Hours
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" className="button secondary" onClick={() => setExtendingNotice(null)}>
                  Cancel
                </button>
                <button type="submit" className="button primary" disabled={isExtending}>
                  {isExtending ? 'Extending Schedule...' : `Extend by Approx. ${extendHours} Hours`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <p className="eyebrow" style={{ marginBottom: '0.2rem' }}>ANNOUNCEMENT</p>
                <h2>{editingNotice ? 'Edit Announcement' : 'Publish Notice'}</h2>
              </div>
              <button className="modal-close-btn" onClick={() => setShowModal(false)} aria-label="Close">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
                <span>Close</span>
              </button>
            </div>

            <form onSubmit={handleSaveNotice} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--ink)', margin: 0 }}>
                    Notice Title
                  </label>
                  {title.trim().length > 3 && (
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          const res = await fetch('/api/complaints/format-text', {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                              Authorization: `Bearer ${token}`,
                            },
                            body: JSON.stringify({ text: title, is_title: true }),
                          });
                          const d = await res.json();
                          if (d.formatted) setTitle(d.formatted);
                        } catch (e) {}
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--blue)',
                        fontSize: '0.76rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        padding: '0.15rem 0.4rem',
                        borderRadius: '4px',
                      }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 20h9"></path>
                        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                      </svg>
                      Auto-Format
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Scheduled Water Supply Maintenance"
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--ink)', margin: 0 }}>
                    Announcement Content
                  </label>
                  {content.trim().length > 3 && (
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          const res = await fetch('/api/complaints/format-text', {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                              Authorization: `Bearer ${token}`,
                            },
                            body: JSON.stringify({ text: content, is_title: false }),
                          });
                          const d = await res.json();
                          if (d.formatted) setContent(d.formatted);
                        } catch (e) {}
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--blue)',
                        fontSize: '0.76rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        padding: '0.15rem 0.4rem',
                        borderRadius: '4px',
                      }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 20h9"></path>
                        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                      </svg>
                      Auto-Format & Clean
                    </button>
                  )}
                </div>
                <textarea
                  required
                  rows={4}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Provide complete notice details, timings, and instructions for residents..."
                />
              </div>

              <div>
                <label style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--ink)', display: 'block', marginBottom: '0.45rem' }}>
                  Approximate Active Time Window Presets
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem', marginBottom: '0.85rem' }}>
                  {[
                    { hrs: 2, lbl: '2 Hours' },
                    { hrs: 4, lbl: '4 Hours' },
                    { hrs: 8, lbl: '8 Hours' },
                    { hrs: 24, lbl: '24 Hours (1 Day)' },
                    { hrs: 48, lbl: '48 Hours (2 Days)' },
                  ].map((p) => (
                    <button
                      key={p.hrs}
                      type="button"
                      onClick={() => handleApplyPreset(p.hrs, p.lbl)}
                      style={{
                        padding: '0.35rem 0.75rem',
                        borderRadius: '4px',
                        border: approxDuration === `Approx. ${p.lbl}` ? '1px solid var(--blue)' : '1px solid var(--line)',
                        background: approxDuration === `Approx. ${p.lbl}` ? 'rgba(30, 79, 120, 0.08)' : 'var(--surface)',
                        color: approxDuration === `Approx. ${p.lbl}` ? 'var(--blue)' : 'var(--ink)',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Approx. {p.lbl}
                    </button>
                  ))}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <span style={{ fontSize: '0.78rem', color: 'var(--muted)', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>
                      Start Time (Approx.)
                    </span>
                    <input
                      type="datetime-local"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      style={{ width: '100%', boxSizing: 'border-box', padding: '0.55rem 0.75rem', border: '1px solid var(--line)', borderRadius: '4px' }}
                    />
                  </div>
                  <div>
                    <span style={{ fontSize: '0.78rem', color: 'var(--muted)', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>
                      End Time (Auto-Expire Approx.)
                    </span>
                    <input
                      type="datetime-local"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      style={{ width: '100%', boxSizing: 'border-box', padding: '0.55rem 0.75rem', border: '1px solid var(--line)', borderRadius: '4px' }}
                    />
                  </div>
                </div>
              </div>

              <div
                style={{
                  background: 'rgba(30, 79, 120, 0.04)',
                  border: '1px solid var(--line)',
                  borderRadius: '6px',
                  padding: '0.75rem 0.9rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  cursor: 'pointer',
                }}
                onClick={() => setIsImportant(!isImportant)}
              >
                <input
                  type="checkbox"
                  checked={isImportant}
                  onChange={(e) => setIsImportant(e.target.checked)}
                  style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--blue)' }}
                  onClick={(e) => e.stopPropagation()}
                />
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.86rem', color: 'var(--ink)' }}>
                    Mark as High Priority / Urgent Notice
                  </div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--muted)' }}>
                    Broadcasts instant email notification to all registered residents
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="button primary"
                  disabled={isSubmitting}
                >
                  {isSubmitting
                    ? editingNotice
                      ? 'Saving Changes...'
                      : 'Publishing...'
                    : editingNotice
                    ? 'Save Changes'
                    : 'Publish Announcement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {noticeToDelete && (
        <div className="modal-backdrop" onClick={() => !deletingId && setNoticeToDelete(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <div>
                <p className="eyebrow" style={{ color: 'var(--red)', marginBottom: '0.2rem' }}>CONFIRM DELETION</p>
                <h2>Delete Announcement</h2>
              </div>
              <button
                className="modal-close-btn"
                onClick={() => !deletingId && setNoticeToDelete(null)}
                aria-label="Close"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
                <span>Close</span>
              </button>
            </div>

            <div style={{ padding: '0.25rem 0 1.25rem' }}>
              <p style={{ margin: '0 0 0.85rem', fontSize: '0.92rem', color: 'var(--ink)', lineHeight: 1.5 }}>
                Are you sure you want to permanently delete this announcement?
              </p>
              <div
                style={{
                  background: 'rgba(184, 58, 50, 0.05)',
                  border: '1px solid rgba(184, 58, 50, 0.2)',
                  borderRadius: '6px',
                  padding: '0.75rem 1rem',
                  fontSize: '0.88rem',
                  fontWeight: 600,
                  color: 'var(--ink)',
                }}
              >
                {noticeToDelete.title}
              </div>
              <p style={{ margin: '0.85rem 0 0', fontSize: '0.78rem', color: 'var(--muted)', lineHeight: 1.4 }}>
                This action cannot be undone and will immediately withdraw the notice from all resident portals.
              </p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                className="button secondary"
                onClick={() => setNoticeToDelete(null)}
                disabled={Boolean(deletingId)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="button primary"
                style={{ background: 'var(--red)', borderColor: 'var(--red)', color: '#ffffff' }}
                disabled={Boolean(deletingId)}
                onClick={() => handleDeleteNotice(noticeToDelete.id)}
              >
                {deletingId ? 'Deleting...' : 'Delete Announcement'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
