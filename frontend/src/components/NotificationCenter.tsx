import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';

interface NotificationItem {
  id: string;
  title: string;
  description: string;
  type: string;
  entity_id: string;
  is_read: boolean;
  is_approved?: boolean;
  is_declined?: boolean;
  created_at: string;
  flat_number?: string;
  phone?: string;
  occupancy_type?: string;
  document_reference?: string;
  document_type?: string;
}

interface NotificationCenterProps {
  onSelectComplaint?: (complaintId: string) => void;
  onNavigate?: (tab: 'dashboard' | 'complaints' | 'notices') => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  onSelectComplaint,
  onNavigate,
}) => {
  const { token } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/notifications', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unread_count || 0);
      }
    } catch (e) {
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 3000);
    return () => clearInterval(interval);
  }, [token]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAsRead = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/notifications/${id}/read`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (e) {
    }
  };

  const handleMarkAllAsRead = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/notifications/read-all', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        setUnreadCount(0);
      }
    } catch (e) {
    } finally {
      setLoading(false);
    }
  };

  const handleInlineApproveResident = async (e: React.MouseEvent, residentId: string, notifId: string) => {
    e.stopPropagation();
    setApprovingId(residentId);
    try {
      const res = await fetch(`/api/auth/residents/${residentId}/verify`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setNotifications(prev =>
          prev.map(n => n.id === notifId ? { ...n, is_read: true, is_approved: true } : n)
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
        window.dispatchEvent(new CustomEvent('orqen-resident-verified'));
        if (onNavigate) onNavigate('dashboard');
      }
    } catch (e) {
    } finally {
      setApprovingId(null);
    }
  };

  const handleInlineRejectResident = async (e: React.MouseEvent, residentId: string, notifId: string) => {
    e.stopPropagation();
    setRejectingId(residentId);
    try {
      const res = await fetch(`/api/auth/residents/${residentId}/reject`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reason: 'Verification details mismatch or missing documentation.' }),
      });
      if (res.ok) {
        setNotifications(prev =>
          prev.map(n => n.id === notifId ? { ...n, is_read: true, is_declined: true } : n)
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
        window.dispatchEvent(new CustomEvent('orqen-resident-verified'));
        if (onNavigate) onNavigate('dashboard');
      }
    } catch (e) {
    } finally {
      setRejectingId(null);
    }
  };

  const handleNotificationClick = (item: NotificationItem) => {
    if (!item.is_read) {
      fetch(`/api/notifications/${item.id}/read`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
      setNotifications(prev => prev.map(n => n.id === item.id ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    }

    if (item.type === 'COMPLAINT' && onSelectComplaint) {
      onSelectComplaint(item.entity_id);
      setIsOpen(false);
    } else if (item.type === 'RESIDENT_APPROVAL' && onNavigate) {
      onNavigate('dashboard');
      setIsOpen(false);
    }
  };

  return (
    <div className="notification-center-wrapper" ref={popoverRef} style={{ position: 'relative' }}>
      <button
        type="button"
        className="notification-bell-btn"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Notifications"
        style={{
          background: 'none',
          border: '1px solid var(--line)',
          borderRadius: '6px',
          padding: '0.45rem 0.55rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          color: unreadCount > 0 ? 'var(--blue)' : 'var(--muted)',
          position: 'relative',
          transition: 'all 0.15s ease',
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
        </svg>

        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: '-5px',
              right: '-5px',
              background: 'var(--red)',
              color: '#fff',
              fontSize: '0.68rem',
              fontWeight: 700,
              minWidth: '17px',
              height: '17px',
              borderRadius: '9px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 4px',
              border: '2px solid var(--surface)',
            }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          className="notification-popover"
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            width: '380px',
            background: 'var(--surface)',
            border: '1px solid var(--line)',
            borderRadius: '8px',
            boxShadow: '0 12px 32px rgba(32, 37, 43, 0.16)',
            zIndex: 1200,
            display: 'flex',
            flexDirection: 'column',
            maxHeight: '460px',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '0.85rem 1rem',
              borderBottom: '1px solid var(--line)',
              background: 'rgba(30, 79, 120, 0.03)',
            }}
          >
            <div>
              <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--ink)' }}>
                Activity & Requests
              </span>
              {unreadCount > 0 && (
                <span style={{ marginLeft: '0.4rem', fontSize: '0.75rem', color: 'var(--blue)', fontWeight: 600 }}>
                  ({unreadCount} new)
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                disabled={loading}
                onClick={handleMarkAllAsRead}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--blue)',
                  fontSize: '0.76rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                Mark all as read
              </button>
            )}
          </div>

          <div style={{ overflowY: 'auto', flex: 1, padding: '0.35rem 0' }}>
            {notifications.length === 0 ? (
              <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--muted)', fontSize: '0.84rem' }}>
                No notifications recorded.
              </div>
            ) : (
              notifications.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleNotificationClick(item)}
                  style={{
                    padding: '0.85rem 1rem',
                    borderBottom: '1px solid rgba(217, 213, 204, 0.4)',
                    background: item.is_read ? 'transparent' : 'rgba(30, 79, 120, 0.05)',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.35rem',
                    transition: 'background 0.12s ease',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      <span
                        style={{
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          padding: '0.15rem 0.45rem',
                          borderRadius: '4px',
                          background: item.type === 'RESIDENT_APPROVAL' ? 'rgba(184, 58, 50, 0.1)' : 'rgba(30, 79, 120, 0.1)',
                          color: item.type === 'RESIDENT_APPROVAL' ? 'var(--red)' : 'var(--blue)',
                          letterSpacing: '0.04em',
                          textTransform: 'uppercase',
                        }}
                      >
                        {item.type === 'RESIDENT_APPROVAL' ? 'Registration Request' : 'Complaint'}
                      </span>
                    </div>

                    {!item.is_read && (
                      <span
                        style={{
                          width: '7px',
                          height: '7px',
                          borderRadius: '50%',
                          background: 'var(--blue)',
                          flexShrink: 0,
                          marginTop: '4px',
                        }}
                      />
                    )}
                  </div>

                  <span style={{ fontWeight: item.is_read ? 600 : 700, fontSize: '0.86rem', color: 'var(--ink)' }}>
                    {item.title}
                  </span>

                  <p style={{ fontSize: '0.78rem', color: 'var(--muted)', margin: 0, lineHeight: 1.4 }}>
                    {item.description}
                  </p>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.35rem' }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>
                      {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(item.created_at).toLocaleDateString()}
                    </span>

                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      {item.type === 'RESIDENT_APPROVAL' && !item.is_approved && !item.is_declined && (
                        <>
                          <button
                            type="button"
                            disabled={rejectingId === item.entity_id || approvingId === item.entity_id}
                            onClick={(e) => handleInlineRejectResident(e, item.entity_id, item.id)}
                            style={{
                              background: 'transparent',
                              color: 'var(--red)',
                              border: '1px solid rgba(184, 58, 50, 0.35)',
                              borderRadius: '4px',
                              padding: '0.22rem 0.5rem',
                              fontSize: '0.72rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            {rejectingId === item.entity_id ? 'Declining...' : 'Decline'}
                          </button>

                          <button
                            type="button"
                            disabled={approvingId === item.entity_id || rejectingId === item.entity_id}
                            onClick={(e) => handleInlineApproveResident(e, item.entity_id, item.id)}
                            style={{
                              background: 'var(--blue)',
                              color: '#fff',
                              border: 'none',
                              borderRadius: '4px',
                              padding: '0.25rem 0.55rem',
                              fontSize: '0.72rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            {approvingId === item.entity_id ? 'Approving...' : 'Approve Flat'}
                          </button>
                        </>
                      )}

                      {item.is_declined && (
                        <span style={{ fontSize: '0.72rem', color: 'var(--red)', fontWeight: 600 }}>
                          Declined ✕
                        </span>
                      )}

                      {item.is_approved && (
                        <span style={{ fontSize: '0.72rem', color: 'var(--green)', fontWeight: 600 }}>
                          Approved ✓
                        </span>
                      )}

                      {!item.is_read && (
                        <button
                          type="button"
                          onClick={(e) => handleMarkAsRead(e, item.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--blue)',
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            padding: 0,
                          }}
                        >
                          Mark read
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
