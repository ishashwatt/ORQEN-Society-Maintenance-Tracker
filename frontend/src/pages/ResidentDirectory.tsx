import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export const ResidentDirectory: React.FC = () => {
  const { token } = useAuth();
  const [residents, setResidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'VERIFIED' | 'PENDING'>('ALL');
  const [filterOccupancy, setFilterOccupancy] = useState<'ALL' | 'OWNER' | 'TENANT'>('ALL');

  const [previewDoc, setPreviewDoc] = useState<{ url: string; title: string; residentName: string; flatNumber: string } | null>(null);
  const [declineResident, setDeclineResident] = useState<any | null>(null);
  const [declineReason, setDeclineReason] = useState('Verification details mismatch or missing document proof.');
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [decliningId, setDecliningId] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const fetchResidents = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/auth/residents', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setResidents(data.residents || []);
      }
    } catch (e) {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResidents();
  }, [token]);

  const handleApprove = async (residentId: string) => {
    setApprovingId(residentId);
    setStatusMsg(null);
    try {
      const res = await fetch(`/api/auth/residents/${residentId}/verify`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setStatusMsg('Resident registration approved successfully.');
        setResidents(prev => prev.map(r => r.id === residentId ? { ...r, is_verified: true } : r));
        window.dispatchEvent(new CustomEvent('orqen-resident-verified'));
        setTimeout(() => setStatusMsg(null), 4000);
      }
    } catch (e) {
    } finally {
      setApprovingId(null);
    }
  };

  const handleDecline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!declineResident) return;
    setDecliningId(declineResident.id);
    setStatusMsg(null);
    try {
      const res = await fetch(`/api/auth/residents/${declineResident.id}/reject`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reason: declineReason }),
      });
      if (res.ok) {
        setStatusMsg(`Registration for Flat ${declineResident.flat_number} (${declineResident.name}) declined.`);
        setResidents(prev => prev.filter(r => r.id !== declineResident.id));
        setDeclineResident(null);
        setTimeout(() => setStatusMsg(null), 4000);
      }
    } catch (e) {
    } finally {
      setDecliningId(null);
    }
  };

  const totalResidents = residents.length;
  const verifiedCount = residents.filter(r => r.is_verified).length;
  const pendingCount = residents.filter(r => !r.is_verified).length;
  const withDocsCount = residents.filter(r => r.document_reference).length;

  const getCleanDocUrl = (ref: string | null) => {
    if (!ref) return null;
    if (ref.startsWith('http')) return ref;
    const clean = ref.replace(/^\/+/, '');
    if (clean.startsWith('uploads/')) return `/${clean}`;
    return `/uploads/${clean}`;
  };

  const filteredResidents = residents.filter(r => {
    if (filterStatus === 'VERIFIED' && !r.is_verified) return false;
    if (filterStatus === 'PENDING' && r.is_verified) return false;
    if (filterOccupancy !== 'ALL' && (r.occupancy_type || 'OWNER').toUpperCase() !== filterOccupancy) return false;

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (r.name && r.name.toLowerCase().includes(q)) ||
      (r.flat_number && r.flat_number.toLowerCase().includes(q)) ||
      (r.email && r.email.toLowerCase().includes(q)) ||
      (r.phone && r.phone.toLowerCase().includes(q)) ||
      (r.occupancy_type && r.occupancy_type.toLowerCase().includes(q))
    );
  });

  return (
    <div>
      <div className="page-header">
        <div>
          <p className="eyebrow">SOCIETY RESIDENTS & ONBOARDING</p>
          <h1>Resident Directory & Verification</h1>
          <p className="page-description">
            Complete records of registered flat owners, tenants, uploaded identification proofs, and onboarding status.
          </p>
        </div>
      </div>

      {statusMsg && (
        <div style={{ background: '#dcfce7', color: '#15803d', padding: '0.75rem 1.25rem', borderLeft: '3px solid #15803d', marginBottom: '1.5rem', fontSize: '0.88rem', borderRadius: '4px', fontWeight: 600 }}>
          {statusMsg}
        </div>
      )}

      <div className="kpi-strip" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div className="kpi-card" style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '6px', padding: '1.1rem 1.25rem' }}>
          <span style={{ fontSize: '0.74rem', color: 'var(--muted)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
            Total Registered
          </span>
          <div style={{ fontSize: '1.85rem', fontWeight: 700, color: 'var(--ink)', marginTop: '0.35rem', fontFamily: 'var(--font-heading)' }}>
            {totalResidents}
          </div>
        </div>

        <div className="kpi-card" style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '6px', padding: '1.1rem 1.25rem' }}>
          <span style={{ fontSize: '0.74rem', color: 'var(--green)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
            Verified Residents
          </span>
          <div style={{ fontSize: '1.85rem', fontWeight: 700, color: 'var(--green)', marginTop: '0.35rem', fontFamily: 'var(--font-heading)' }}>
            {verifiedCount}
          </div>
        </div>

        <div className="kpi-card" style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '6px', padding: '1.1rem 1.25rem' }}>
          <span style={{ fontSize: '0.74rem', color: 'var(--amber)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
            Pending Verification
          </span>
          <div style={{ fontSize: '1.85rem', fontWeight: 700, color: 'var(--amber)', marginTop: '0.35rem', fontFamily: 'var(--font-heading)' }}>
            {pendingCount}
          </div>
        </div>

        <div className="kpi-card" style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '6px', padding: '1.1rem 1.25rem' }}>
          <span style={{ fontSize: '0.74rem', color: 'var(--blue)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
            Document Proofs
          </span>
          <div style={{ fontSize: '1.85rem', fontWeight: 700, color: 'var(--blue)', marginTop: '0.35rem', fontFamily: 'var(--font-heading)' }}>
            {withDocsCount}
          </div>
        </div>
      </div>

      <div className="data-panel" style={{ padding: '1.25rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <div style={{ position: 'relative', flex: '1', minWidth: '240px' }}>
            <input
              type="text"
              placeholder="Search resident by name, flat number, phone, or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '0.65rem 0.85rem 0.65rem 2.4rem',
                border: '1px solid var(--line)',
                borderRadius: '6px',
                background: 'var(--surface)',
                color: 'var(--ink)',
                fontSize: '0.88rem',
              }}
            />
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }}
            >
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ display: 'flex', border: '1px solid var(--line)', borderRadius: '6px', overflow: 'hidden' }}>
              {(['ALL', 'VERIFIED', 'PENDING'] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setFilterStatus(st)}
                  style={{
                    padding: '0.45rem 0.8rem',
                    border: 'none',
                    background: filterStatus === st ? 'var(--blue)' : 'var(--surface)',
                    color: filterStatus === st ? '#ffffff' : 'var(--muted)',
                    fontWeight: 600,
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                  }}
                >
                  {st === 'ALL' ? 'All Status' : st === 'VERIFIED' ? `Verified (${verifiedCount})` : `Pending (${pendingCount})`}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', border: '1px solid var(--line)', borderRadius: '6px', overflow: 'hidden' }}>
              {(['ALL', 'OWNER', 'TENANT'] as const).map((occ) => (
                <button
                  key={occ}
                  type="button"
                  onClick={() => setFilterOccupancy(occ)}
                  style={{
                    padding: '0.45rem 0.75rem',
                    border: 'none',
                    background: filterOccupancy === occ ? 'var(--blue)' : 'var(--surface)',
                    color: filterOccupancy === occ ? '#ffffff' : 'var(--muted)',
                    fontWeight: 600,
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                  }}
                >
                  {occ === 'ALL' ? 'All Roles' : occ}
                </button>
              ))}
            </div>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--muted)' }}>Loading resident directory...</div>
        ) : filteredResidents.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--muted)' }}>
            No resident records found matching your filters.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
            {filteredResidents.map((r) => {
              const docUrl = getCleanDocUrl(r.document_reference);
              const isPdf = docUrl ? docUrl.toLowerCase().endsWith('.pdf') : false;

              return (
                <div
                  key={r.id}
                  style={{
                    background: 'var(--surface)',
                    border: '1px solid var(--line)',
                    borderRadius: '8px',
                    padding: '1.25rem',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <span
                          style={{
                            background: 'var(--blue)',
                            color: '#ffffff',
                            padding: '0.2rem 0.55rem',
                            borderRadius: '4px',
                            fontWeight: 700,
                            fontSize: '0.76rem',
                            fontFamily: 'var(--font-mono)',
                          }}
                        >
                          Flat {r.flat_number || 'N/A'}
                        </span>
                        <span
                          style={{
                            background: 'rgba(30, 79, 120, 0.08)',
                            color: 'var(--blue)',
                            padding: '0.2rem 0.5rem',
                            borderRadius: '4px',
                            fontWeight: 600,
                            fontSize: '0.72rem',
                          }}
                        >
                          {r.occupancy_type || 'OWNER'}
                        </span>
                      </div>

                      {r.is_verified ? (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            background: '#dcfce7',
                            color: '#15803d',
                            padding: '0.2rem 0.5rem',
                            borderRadius: '4px',
                            fontWeight: 600,
                            fontSize: '0.72rem',
                          }}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
                          Verified
                        </span>
                      ) : (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            background: '#fef3c7',
                            color: '#b45309',
                            padding: '0.2rem 0.5rem',
                            borderRadius: '4px',
                            fontWeight: 600,
                            fontSize: '0.72rem',
                          }}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10"></circle>
                            <polyline points="12 6 12 12 16 14"></polyline>
                          </svg>
                          Pending Approval
                        </span>
                      )}
                    </div>

                    <h3 style={{ margin: '0 0 0.35rem', fontSize: '1.1rem', color: 'var(--ink)' }}>{r.name}</h3>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.84rem', color: 'var(--muted)', margin: '0.75rem 0' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect width="20" height="16" x="2" y="4" rx="2"></rect>
                          <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path>
                        </svg>
                        <span style={{ wordBreak: 'break-all' }}>{r.email}</span>
                      </div>

                      {r.phone && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                          </svg>
                          <span>{r.phone}</span>
                        </div>
                      )}

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.78rem', color: 'var(--muted)' }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect width="8" height="4" x="8" y="2" rx="1" ry="1"></rect>
                          <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
                        </svg>
                        <span>Complaints Filed: <strong>{r.complaint_count}</strong></span>
                      </div>
                    </div>

                    <div style={{ background: 'rgba(0,0,0,0.02)', border: '1px solid var(--line)', borderRadius: '6px', padding: '0.75rem', margin: '0.85rem 0' }}>
                      <div style={{ fontSize: '0.74rem', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.4rem' }}>
                        ID Proof Document ({r.document_type || 'AADHAAR'})
                      </div>
                      {docUrl ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
                          <div
                            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}
                            onClick={() => setPreviewDoc({ url: docUrl, title: r.document_type || 'Identity Proof', residentName: r.name, flatNumber: r.flat_number })}
                          >
                            {isPdf ? (
                              <div style={{ width: '44px', height: '36px', background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5', borderRadius: '4px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                  <polyline points="14 2 14 8 20 8"></polyline>
                                </svg>
                                <span style={{ fontSize: '0.52rem', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>PDF</span>
                              </div>
                            ) : (
                              <img
                                src={docUrl}
                                alt="Document proof thumbnail"
                                style={{ width: '48px', height: '36px', objectFit: 'cover', borderRadius: '4px', border: '1px solid var(--line)' }}
                              />
                            )}
                            <div>
                              <div style={{ fontSize: '0.8rem', color: 'var(--ink)', fontWeight: 600 }}>Proof Attached</div>
                              <div style={{ fontSize: '0.7rem', color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>{isPdf ? 'PDF Document' : 'Image File'}</div>
                            </div>
                          </div>
                          <button
                            type="button"
                            className="button secondary"
                            style={{ padding: '0.25rem 0.6rem', fontSize: '0.76rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                            onClick={() => setPreviewDoc({ url: docUrl, title: r.document_type || 'Identity Proof', residentName: r.name, flatNumber: r.flat_number })}
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path>
                              <circle cx="12" cy="12" r="3"></circle>
                            </svg>
                            View Proof
                          </button>
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.78rem', color: 'var(--muted)', fontStyle: 'italic' }}>
                          No document proof uploaded at signup.
                        </span>
                      )}
                    </div>
                  </div>

                  {!r.is_verified && (
                    <div style={{ display: 'flex', gap: '0.6rem', marginTop: '0.85rem', paddingTop: '0.75rem', borderTop: '1px solid var(--line)' }}>
                      <button
                        type="button"
                        className="button primary"
                        style={{ flex: 1, padding: '0.45rem', fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}
                        disabled={approvingId === r.id}
                        onClick={() => handleApprove(r.id)}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                        {approvingId === r.id ? 'Approving...' : 'Approve'}
                      </button>

                      <button
                        type="button"
                        className="button secondary"
                        style={{ flex: 1, padding: '0.45rem', fontSize: '0.82rem', color: 'var(--red)', borderColor: 'rgba(184, 58, 50, 0.35)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}
                        onClick={() => setDeclineResident(r)}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="18" y1="6" x2="6" y2="18"></line>
                          <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                        Decline
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {previewDoc && (() => {
        const isPdf = previewDoc.url.toLowerCase().endsWith('.pdf');
        return (
          <div className="modal-backdrop" onClick={() => setPreviewDoc(null)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '850px', width: '95vw' }}>
              <div className="modal-header">
                <div>
                  <p className="eyebrow" style={{ marginBottom: '0.2rem' }}>VERIFICATION DOCUMENT</p>
                  <h2>{previewDoc.title} &mdash; Flat {previewDoc.flatNumber} ({previewDoc.residentName})</h2>
                </div>
                <button className="modal-close-btn" onClick={() => setPreviewDoc(null)} aria-label="Close">
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
                    src={previewDoc.url}
                    title="Document PDF Preview"
                    style={{ width: '100%', height: '65vh', minHeight: '400px', border: '1px solid var(--line)', borderRadius: '4px', background: '#ffffff' }}
                  />
                ) : (
                  <img
                    src={previewDoc.url}
                    alt="Document preview full size"
                    style={{ maxWidth: '100%', maxHeight: '65vh', objectFit: 'contain', borderRadius: '4px', boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }}
                  />
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <a
                  href={previewDoc.url}
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
                <button
                  type="button"
                  className="button primary"
                  onClick={() => setPreviewDoc(null)}
                >
                  Close Preview
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {declineResident && (
        <div className="modal-backdrop" onClick={() => !decliningId && setDeclineResident(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <div>
                <p className="eyebrow" style={{ color: 'var(--red)', marginBottom: '0.2rem' }}>ONBOARDING REJECTION</p>
                <h2>Decline Resident Registration</h2>
              </div>
              <button
                className="modal-close-btn"
                onClick={() => !decliningId && setDeclineResident(null)}
                aria-label="Close"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
                <span>Close</span>
              </button>
            </div>

            <form onSubmit={handleDecline} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--ink)' }}>
                You are declining the registration request for <strong>{declineResident.name}</strong> (Flat <strong>{declineResident.flat_number}</strong>).
              </p>

              <div>
                <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, color: 'var(--ink)', marginBottom: '0.45rem' }}>
                  Reason for Rejection (sent via email to resident)
                </label>
                <textarea
                  required
                  rows={3}
                  value={declineReason}
                  onChange={(e) => setDeclineReason(e.target.value)}
                  placeholder="Explain why verification failed..."
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid var(--line)',
                    borderRadius: '6px',
                    background: 'var(--surface)',
                    color: 'var(--ink)',
                    fontSize: '0.88rem',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  className="button secondary"
                  disabled={Boolean(decliningId)}
                  onClick={() => setDeclineResident(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="button primary"
                  style={{ background: 'var(--red)', borderColor: 'var(--red)', color: '#ffffff' }}
                  disabled={Boolean(decliningId)}
                >
                  {decliningId ? 'Declining...' : 'Decline Registration'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
