import React from 'react';
import { useAuth } from '../context/AuthContext';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab }) => {
  const { user, logout } = useAuth();

  return (
    <nav className="navbar">
      <div className="container navbar-inner">
        <div className="brand-logo" style={{ display: 'flex', alignItems: 'center' }}>
          <span className="brand-mark">ORQEN</span>
        </div>

        {user && (
          <div className="nav-links">
            <button
              className={`nav-link ${activeTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => setActiveTab('dashboard')}
            >
              Dashboard
            </button>
            <button
              className={`nav-link ${activeTab === 'complaints' ? 'active' : ''}`}
              onClick={() => setActiveTab('complaints')}
            >
              Complaints
            </button>
            <button
              className={`nav-link ${activeTab === 'notices' ? 'active' : ''}`}
              onClick={() => setActiveTab('notices')}
            >
              Notice Board
            </button>
          </div>
        )}

        {user ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div className="user-badge" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.85rem' }}>
              <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{user.name}</span>
              <span style={{ color: 'var(--muted)' }}>({user.flat_number})</span>
              <span className="role-pill">{user.role}</span>
            </div>
            <button className="btn btn-secondary" style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem' }} onClick={logout}>
              Sign Out
            </button>
          </div>
        ) : null}
      </div>
    </nav>
  );
};
