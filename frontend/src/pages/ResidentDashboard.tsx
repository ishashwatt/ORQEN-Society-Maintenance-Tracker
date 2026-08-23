import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { StatusBadge } from '../components/StatusBadge';
import { CreateComplaintModal } from './CreateComplaintModal';
import { ComplaintDetailModal } from './ComplaintDetailModal';
import { NoticeBanner } from '../components/NoticeBanner';

interface ResidentDashboardProps {
  activeTab?: 'dashboard' | 'complaints' | 'residents' | 'notices';
  onNavigateTab?: (tab: 'dashboard' | 'complaints' | 'residents' | 'notices') => void;
}

export const ResidentDashboard: React.FC<ResidentDashboardProps> = ({ activeTab = 'dashboard', onNavigateTab }) => {
  const { token, user, refreshUser } = useAuth();
  const [complaints, setComplaints] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [notices, setNotices] = useState<any[]>([]);
  const [activeNoticeIdx, setActiveNoticeIdx] = useState(0);
  const [dismissedUnreadAlert, setDismissedUnreadAlert] = useState(false);
  const [loading, setLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [preselectedCategoryId, setPreselectedCategoryId] = useState<string | undefined>(undefined);
  const [selectedComplaintId, setSelectedComplaintId] = useState<string | null>(null);

  const isUnverified = user?.is_verified === false;

  const fetchDashboardData = async (silent = false) => {
    try {
      if (!silent && initialLoading) {
        setLoading(true);
      }
      const [complaintsRes, categoriesRes, noticesRes] = await Promise.all([
        fetch('/api/complaints?limit=50', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/categories', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/notices', { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      const complaintsData = await complaintsRes.json();
      const categoriesData = await categoriesRes.json();
      const noticesData = await noticesRes.json();

      if (complaintsRes.ok) setComplaints(complaintsData.data || []);
      if (categoriesRes.ok) setCategories(categoriesData.categories || []);
      if (noticesRes.ok && noticesData.notices) {
        setNotices(noticesData.notices);
      }
    } catch (e) {
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData(false);
    const interval = setInterval(() => {
      fetchDashboardData(true);
    }, 4000);
    return () => clearInterval(interval);
  }, [token, user?.is_verified]);

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

  const getRemainingApproxTime = (endTimeStr: string | null) => {
    if (!endTimeStr) return null;
    const end = new Date(endTimeStr).getTime();
    const now = Date.now();
    const diffMs = end - now;
    if (diffMs <= 0) return 'Approx. Schedule Concluded';
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

  const handleCheckVerification = async () => {
    setCheckingStatus(true);
    await refreshUser();
    await fetchDashboardData();
    setTimeout(() => {
      setCheckingStatus(false);
    }, 600);
  };

  const handleActionClick = (categoryId?: string) => {
    if (isUnverified) {
      setShowVerificationModal(true);
      return;
    }
    setPreselectedCategoryId(categoryId);
    setShowCreateModal(true);
  };

  const handleQuickCategoryClick = (categoryNameSubstring: string) => {
    if (isUnverified) {
      setShowVerificationModal(true);
      return;
    }
    const matched = categories.find((c) =>
      c.name.toLowerCase().includes(categoryNameSubstring.toLowerCase())
    );
    setPreselectedCategoryId(matched ? matched.id : undefined);
    setShowCreateModal(true);
  };

  const filtered = statusFilter === 'ALL'
    ? complaints
    : complaints.filter(c => c.current_status === statusFilter);

  const total = complaints.length;
  const openCount = complaints.filter(c => c.current_status === 'OPEN').length;
  const inProgressCount = complaints.filter(c => c.current_status === 'IN_PROGRESS').length;
  const resolvedCount = complaints.filter(c => c.current_status === 'RESOLVED').length;

  const activeSpotlight = complaints.find(c => c.current_status === 'IN_PROGRESS' || c.current_status === 'OPEN');

  const isOnlyComplaints = activeTab === 'complaints';

  const unreadNotices = notices.filter((n) => !n.is_read);
  const currentNotice = notices.length > 0 ? notices[activeNoticeIdx % notices.length] : null;

  return (
    <div className="resident-dashboard">
      {!isOnlyComplaints && unreadNotices.length > 0 && !dismissedUnreadAlert && (
        <div
          style={{
            background: '#fff1f2',
            border: '1px solid rgba(184, 58, 50, 0.3)',
            borderLeft: '5px solid var(--red)',
            padding: '0.85rem 1.25rem',
            borderRadius: '6px',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: 'var(--red)', display: 'inline-block' }}></span>
            <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--ink)' }}>
              Important notice has arrived. Kindly check.
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--muted)', background: 'rgba(184, 58, 50, 0.1)', padding: '0.15rem 0.45rem', borderRadius: '4px', fontWeight: 600 }}>
              {unreadNotices.length} Unread {unreadNotices.length === 1 ? 'Announcement' : 'Announcements'}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              type="button"
              className="button secondary"
              onClick={() => {
                const unreadIdx = notices.findIndex((n) => !n.is_read);
                if (unreadIdx !== -1) setActiveNoticeIdx(unreadIdx);
                setDismissedUnreadAlert(true);
              }}
              style={{ padding: '0.3rem 0.65rem', fontSize: '0.78rem' }}
            >
              Review Announcement
            </button>
            <button
              type="button"
              onClick={() => setDismissedUnreadAlert(true)}
              style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: '0.2rem' }}
              aria-label="Dismiss alert"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        </div>
      )}

      {!isOnlyComplaints && (
        <NoticeBanner
          notices={notices}
          onAcknowledge={handleMarkNoticeRead}
          onNavigateToNotices={() => onNavigateTab && onNavigateTab('notices')}
        />
      )}

      {isUnverified && (
        <div
          style={{
            background: 'var(--surface)',
            border: '1px solid rgba(169, 104, 22, 0.35)',
            borderLeft: '5px solid var(--amber)',
            padding: '1.35rem 1.5rem',
            borderRadius: '6px',
            marginBottom: '1.75rem',
            boxShadow: '0 4px 16px rgba(169, 104, 22, 0.06)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', gap: '0.85rem', alignItems: 'flex-start' }}>
              <div style={{ background: '#fef3c7', padding: '0.5rem', borderRadius: '6px', color: '#b45309', display: 'grid', placeItems: 'center' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                </svg>
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
                  <strong style={{ color: 'var(--ink)', fontSize: '1.05rem' }}>
                    Flat Registration Pending Committee Verification
                  </strong>
                  <span
                    style={{
                      background: 'rgba(169, 104, 22, 0.12)',
                      color: 'var(--amber)',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      padding: '0.2rem 0.55rem',
                      borderRadius: '4px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}
                  >
                    Action Restricted
                  </span>
                </div>
                <p style={{ margin: '0.35rem 0 0', fontSize: '0.86rem', color: 'var(--muted)', lineHeight: 1.5, maxWidth: '780px' }}>
                  Your resident account for Flat <strong>{user?.flat_number}</strong> is queued for approval by the Society Management Committee. Issue reporting and maintenance desk privileges will unlock once an administrator approves your flat.
                </p>
              </div>
            </div>

            <button
              type="button"
              className="button secondary"
              onClick={handleCheckVerification}
              disabled={checkingStatus}
              style={{ fontSize: '0.8rem', padding: '0.45rem 0.85rem', whiteSpace: 'nowrap' }}
            >
              {checkingStatus ? 'Checking Status...' : 'Check Approval Status'}
            </button>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '0.75rem',
              paddingTop: '0.85rem',
              borderTop: '1px solid var(--line)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--green)' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              <span>1. Email OTP Verified</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--amber)', fontWeight: 600 }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--amber)', display: 'inline-block' }}></span>
              <span>2. Committee Review (Active)</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--muted)' }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
              <span>3. Full Ticket Privileges (Locked)</span>
            </div>
          </div>
        </div>
      )}

      {!isOnlyComplaints && (
        <>
          <div className="page-header">
            <div>
              <p className="eyebrow">
                RESIDENT OPERATIONS {user?.flat_number ? `/ FLAT ${user.flat_number}` : ''}
              </p>
              <h1>Your maintenance desk</h1>
              <p className="page-description">
                Report issues, follow real-time resolution timelines, and keep your home running smoothly.
              </p>
            </div>

            <button
              className="button primary"
              onClick={() => handleActionClick()}
              style={isUnverified ? { background: 'var(--muted)', borderColor: 'var(--muted)', cursor: 'pointer' } : undefined}
            >
              {isUnverified ? (
                <>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '4px' }}>
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                  </svg>
                  + Report New Issue (Approval Needed)
                </>
              ) : (
                '+ Report New Issue'
              )}
            </button>
          </div>

          <div className="quick-actions-section">
            <div className="quick-actions-header">
              <span className="quick-title">QUICK 1-CLICK ISSUE REPORTING</span>
              <span className="quick-sub">
                {isUnverified ? 'Verification required to raise requests' : 'Click category to raise a request in 15 seconds'}
              </span>
            </div>

            <div className="quick-category-grid">
              <button
                type="button"
                className="quick-category-card"
                onClick={() => handleQuickCategoryClick('Plumbing')}
                style={isUnverified ? { opacity: 0.85 } : undefined}
              >
                <div className="quick-icon-wrap" style={{ background: '#e0f2fe', color: '#0369a1' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"></path>
                  </svg>
                </div>
                <div className="quick-text">
                  <strong>Water & Plumbing</strong>
                  <small>{isUnverified ? 'Approval needed' : 'Leaks, taps, drainage'}</small>
                </div>
              </button>

              <button
                type="button"
                className="quick-category-card"
                onClick={() => handleQuickCategoryClick('Electrical')}
                style={isUnverified ? { opacity: 0.85 } : undefined}
              >
                <div className="quick-icon-wrap" style={{ background: '#fef3c7', color: '#b45309' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
                  </svg>
                </div>
                <div className="quick-text">
                  <strong>Power & Electrical</strong>
                  <small>{isUnverified ? 'Approval needed' : 'Tripping, switches, power'}</small>
                </div>
              </button>

              <button
                type="button"
                className="quick-category-card"
                onClick={() => handleQuickCategoryClick('Cleaning')}
                style={isUnverified ? { opacity: 0.85 } : undefined}
              >
                <div className="quick-icon-wrap" style={{ background: '#dcfce7', color: '#15803d' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m15 11-1 9"></path>
                    <path d="m19 11-4-7-4 7"></path>
                    <path d="M2 21h20"></path>
                    <path d="m7 11 1 9"></path>
                  </svg>
                </div>
                <div className="quick-text">
                  <strong>Cleaning & Waste</strong>
                  <small>{isUnverified ? 'Approval needed' : 'Corridors, garbage, wash'}</small>
                </div>
              </button>

              <button
                type="button"
                className="quick-category-card"
                onClick={() => handleQuickCategoryClick('Security')}
                style={isUnverified ? { opacity: 0.85 } : undefined}
              >
                <div className="quick-icon-wrap" style={{ background: '#ede9fe', color: '#6d28d9' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="18" height="11" x="3" y="11" rx="2" ry="2"></rect>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                  </svg>
                </div>
                <div className="quick-text">
                  <strong>Security & Access</strong>
                  <small>{isUnverified ? 'Approval needed' : 'Gates, parking, intercom'}</small>
                </div>
              </button>

              <button
                type="button"
                className="quick-category-card"
                onClick={() => handleQuickCategoryClick('Painting')}
                style={isUnverified ? { opacity: 0.85 } : undefined}
              >
                <div className="quick-icon-wrap" style={{ background: '#ffedd5', color: '#c2410c' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m14 12-8.5 8.5a2.12 2.12 0 1 1-3-3L11 9"></path>
                    <path d="M12.5 7.5 16.5 3.5a2.12 2.12 0 1 1 3 3L15.5 10.5"></path>
                  </svg>
                </div>
                <div className="quick-text">
                  <strong>Civil & Painting</strong>
                  <small>{isUnverified ? 'Approval needed' : 'Seepage, cracks, paint'}</small>
                </div>
              </button>
            </div>
          </div>

          {activeSpotlight && (
            <div className="active-ticket-banner" onClick={() => setSelectedComplaintId(activeSpotlight.id)}>
              <div className="ticket-banner-left">
                <span className="live-dot-pulse"></span>
                <div>
                  <div className="ticket-banner-meta">
                    <strong>ACTIVE ISSUE IN PROGRESS</strong>
                    <span className="ticket-id-tag">#{activeSpotlight.id.substring(0, 8)}</span>
                    <span className="ticket-flat-tag">Flat {activeSpotlight.flat_number}</span>
                  </div>
                  <p className="ticket-banner-desc">{activeSpotlight.description}</p>
                </div>
              </div>
              <div className="ticket-banner-right">
                <StatusBadge status={activeSpotlight.current_status} isOverdue={activeSpotlight.is_overdue} />
                <span className="view-detail-link">View timeline & updates &rarr;</span>
              </div>
            </div>
          )}

          <div className="kpi-grid">
            <div className="kpi total">
              <span>Total reports</span>
              <strong>{total}</strong>
              <small>active records</small>
            </div>
            <div className="kpi open">
              <span>Open</span>
              <strong style={{ color: 'var(--blue)' }}>{openCount}</strong>
              <small>active records</small>
            </div>
            <div className="kpi in-progress">
              <span>In progress</span>
              <strong style={{ color: 'var(--amber)' }}>{inProgressCount}</strong>
              <small>active records</small>
            </div>
            <div className="kpi overdue">
              <span>Resolved</span>
              <strong style={{ color: 'var(--green)' }}>{resolvedCount}</strong>
              <small>completed</small>
            </div>
          </div>
        </>
      )}

      <div>
        <div className="section-heading">
          <div>
            <p className="eyebrow">HISTORY</p>
            <h2>{isOnlyComplaints ? 'All Your Complaints' : 'Report History'}</h2>
          </div>

          <div className="filter-group">
            <button
              className={statusFilter === 'ALL' ? 'active' : ''}
              onClick={() => setStatusFilter('ALL')}
            >
              All
            </button>
            <button
              className={statusFilter === 'OPEN' ? 'active' : ''}
              onClick={() => setStatusFilter('OPEN')}
            >
              Open
            </button>
            <button
              className={statusFilter === 'IN_PROGRESS' ? 'active' : ''}
              onClick={() => setStatusFilter('IN_PROGRESS')}
            >
              In Progress
            </button>
            <button
              className={statusFilter === 'RESOLVED' ? 'active' : ''}
              onClick={() => setStatusFilter('RESOLVED')}
            >
              Resolved
            </button>
          </div>
        </div>

        {loading ? (
          <div className="loading-state">Loading complaints...</div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--muted)', margin: '0 auto 0.75rem' }}>
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <p>No complaints found matching this filter.</p>
            <button
              className="button secondary"
              style={{ marginTop: '0.75rem' }}
              onClick={() => handleActionClick()}
            >
              {isUnverified ? 'Verification Required to Raise Issue' : '+ Raise your first issue'}
            </button>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Description</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Raised Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => setSelectedComplaintId(item.id)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td>
                      <span className="category-tag">{item.category_name || 'General'}</span>
                    </td>
                    <td>
                      <div className="complaint-desc-cell">
                        <span className="desc-text">{item.description}</span>
                        {item.photo_url && (
                          <span className="photo-indicator" title="Photo attached">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                              <circle cx="12" cy="13" r="4"></circle>
                            </svg>
                            Photo
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className={`priority-tag ${item.priority.toLowerCase()}`}>
                        {item.priority}
                      </span>
                    </td>
                    <td>
                      <StatusBadge status={item.current_status} isOverdue={item.is_overdue} />
                    </td>
                    <td>
                      <span className="date-cell">
                        {new Date(item.created_at).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </td>
                    <td>
                      <button
                        className="table-action-button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedComplaintId(item.id);
                        }}
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showCreateModal && (
        <CreateComplaintModal
          initialCategoryId={preselectedCategoryId}
          onClose={() => {
            setShowCreateModal(false);
            setPreselectedCategoryId(undefined);
          }}
          onSuccess={() => {
            setShowCreateModal(false);
            setPreselectedCategoryId(undefined);
            fetchDashboardData();
          }}
        />
      )}

      {selectedComplaintId && (
        <ComplaintDetailModal
          complaintId={selectedComplaintId}
          onClose={() => setSelectedComplaintId(null)}
          onRefresh={() => {
            fetchDashboardData();
          }}
        />
      )}

      {showVerificationModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1.25rem',
          }}
        >
          <div
            style={{
              background: 'var(--card-bg, #ffffff)',
              border: '1px solid var(--line)',
              borderRadius: '8px',
              padding: '1.75rem 2rem',
              maxWidth: '480px',
              width: '100%',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
              textAlign: 'left',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <div
                style={{
                  background: '#fef3c7',
                  color: '#b45309',
                  padding: '0.6rem',
                  borderRadius: '8px',
                  display: 'grid',
                  placeItems: 'center',
                }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                </svg>
              </div>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: 'var(--ink)' }}>
                  Committee Approval Required
                </h3>
                <span style={{ fontSize: '0.78rem', color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
                  FLAT {user?.flat_number || 'UNASSIGNED'} &bull; {user?.occupancy_type || 'RESIDENT'}
                </span>
              </div>
            </div>

            <p style={{ fontSize: '0.88rem', color: 'var(--ink)', lineHeight: 1.6, marginBottom: '1.25rem' }}>
              You cannot raise maintenance tickets or service requests yet because your flat account is awaiting administrative approval from the <strong>Society Management Committee</strong>.
            </p>

            <div
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--line)',
                borderRadius: '6px',
                padding: '0.85rem 1rem',
                fontSize: '0.82rem',
                color: 'var(--muted)',
                marginBottom: '1.5rem',
                lineHeight: 1.5,
              }}
            >
              Once an administrator verifies your submitted proof of residence, all resident privileges will be activated immediately.
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                className="button primary"
                onClick={() => setShowVerificationModal(false)}
                style={{ padding: '0.65rem 1.5rem', width: '100%' }}
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
