import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { StatusBadge } from '../components/StatusBadge';
import { RecurrenceAlert } from '../components/RecurrenceAlert';
import { ComplaintDetailModal } from './ComplaintDetailModal';
import { AddAdminModal } from './AddAdminModal';
import { CustomSelect, SelectOption } from '../components/CustomSelect';
import { NoticeBanner } from '../components/NoticeBanner';

interface AdminDashboardProps {
  activeTab?: 'dashboard' | 'complaints' | 'residents' | 'notices';
  onNavigateTab?: (tab: 'dashboard' | 'complaints' | 'residents' | 'notices') => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ activeTab = 'dashboard', onNavigateTab }) => {
  const { token } = useAuth();
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [complaints, setComplaints] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [residents, setResidents] = useState<any[]>([]);
  const [notices, setNotices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<string>('ACTIVE');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [overdueOnly, setOverdueOnly] = useState<boolean>(false);

  const [selectedComplaintId, setSelectedComplaintId] = useState<string | null>(null);
  const [showAddAdminModal, setShowAddAdminModal] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<{
    url: string;
    residentName: string;
    flatNumber: string;
    docType: string;
    residentId: string;
  } | null>(null);

  const loadData = async (silent = false) => {
    try {
      if (!silent && initialLoading) setLoading(true);

      const [dashRes, compRes, catRes, resRes, notRes] = await Promise.all([
        fetch('/api/analytics/dashboard', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('/api/complaints?limit=100', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('/api/categories', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('/api/auth/residents', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('/api/notices', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const dashJson = await dashRes.json();
      const compJson = await compRes.json();
      const catJson = await catRes.json();
      const resJson = await resRes.json();
      const notJson = await notRes.json();

      if (dashRes.ok) setDashboardData(dashJson);
      if (compRes.ok) setComplaints(compJson.data || []);
      if (catRes.ok) setCategories(catJson.categories || []);
      if (resRes.ok) setResidents(resJson.residents || []);
      if (notRes.ok) setNotices(notJson.notices || []);
    } catch (e) {
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  };

  useEffect(() => {
    loadData(false);
    const timer = setInterval(() => {
      loadData(true);
    }, 3000);

    const handleVerified = () => {
      loadData(true);
    };
    window.addEventListener('orqen-resident-verified', handleVerified);

    return () => {
      clearInterval(timer);
      window.removeEventListener('orqen-resident-verified', handleVerified);
    };
  }, [token]);

  const handleVerifyResident = async (residentId: string) => {
    try {
      setVerifyingId(residentId);
      const res = await fetch(`/api/auth/residents/${residentId}/verify`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        await loadData(true);
      }
    } catch (e) {
    } finally {
      setVerifyingId(null);
    }
  };

  const handleRejectResident = async (residentId: string) => {
    try {
      setRejectingId(residentId);
      const res = await fetch(`/api/auth/residents/${residentId}/reject`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reason: 'Verification details mismatch or missing documentation.' }),
      });
      if (res.ok) {
        setResidents((prev) => prev.filter((r) => r.id !== residentId));
        await loadData(true);
      }
    } catch (e) {
    } finally {
      setRejectingId(null);
    }
  };

  const pendingResidents = residents.filter((r) => r.is_verified === false);

  const filteredComplaints = complaints.filter((c) => {
    if (statusFilter === 'ACTIVE' && c.current_status === 'RESOLVED') return false;
    if (statusFilter !== 'ALL' && statusFilter !== 'ACTIVE' && c.current_status !== statusFilter) return false;
    if (categoryFilter !== 'ALL' && c.category_id !== categoryFilter) return false;
    if (priorityFilter !== 'ALL' && c.priority !== priorityFilter) return false;
    if (overdueOnly && (!c.is_overdue || c.current_status === 'RESOLVED')) return false;
    return true;
  });

  const getCategoryCount = (catName: string) => {
    if (!dashboardData || !dashboardData.category_breakdown) return 0;
    return dashboardData.category_breakdown[catName] || 0;
  };

  const getMaxCategoryCount = () => {
    if (!dashboardData || !dashboardData.category_breakdown) return 1;
    const values = Object.values(dashboardData.category_breakdown) as number[];
    return Math.max(...values, 1);
  };

  const getCategoryColor = (catName: string) => {
    const lower = catName.toLowerCase();
    if (lower.includes('plumb')) return '#0284c7';
    if (lower.includes('electr')) return '#d97706';
    if (lower.includes('clean')) return '#16a34a';
    if (lower.includes('paint')) return '#8b5cf6';
    if (lower.includes('secur')) return '#475569';
    if (lower.includes('civil')) return '#ea580c';
    return '#1e4f78';
  };

  const statusFilterOptions: SelectOption[] = [
    { value: 'ACTIVE', label: 'Pending & Active (Incomplete & Overdue)', sublabel: 'Open & In Progress' },
    { value: 'OPEN', label: 'Open Only', sublabel: 'Awaiting triage' },
    { value: 'IN_PROGRESS', label: 'In Progress Only', sublabel: 'Work in progress' },
    { value: 'RESOLVED', label: 'Completed / Resolved', sublabel: 'Historical closed tickets' },
    { value: 'ALL', label: 'All Records', sublabel: 'Including completed' },
  ];

  const categoryFilterOptions: SelectOption[] = [
    { value: 'ALL', label: 'All Categories' },
    ...categories.map((c) => ({ value: c.id, label: c.name })),
  ];

  const priorityFilterOptions: SelectOption[] = [
    { value: 'ALL', label: 'All Priorities' },
    { value: 'HIGH', label: 'High Priority' },
    { value: 'MEDIUM', label: 'Medium Priority' },
    { value: 'LOW', label: 'Low Priority' },
  ];

  const isOnlyComplaintsView = activeTab === 'complaints';

  return (
    <div>
      {!isOnlyComplaintsView && (
        <>
          <div className="page-header">
            <div>
              <p className="eyebrow">ADMIN DESK / CONTROL ROOM</p>
              <h1>The building, at a glance</h1>
              <p className="page-description">
                Spot exceptions early, then open the record behind the number.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <button
                className="button primary"
                onClick={() => setShowAddAdminModal(true)}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                  <line x1="19" y1="8" x2="19" y2="14"></line>
                  <line x1="22" y1="11" x2="16" y2="11"></line>
                </svg>
                + Add Committee Member
              </button>
              {onNavigateTab && (
                <button
                  className="button secondary"
                  data-testid="admin-complaints-button"
                  onClick={() => onNavigateTab('complaints')}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="8" height="4" x="8" y="2" rx="1" ry="1"></rect>
                    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
                    <path d="M12 11h4"></path>
                    <path d="M12 16h4"></path>
                    <path d="M8 11h.01"></path>
                    <path d="M8 16h.01"></path>
                  </svg>
                  Review queue
                </button>
              )}
            </div>
          </div>

          <NoticeBanner
            notices={notices}
            onNavigateToNotices={() => onNavigateTab && onNavigateTab('notices')}
          />

          {pendingResidents.length > 0 && (
            <div style={{
              background: 'var(--surface)',
              border: '1px solid rgba(169, 104, 22, 0.35)',
              borderLeft: '4px solid var(--amber)',
              borderRadius: '6px',
              padding: '1.1rem 1.35rem',
              marginBottom: '2rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1rem',
              boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(169, 104, 22, 0.1)', color: 'var(--amber)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                    <circle cx="9" cy="7" r="4"></circle>
                    <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                  </svg>
                </div>
                <div>
                  <div style={{ fontSize: '0.96rem', fontWeight: 700, color: 'var(--ink)' }}>
                    {pendingResidents.length} Resident {pendingResidents.length === 1 ? 'Verification Request' : 'Verification Requests'} Pending
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--muted)', marginTop: '0.15rem' }}>
                    New resident signups with identity & address proofs awaiting committee verification.
                  </div>
                </div>
              </div>

              {onNavigateTab && (
                <button
                  type="button"
                  className="button primary"
                  onClick={() => onNavigateTab('residents')}
                  style={{ background: 'var(--amber)', borderColor: 'var(--amber)', color: '#ffffff', padding: '0.45rem 1rem', fontSize: '0.84rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  <span>Review in Resident Directory</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6"></polyline>
                  </svg>
                </button>
              )}
            </div>
          )}

          <div className="kpi-grid">
            <div
              className="kpi total"
              data-testid="dashboard-kpi-total"
              style={{ cursor: 'pointer' }}
              onClick={() => {
                setStatusFilter('ALL');
                setOverdueOnly(false);
              }}
            >
              <span>Total records</span>
              <strong>{dashboardData?.summary?.total ?? 0}</strong>
              <small>all records</small>
            </div>
            <div
              className="kpi open"
              data-testid="dashboard-kpi-open"
              style={{ cursor: 'pointer' }}
              onClick={() => {
                setStatusFilter('OPEN');
                setOverdueOnly(false);
              }}
            >
              <span>Open</span>
              <strong style={{ color: 'var(--blue)' }}>{dashboardData?.summary?.open ?? 0}</strong>
              <small>awaiting triage</small>
            </div>
            <div
              className="kpi in-progress"
              data-testid="dashboard-kpi-in-progress"
              style={{ cursor: 'pointer' }}
              onClick={() => {
                setStatusFilter('IN_PROGRESS');
                setOverdueOnly(false);
              }}
            >
              <span>In progress</span>
              <strong style={{ color: 'var(--amber)' }}>{dashboardData?.summary?.in_progress ?? 0}</strong>
              <small>under repair</small>
            </div>
            <div
              className="kpi overdue"
              data-testid="dashboard-kpi-overdue"
              style={{ cursor: 'pointer' }}
              onClick={() => {
                setStatusFilter('ACTIVE');
                setOverdueOnly(true);
              }}
            >
              <span>Overdue</span>
              <strong style={{ color: 'var(--red)' }}>{dashboardData?.summary?.overdue ?? 0}</strong>
              <small>needs action</small>
            </div>
            <div
              className="kpi resolved"
              data-testid="dashboard-kpi-resolved"
              style={{ cursor: 'pointer' }}
              onClick={() => {
                setStatusFilter('RESOLVED');
                setOverdueOnly(false);
              }}
            >
              <span>Completed</span>
              <strong style={{ color: 'var(--green)' }}>{dashboardData?.summary?.resolved ?? 0}</strong>
              <small>resolved tickets</small>
            </div>
          </div>

          <div className="dashboard-grid">
            <section className="data-panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">BY CATEGORY</p>
                  <h2>
                    {(dashboardData?.summary?.open ?? 0) + (dashboardData?.summary?.in_progress ?? 0)} active across categories
                  </h2>
                </div>
              </div>
              <p style={{ marginTop: '0.75rem' }}>
                Distribution of maintenance requests currently active across society facilities.
              </p>

              <div className="bar-breakdown" style={{ marginTop: '1.5rem' }}>
                {categories.map((cat) => {
                  const count = getCategoryCount(cat.name);
                  const max = getMaxCategoryCount();
                  const pct = Math.round((count / max) * 100);
                  return (
                    <div key={cat.id} className="bar-row">
                      <span className="cat-name" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, fontSize: '0.86rem' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: getCategoryColor(cat.name), display: 'inline-block', flexShrink: 0 }}></span>
                        <span>{cat.name}</span>
                      </span>
                      <div className="bar-track">
                        <div className="bar-fill" style={{ width: `${pct}%`, background: getCategoryColor(cat.name), height: '100%', borderRadius: '4px', transition: 'width 0.4s ease' }}></div>
                      </div>
                      <span className="cat-count" style={{ textAlign: 'right', fontWeight: 700, fontSize: '0.86rem', color: 'var(--ink)', whiteSpace: 'nowrap' }}>
                        {count} <span style={{ fontWeight: 400, fontSize: '0.74rem', color: 'var(--muted)' }}>active</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="data-panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">RECURRENCE INTELLIGENCE</p>
                  <h2>
                    {dashboardData?.recurrence_alerts?.length ?? 0} repeat issue pattern
                    <span>{dashboardData?.recurrence_alerts?.length === 1 ? '' : 's'}</span>
                  </h2>
                </div>
              </div>
              <p style={{ marginTop: '0.75rem' }}>
                Three or more reports at the same location and category in the last 30 days.
              </p>

              {onNavigateTab && (
                <button
                  className="text-button"
                  data-testid="recurrence-review-link"
                  style={{ marginTop: '1.2rem', display: 'inline-block' }}
                  onClick={() => onNavigateTab('complaints')}
                >
                  Review records →
                </button>
              )}

              {dashboardData?.recurrence_alerts && dashboardData.recurrence_alerts.length > 0 && (
                <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {dashboardData.recurrence_alerts.map((alert: any, idx: number) => (
                    <RecurrenceAlert
                      key={idx}
                      flatNumber={alert.flat_number}
                      categoryName={alert.category_name}
                      count={alert.recent_complaints_count}
                    />
                  ))}
                </div>
              )}
            </section>
          </div>
        </>
      )}

      <div style={{ marginTop: isOnlyComplaintsView ? '0' : '4rem' }}>
        <div className="section-heading">
          <div>
            <p className="eyebrow">MAINTENANCE QUEUE</p>
            <h2>{isOnlyComplaintsView ? 'All Maintenance Records' : 'Recent Complaints'}</h2>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
            <div style={{ minWidth: '220px', flex: '1 1 auto' }}>
              <CustomSelect
                options={statusFilterOptions}
                value={statusFilter}
                onChange={setStatusFilter}
              />
            </div>

            <div style={{ minWidth: '180px', flex: '1 1 auto' }}>
              <CustomSelect
                options={categoryFilterOptions}
                value={categoryFilter}
                onChange={setCategoryFilter}
              />
            </div>

            <div style={{ minWidth: '170px', flex: '1 1 auto' }}>
              <CustomSelect
                options={priorityFilterOptions}
                value={priorityFilter}
                onChange={setPriorityFilter}
              />
            </div>

            <label className="checkbox-filter-pill" style={{ height: '44px', flexShrink: 0 }}>
              <input
                type="checkbox"
                checked={overdueOnly}
                onChange={(e) => setOverdueOnly(e.target.checked)}
              />
              <span>Overdue only</span>
            </label>
          </div>
        </div>

        {loading ? (
          <div className="loading-state">Loading complaints...</div>
        ) : filteredComplaints.length === 0 ? (
          <div className="empty-state">No complaints matching the selected filter criteria.</div>
        ) : (
          <div className="complaint-cards-grid">
            {filteredComplaints.map((item) => (
              <div
                key={item.id}
                className={`complaint-card ${item.is_overdue && item.current_status !== 'RESOLVED' ? 'overdue-card' : ''}`}
                data-testid={`complaint-card-${item.id}`}
                onClick={() => setSelectedComplaintId(item.id)}
              >
                <div className="card-top-row">
                  <div className="badge-group">
                    <span className="flat-badge">Flat {item.flat_number}</span>
                    <span className="category-tag">{item.category_name}</span>
                    <span className={`priority-tag ${item.priority.toLowerCase()}`}>
                      {item.priority}
                    </span>
                  </div>
                  <StatusBadge status={item.current_status} isOverdue={item.is_overdue} />
                </div>

                <h3 className="card-description">
                  {item.description}
                </h3>

                <div className="card-bottom-row">
                  <div className="timestamp-info">
                    <span>Created {new Date(item.created_at).toLocaleDateString()}</span>
                    <span className="bullet-sep">•</span>
                    <span style={{ color: item.is_overdue && item.current_status !== 'RESOLVED' ? 'var(--red)' : 'inherit' }}>
                      Due: {new Date(item.due_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <span className="card-action-link">View Record →</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedComplaintId && (
        <ComplaintDetailModal
          complaintId={selectedComplaintId}
          onClose={() => setSelectedComplaintId(null)}
          onRefresh={() => loadData(true)}
        />
      )}

      {showAddAdminModal && (
        <AddAdminModal
          onClose={() => setShowAddAdminModal(false)}
          onSuccess={() => {
            setShowAddAdminModal(false);
            loadData(true);
          }}
        />
      )}

      {previewDoc && (
        <div className="modal-backdrop" onClick={() => setPreviewDoc(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '680px' }}>
            <div className="modal-header">
              <div>
                <p className="eyebrow">RESIDENCE VERIFICATION DOCUMENT</p>
                <h2>{previewDoc.residentName} (Flat {previewDoc.flatNumber})</h2>
                <p style={{ fontSize: '0.82rem', color: 'var(--muted)', marginTop: '0.2rem' }}>
                  Document Type: <strong style={{ color: 'var(--ink)' }}>{previewDoc.docType.replace(/_/g, ' ')}</strong>
                </p>
              </div>
              <button className="modal-close-btn" onClick={() => setPreviewDoc(null)} aria-label="Close">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
                <span>Close</span>
              </button>
            </div>

            <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '6px', padding: '1rem', textAlign: 'center', marginBottom: '1.25rem' }}>
              {previewDoc.url.toLowerCase().endsWith('.pdf') ? (
                <iframe
                  src={previewDoc.url}
                  title="Verification Document PDF"
                  style={{ width: '100%', height: '55vh', border: '1px solid var(--line)', borderRadius: '4px' }}
                />
              ) : (
                <img
                  src={previewDoc.url}
                  alt="Document Verification Proof"
                  style={{ maxWidth: '100%', maxHeight: '420px', borderRadius: '4px', objectFit: 'contain', border: '1px solid var(--line)' }}
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              )}
              <div style={{ marginTop: '0.75rem', fontSize: '0.82rem', color: 'var(--muted)' }}>
                <span>Official government identification / residency agreement on file.</span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                className="button secondary"
                onClick={() => setPreviewDoc(null)}
              >
                Close Preview
              </button>
              <button
                type="button"
                className="button secondary"
                style={{ color: 'var(--red)', borderColor: 'rgba(184, 58, 50, 0.35)' }}
                disabled={rejectingId === previewDoc.residentId || verifyingId === previewDoc.residentId}
                onClick={async () => {
                  await handleRejectResident(previewDoc.residentId);
                  setPreviewDoc(null);
                }}
              >
                {rejectingId === previewDoc.residentId ? 'Declining...' : 'Decline Request'}
              </button>
              <button
                type="button"
                className="button primary"
                disabled={verifyingId === previewDoc.residentId || rejectingId === previewDoc.residentId}
                onClick={async () => {
                  await handleVerifyResident(previewDoc.residentId);
                  setPreviewDoc(null);
                }}
              >
                {verifyingId === previewDoc.residentId ? 'Approving...' : 'Approve Flat Registration'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
