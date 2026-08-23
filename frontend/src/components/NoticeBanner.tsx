import React, { useState, useEffect, useRef } from 'react';

export interface NoticeItem {
  id: string;
  title: string;
  content: string;
  is_important: boolean;
  start_time?: string;
  end_time?: string;
  approx_duration?: string;
  status?: string;
  is_read?: boolean;
  created_at: string;
}

interface NoticeBannerProps {
  notices: NoticeItem[];
  onAcknowledge?: (id: string) => void;
  onNavigateToNotices?: () => void;
  showAdminControls?: boolean;
}

export const NoticeBanner: React.FC<NoticeBannerProps> = ({
  notices,
  onAcknowledge,
  onNavigateToNotices,
}) => {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [fadeState, setFadeState] = useState<'fadeIn' | 'fadeOut'>('fadeIn');
  const timerRef = useRef<any>(null);

  useEffect(() => {
    if (notices.length <= 1 || isPaused) return;

    timerRef.current = setInterval(() => {
      setFadeState('fadeOut');
      setTimeout(() => {
        setCurrentIdx((prev) => (prev + 1) % notices.length);
        setFadeState('fadeIn');
      }, 250);
    }, 4500);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [notices.length, isPaused]);

  if (!notices || notices.length === 0) return null;

  const currentNotice = notices[currentIdx] || notices[0];

  const handleNext = () => {
    setFadeState('fadeOut');
    setTimeout(() => {
      setCurrentIdx((prev) => (prev + 1) % notices.length);
      setFadeState('fadeIn');
    }, 150);
  };

  const handlePrev = () => {
    setFadeState('fadeOut');
    setTimeout(() => {
      setCurrentIdx((prev) => (prev - 1 + notices.length) % notices.length);
      setFadeState('fadeIn');
    }, 150);
  };

  const handleSelectDot = (idx: number) => {
    if (idx === currentIdx) return;
    setFadeState('fadeOut');
    setTimeout(() => {
      setCurrentIdx(idx);
      setFadeState('fadeIn');
    }, 150);
  };

  const formatNoticeTimeRange = (n: NoticeItem) => {
    if (!n.start_time && !n.end_time) return null;
    const startStr = n.start_time ? new Date(n.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
    const endStr = n.end_time ? new Date(n.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
    const dur = n.approx_duration ? `(Approx: ${n.approx_duration})` : '';

    if (startStr && endStr) return `${startStr} – ${endStr} ${dur}`.trim();
    if (startStr) return `Starting at ${startStr} ${dur}`.trim();
    return `Ends at ${endStr} ${dur}`.trim();
  };

  const timeRange = formatNoticeTimeRange(currentNotice);

  return (
    <div
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      style={{
        background: currentNotice.is_important ? '#fffbf5' : 'var(--surface)',
        border: currentNotice.is_important ? '1px solid rgba(184, 58, 50, 0.3)' : '1px solid var(--line)',
        borderLeft: currentNotice.is_important ? '4px solid var(--red)' : '4px solid var(--blue)',
        borderRadius: '6px',
        padding: '1rem 1.25rem',
        marginBottom: '1.75rem',
        boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
        transition: 'all 0.3s ease',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.68rem',
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: currentNotice.is_important ? 'var(--red)' : 'var(--blue)',
              background: currentNotice.is_important ? 'rgba(184, 58, 50, 0.1)' : 'rgba(30, 79, 120, 0.08)',
              padding: '0.15rem 0.5rem',
              borderRadius: '3px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
            }}
          >
            {currentNotice.is_important && (
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--red)', display: 'inline-block' }}></span>
            )}
            {currentNotice.is_important ? 'IMPORTANT BROADCAST' : 'SOCIETY ANNOUNCEMENT'}
          </span>

          {currentNotice.status === 'EXPIRED' && (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: '#991b1b', background: '#fee2e2', padding: '0.15rem 0.45rem', borderRadius: '3px', fontWeight: 700 }}>
              EXPIRED NOTICE
            </span>
          )}

          {timeRange && (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.74rem', color: 'var(--muted)', background: 'rgba(0,0,0,0.04)', padding: '0.15rem 0.5rem', borderRadius: '3px' }}>
              {timeRange}
            </span>
          )}

          {notices.length > 1 && (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--muted)', fontWeight: 600 }}>
              {currentIdx + 1} of {notices.length}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {notices.length > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <button
                type="button"
                onClick={handlePrev}
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--line)',
                  borderRadius: '4px',
                  width: '24px',
                  height: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: 'var(--ink)',
                  padding: 0,
                }}
                aria-label="Previous notice"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6"></polyline>
                </svg>
              </button>
              <button
                type="button"
                onClick={handleNext}
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--line)',
                  borderRadius: '4px',
                  width: '24px',
                  height: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: 'var(--ink)',
                  padding: 0,
                }}
                aria-label="Next notice"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
              </button>
            </div>
          )}

          {onNavigateToNotices && (
            <button
              type="button"
              className="text-button"
              onClick={onNavigateToNotices}
              style={{ fontSize: '0.78rem', color: 'var(--blue)', fontWeight: 600, padding: '0.2rem 0.4rem' }}
            >
              All Notices →
            </button>
          )}
        </div>
      </div>

      <div
        style={{
          opacity: fadeState === 'fadeIn' ? 1 : 0.2,
          transform: fadeState === 'fadeIn' ? 'translateY(0)' : 'translateY(-3px)',
          transition: 'opacity 0.25s ease, transform 0.25s ease',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '220px' }}>
            <h3 style={{ margin: '0 0 0.35rem 0', fontSize: '1.02rem', color: 'var(--ink)', fontWeight: 700 }}>
              {currentNotice.title}
            </h3>
            <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--ink)', lineHeight: 1.55 }}>
              {currentNotice.content}
            </p>
          </div>

          {onAcknowledge && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
              {currentNotice.is_read ? (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    color: 'var(--green)',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    background: 'rgba(47, 107, 79, 0.08)',
                    padding: '0.35rem 0.65rem',
                    borderRadius: '4px',
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                  Acknowledged
                </span>
              ) : (
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => onAcknowledge(currentNotice.id)}
                  style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6 9 17l-5-5"></path>
                  </svg>
                  Mark Acknowledged
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {notices.length > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', marginTop: '0.75rem', paddingTop: '0.5rem', borderTop: '1px solid rgba(0,0,0,0.05)' }}>
          {notices.map((n, idx) => (
            <button
              key={n.id || idx}
              type="button"
              onClick={() => handleSelectDot(idx)}
              style={{
                width: idx === currentIdx ? '16px' : '6px',
                height: '6px',
                borderRadius: '3px',
                border: 'none',
                background: idx === currentIdx ? (currentNotice.is_important ? 'var(--red)' : 'var(--blue)') : 'var(--line)',
                cursor: 'pointer',
                transition: 'all 0.25s ease',
                padding: 0,
              }}
              aria-label={`Go to notice ${idx + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};
