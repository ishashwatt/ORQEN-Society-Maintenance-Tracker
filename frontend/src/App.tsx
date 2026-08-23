import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { ResidentDashboard } from './pages/ResidentDashboard';
import { AdminDashboard } from './pages/AdminDashboard';
import { NoticeBoard } from './pages/NoticeBoard';
import { ResidentDirectory } from './pages/ResidentDirectory';
import { NotificationCenter } from './components/NotificationCenter';

const MainContent: React.FC = () => {
  const { user, logout, token, isLoading } = useAuth();
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'complaints' | 'residents' | 'notices'>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [unreadNoticeCount, setUnreadNoticeCount] = useState<number>(0);
  const [pendingResidentCount, setPendingResidentCount] = useState<number>(0);

  React.useEffect(() => {
    if (!token || !user) return;

    const fetchSummary = async () => {
      try {
        const notifPromise = fetch('/api/notices/unread-summary', {
          headers: { Authorization: `Bearer ${token}` },
        });

        const resPromise = user.role === 'ADMIN'
          ? fetch('/api/auth/residents', { headers: { Authorization: `Bearer ${token}` } })
          : Promise.resolve(null);

        const [notifRes, resRes] = await Promise.all([notifPromise, resPromise]);

        if (notifRes.ok) {
          const data = await notifRes.json();
          setUnreadNoticeCount(data.unread_count || 0);
        }

        if (resRes && resRes.ok) {
          const resData = await resRes.json();
          const pending = (resData.residents || []).filter((r: any) => !r.is_verified).length;
          setPendingResidentCount(pending);
        }
      } catch (e) {}
    };

    fetchSummary();
    const timer = setInterval(fetchSummary, 4000);

    const handleVerified = () => fetchSummary();
    window.addEventListener('orqen-resident-verified', handleVerified);

    return () => {
      clearInterval(timer);
      window.removeEventListener('orqen-resident-verified', handleVerified);
    };
  }, [token, user, activeTab]);

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
        Loading ORQEN...
      </div>
    );
  }

  if (!user) {
    return authMode === 'login' ? (
      <Login onSwitchToRegister={() => setAuthMode('register')} />
    ) : (
      <Register onSwitchToLogin={() => setAuthMode('login')} />
    );
  }

  return (
    <div className="app-shell unified-topbar">
      <header className="topbar">
        <div className="topbar-left">
          <a
            className="brand-mark"
            data-testid="brand-home-link"
            href="#"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('dashboard');
            }}
          >
            <div className="brand-titles">
              <span className="brand-text">ORQEN</span>
              <span className="brand-sub">
                {user.role === 'ADMIN' ? 'ADMIN CONTROL' : 'RESIDENTIAL OPERATIONS'}
              </span>
            </div>
          </a>

          <nav className={`topbar-nav ${mobileMenuOpen ? 'mobile-visible' : ''}`} data-testid="main-navigation">
            <button
              data-testid="nav-dashboard"
              className={`nav-tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('dashboard');
                setMobileMenuOpen(false);
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 3v16a2 2 0 0 0 2 2h16"></path>
                <path d="M18 17V9"></path>
                <path d="M13 17V5"></path>
                <path d="M8 17v-3"></path>
              </svg>
              Overview
            </button>

            <button
              data-testid="nav-complaints"
              className={`nav-tab-btn ${activeTab === 'complaints' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('complaints');
                setMobileMenuOpen(false);
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="8" height="4" x="8" y="2" rx="1" ry="1"></rect>
                <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
                <path d="M12 11h4"></path>
                <path d="M12 16h4"></path>
                <path d="M8 11h.01"></path>
                <path d="M8 16h.01"></path>
              </svg>
              {user.role === 'ADMIN' ? 'Operations & Triage' : 'My Complaints'}
            </button>

            {user.role === 'ADMIN' && (
              <button
                data-testid="nav-residents"
                className={`nav-tab-btn ${activeTab === 'residents' ? 'active' : ''}`}
                style={{ position: 'relative' }}
                onClick={() => {
                  setActiveTab('residents');
                  setMobileMenuOpen(false);
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>
                Resident Directory
                {pendingResidentCount > 0 && (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      minWidth: '18px',
                      height: '18px',
                      padding: '0 4px',
                      background: 'var(--amber)',
                      color: '#ffffff',
                      borderRadius: '9px',
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      fontFamily: 'var(--font-mono)',
                      marginLeft: '0.35rem',
                      lineHeight: 1,
                    }}
                  >
                    {pendingResidentCount}
                  </span>
                )}
              </button>
            )}

            <button
              data-testid="nav-notices"
              className={`nav-tab-btn ${activeTab === 'notices' ? 'active' : ''}`}
              style={{ position: 'relative' }}
              onClick={() => {
                setActiveTab('notices');
                setMobileMenuOpen(false);
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.268 21a2 2 0 0 0 3.464 0"></path>
                <path d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326"></path>
              </svg>
              Society Notices
              {unreadNoticeCount > 0 && (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minWidth: '18px',
                    height: '18px',
                    padding: '0 4px',
                    background: 'var(--red)',
                    color: '#ffffff',
                    borderRadius: '9px',
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    fontFamily: 'var(--font-mono)',
                    marginLeft: '0.35rem',
                    lineHeight: 1,
                  }}
                >
                  {unreadNoticeCount}
                </span>
              )}
            </button>
          </nav>
        </div>

        <div className="topbar-right" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <NotificationCenter
            onSelectComplaint={(_id) => {
              setActiveTab('complaints');
            }}
            onNavigate={(tab) => {
              setActiveTab(tab);
            }}
          />

          <button
            className="mobile-menu"
            data-testid="mobile-menu-button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation menu"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 12h16"></path>
              <path d="M4 18h16"></path>
              <path d="M4 6h16"></path>
            </svg>
          </button>

          <div className="user-chip">
            <span className="avatar">
              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="8" r="5"></circle>
                <path d="M20 21a8 8 0 0 0-16 0"></path>
              </svg>
            </span>
            <div className="user-details">
              <span className="user-name" data-testid="current-user-name">
                {user.name || (user.role === 'ADMIN' ? 'Building Admin' : 'Resident')}
              </span>
              <span className="role-label" data-testid="current-user-role">
                {user.role === 'ADMIN' ? 'ADMIN' : (user.flat_number ? `FLAT ${user.flat_number}` : 'RESIDENT')}
              </span>
            </div>
            <button
              className="icon-button logout-btn"
              data-testid="logout-button"
              title="Sign out"
              onClick={logout}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m16 17 5-5-5-5"></path>
                <path d="M21 12H9"></path>
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              </svg>
            </button>
          </div>
        </div>
      </header>

      <main className="main-viewport">
        <div className="viewport-container">
          {activeTab === 'notices' ? (
            <NoticeBoard />
          ) : activeTab === 'residents' && user.role === 'ADMIN' ? (
            <ResidentDirectory />
          ) : user.role === 'ADMIN' ? (
            <AdminDashboard activeTab={activeTab} onNavigateTab={setActiveTab} />
          ) : (
            <ResidentDashboard activeTab={activeTab} onNavigateTab={setActiveTab} />
          )}
        </div>
      </main>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <MainContent />
    </AuthProvider>
  );
};

export default App;
