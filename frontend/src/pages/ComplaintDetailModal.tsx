import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { StatusBadge } from '../components/StatusBadge';
import { Timeline, HistoryItem } from '../components/Timeline';
import { RecurrenceAlert } from '../components/RecurrenceAlert';
import { CustomSelect, SelectOption } from '../components/CustomSelect';

interface ComplaintDetailModalProps {
  complaintId: string;
  onClose: () => void;
  onRefresh: () => void;
}

export const ComplaintDetailModal: React.FC<ComplaintDetailModalProps> = ({
  complaintId,
  onClose,
  onRefresh,
}) => {
  const { token, user } = useAuth();
  const [complaint, setComplaint] = useState<any>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newStatus, setNewStatus] = useState<string>('IN_PROGRESS');
  const [note, setNote] = useState('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  const [newPriority, setNewPriority] = useState<string>('MEDIUM');
  const [isUpdatingPriority, setIsUpdatingPriority] = useState(false);
  const [showPhotoLightbox, setShowPhotoLightbox] = useState(false);

  const getCleanPhotoUrl = (ref: string | null) => {
    if (!ref) return null;
    if (ref.startsWith('http')) return ref;
    const apiBase = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
    const clean = ref.replace(/^\/+/, '');
    const path = clean.startsWith('uploads/') ? `/${clean}` : `/uploads/${clean}`;
    return `${apiBase}${path}`;
  };

  const fetchDetails = async (isInitial = false) => {
    try {
      if (isInitial) setLoading(true);
      const [cRes, hRes] = await Promise.all([
        fetch(`/api/complaints/${complaintId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`/api/complaints/${complaintId}/history`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const cData = await cRes.json();
      const hData = await hRes.json();

      if (!cRes.ok) throw new Error(cData.error?.message || 'Failed to load details');

      setComplaint(cData.complaint);
      setNewPriority(cData.complaint.priority);
      if (cData.complaint.current_status === 'OPEN') setNewStatus('IN_PROGRESS');
      if (cData.complaint.current_status === 'IN_PROGRESS') setNewStatus('RESOLVED');

      if (hRes.ok) {
        setHistory(hData.history || []);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      if (isInitial) setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails(true);
  }, [complaintId]);

  const handleStatusUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusError(null);
    setIsUpdatingStatus(true);

    try {
      const res = await fetch(`/api/complaints/${complaintId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus, note }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Failed to update status');

      setNote('');
      await fetchDetails(false);
      onRefresh();
    } catch (err: any) {
      setStatusError(err.message);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handlePriorityUpdate = async (priorityValue: string) => {
    setIsUpdatingPriority(true);
    setNewPriority(priorityValue);
    setComplaint((prev: any) => prev ? ({ ...prev, priority: priorityValue }) : prev);
    try {
      const res = await fetch(`/api/complaints/${complaintId}/priority`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ priority: priorityValue }),
      });
      if (res.ok) {
        await fetchDetails(false);
        onRefresh();
      }
    } catch (e) {
    } finally {
      setIsUpdatingPriority(false);
    }
  };

  const statusOptions: SelectOption[] = complaint?.current_status === 'OPEN'
    ? [
        { value: 'IN_PROGRESS', label: 'Move to IN PROGRESS', sublabel: 'Technician dispatched' },
        { value: 'RESOLVED', label: 'Mark as RESOLVED', sublabel: 'Work completed' },
      ]
    : [
        { value: 'RESOLVED', label: 'Mark as RESOLVED', sublabel: 'Work completed' },
      ];

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '720px' }}>
        <div className="modal-header">
          <div>
            <p className="eyebrow">COMPLAINT RECORD</p>
            <h2>Record Timeline & Details</h2>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
            <span>Close</span>
          </button>
        </div>

        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--muted)' }}>Loading details...</div>
        ) : error ? (
          <div className="form-error">{error}</div>
        ) : complaint ? (
          <div>
            {complaint.recurrence_insight && complaint.recurrence_insight.is_recurring && (
              <RecurrenceAlert
                flatNumber={complaint.flat_number}
                categoryName={complaint.category_name}
                count={complaint.recurrence_insight.recent_complaints_count}
              />
            )}

            <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '6px', padding: '1.25rem', marginBottom: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span className="category-cell">
                  {complaint.category_name}
                </span>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <StatusBadge status={complaint.current_status} isOverdue={complaint.is_overdue} />
                  <span className={`priority-tag ${complaint.priority.toLowerCase()}`}>{complaint.priority} PRIORITY</span>
                </div>
              </div>

              <p style={{ fontSize: '1rem', color: 'var(--ink)', margin: '0.75rem 0 1.25rem 0', lineHeight: 1.6, fontWeight: 500 }}>
                {complaint.description}
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem', fontSize: '0.84rem', color: 'var(--muted)', borderTop: '1px solid var(--line)', paddingTop: '0.85rem' }}>
                <div>Flat Number: <strong style={{ color: 'var(--ink)' }}>{complaint.flat_number}</strong></div>
                <div>Submitted On: <strong style={{ color: 'var(--ink)' }}>{new Date(complaint.created_at).toLocaleDateString()}</strong></div>
                <div>SLA Target: <strong style={{ color: complaint.is_overdue ? 'var(--red)' : 'var(--green)' }}>{new Date(complaint.due_at).toLocaleString()}</strong></div>
                <div>Resolved On: <strong style={{ color: 'var(--ink)' }}>{complaint.resolved_at ? new Date(complaint.resolved_at).toLocaleString() : 'Pending'}</strong></div>
              </div>

              <div style={{ marginTop: '1rem', borderTop: '1px solid var(--line)', paddingTop: '0.85rem' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: '0.45rem' }}>
                  Attached Photo Evidence:
                </span>
                {(() => {
                  const photoUrl = getCleanPhotoUrl(complaint.photo_reference);
                  if (!photoUrl) {
                    return (
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', background: 'rgba(30, 79, 120, 0.04)', border: '1px solid var(--line)', borderRadius: '4px', padding: '0.45rem 0.85rem', fontSize: '0.82rem', color: 'var(--muted)' }}>
                        <span>Photo evidence not attached (Optional)</span>
                      </div>
                    );
                  }

                  const isPdf = photoUrl.toLowerCase().endsWith('.pdf');

                  return (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', background: 'rgba(0,0,0,0.02)', border: '1px solid var(--line)', borderRadius: '6px', padding: '0.75rem' }}>
                      <div
                        style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}
                        onClick={() => setShowPhotoLightbox(true)}
                      >
                        {isPdf ? (
                          <div style={{ width: '50px', height: '40px', background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5', borderRadius: '4px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                              <polyline points="14 2 14 8 20 8"></polyline>
                            </svg>
                            <span style={{ fontSize: '0.52rem', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>PDF</span>
                          </div>
                        ) : (
                          <img
                            src={photoUrl}
                            alt="Photo Attachment"
                            style={{ width: '56px', height: '42px', borderRadius: '4px', border: '1px solid var(--line)', objectFit: 'cover' }}
                          />
                        )}
                        <div>
                          <div style={{ fontSize: '0.84rem', color: 'var(--ink)', fontWeight: 600 }}>Supporting Evidence Attached</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>{isPdf ? 'PDF Document' : 'Image File'} &bull; Click to enlarge</div>
                        </div>
                      </div>

                      <button
                        type="button"
                        className="button secondary"
                        style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                        onClick={() => setShowPhotoLightbox(true)}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path>
                          <circle cx="12" cy="12" r="3"></circle>
                        </svg>
                        View Photo
                      </button>
                    </div>
                  );
                })()}
              </div>
            </div>

            {user?.role === 'ADMIN' && complaint.current_status !== 'RESOLVED' && (
              <div style={{ background: 'rgba(30, 79, 120, 0.04)', border: '1px solid rgba(30, 79, 120, 0.2)', borderRadius: '6px', padding: '1.25rem', marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '0.96rem', color: 'var(--blue)', marginBottom: '1rem' }}>Admin Maintenance Controls</h3>

                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '1.25rem' }}>
                  <span style={{ fontSize: '0.84rem', color: 'var(--muted)', fontWeight: 600 }}>Priority Level:</span>
                  {(['LOW', 'MEDIUM', 'HIGH'] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      disabled={isUpdatingPriority}
                      onClick={() => handlePriorityUpdate(p)}
                      className={`button ${newPriority === p ? 'primary' : 'secondary'}`}
                      style={{ padding: '0.35rem 0.75rem', fontSize: '0.76rem' }}
                    >
                      {p}
                    </button>
                  ))}
                </div>

                <form onSubmit={handleStatusUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  {statusError && (
                    <div className="form-error" style={{ marginBottom: '0.5rem' }}>{statusError}</div>
                  )}

                  <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr auto', gap: '0.75rem', alignItems: 'center' }}>
                    <CustomSelect
                      options={statusOptions}
                      value={newStatus}
                      onChange={setNewStatus}
                    />

                    <div style={{ position: 'relative', width: '100%' }}>
                      <input
                        type="text"
                        placeholder="Technician resolution note..."
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        style={{
                          height: '44px',
                          width: '100%',
                          boxSizing: 'border-box',
                          padding: note.trim().length > 3 ? '0 6.5rem 0 0.85rem' : '0 0.85rem',
                          fontSize: '0.85rem',
                          background: 'var(--surface)',
                          border: '1px solid var(--line)',
                          borderRadius: '6px',
                          color: 'var(--ink)'
                        }}
                      />
                      {note.trim().length > 3 && (
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
                                body: JSON.stringify({ text: note, is_title: false }),
                              });
                              const d = await res.json();
                              if (d.formatted) setNote(d.formatted);
                            } catch (e) {}
                          }}
                          style={{
                            position: 'absolute',
                            right: '6px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            background: 'none',
                            border: 'none',
                            color: 'var(--blue)',
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            padding: '0.2rem 0.4rem',
                            borderRadius: '4px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                          }}
                        >
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 20h9"></path>
                            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                          </svg>
                          Auto-Clean
                        </button>
                      )}
                    </div>

                    <button
                      type="submit"
                      className="button primary"
                      disabled={isUpdatingStatus}
                      style={{ height: '44px', padding: '0 1.25rem', whiteSpace: 'nowrap' }}
                    >
                      {isUpdatingStatus ? 'Updating...' : 'Update Status'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            <div>
              <h3 style={{ fontSize: '1.05rem', color: 'var(--ink)', marginBottom: '0.75rem' }}>
                Append-Only Audit History
              </h3>
              <Timeline history={history} />
            </div>
          </div>
        ) : null}
      </div>

      {showPhotoLightbox && complaint?.photo_reference && (() => {
        const photoUrl = getCleanPhotoUrl(complaint.photo_reference);
        const isPdf = photoUrl ? photoUrl.toLowerCase().endsWith('.pdf') : false;

        return (
          <div className="modal-backdrop" onClick={() => setShowPhotoLightbox(false)} style={{ zIndex: 100 }}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '850px', width: '95vw' }}>
              <div className="modal-header">
                <div>
                  <p className="eyebrow" style={{ marginBottom: '0.2rem' }}>ATTACHED EVIDENCE</p>
                  <h2>Complaint #{complaint.id.slice(0, 8)} &mdash; Flat {complaint.flat_number}</h2>
                </div>
                <button className="modal-close-btn" onClick={() => setShowPhotoLightbox(false)} aria-label="Close">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                  <span>Close</span>
                </button>
              </div>

              <div style={{ textAlign: 'center', background: '#00000008', padding: '0.75rem', borderRadius: '6px', margin: '0.5rem 0 1rem' }}>
                {isPdf ? (
                  <iframe
                    src={photoUrl || ''}
                    title="Complaint PDF Evidence"
                    style={{ width: '100%', height: '65vh', minHeight: '400px', border: '1px solid var(--line)', borderRadius: '4px', background: '#ffffff' }}
                  />
                ) : (
                  <img
                    src={photoUrl || ''}
                    alt="Complaint photo evidence full size"
                    style={{ maxWidth: '100%', maxHeight: '65vh', objectFit: 'contain', borderRadius: '4px', boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }}
                  />
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                {photoUrl && (
                  <a
                    href={photoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="button secondary"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.84rem' }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                      <polyline points="15 3 21 3 21 9"></polyline>
                      <line x1="10" y1="14" x2="21" y2="3"></line>
                    </svg>
                    Open in New Tab
                  </a>
                )}
                <button
                  type="button"
                  className="button primary"
                  onClick={() => setShowPhotoLightbox(false)}
                >
                  Close Preview
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
