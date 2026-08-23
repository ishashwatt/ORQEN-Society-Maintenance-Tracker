import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

interface LoginProps {
  onSwitchToRegister: () => void;
}

export const Login: React.FC<LoginProps> = ({ onSwitchToRegister }) => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [capsLockActive, setCapsLockActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleKeyActivity = (e: React.KeyboardEvent) => {
    setCapsLockActive(e.getModifierState('CapsLock'));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || 'Login failed');
      }

      login(data.token, data.user);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-panel">
        <div className="auth-form-wrap">
          <div className="auth-brand-header">
            <span className="auth-brand-name">ORQEN</span>
            <span className="auth-brand-divider">/</span>
            <span className="auth-brand-tag">Residential Operations</span>
          </div>
          <h1>Welcome back.</h1>
          <p className="auth-intro">
            Keep track of what matters around your home.
          </p>

          {error && (
            <div className="form-error">
              {error}
            </div>
          )}

          <form data-testid="auth-form" onSubmit={handleSubmit}>
            <label>
              Email
              <input
                data-testid="auth-email-input"
                type="email"
                required
                autoComplete="email"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="yourname@domain.com"
              />
            </label>

            <label style={{ marginTop: '0.75rem' }}>
              Password
            </label>

            <div className="password-field-wrap">
              <input
                data-testid="auth-password-input"
                type={showPassword ? 'text' : 'password'}
                required
                minLength={6}
                autoComplete="current-password"
                value={password}
                onKeyDown={handleKeyActivity}
                onKeyUp={handleKeyActivity}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
              <button
                type="button"
                className="password-toggle-btn"
                tabIndex={-1}
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"></path>
                    <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"></path>
                    <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"></path>
                    <line x1="2" x2="22" y1="2" y2="22"></line>
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                )}
              </button>
            </div>
            {capsLockActive && (
              <span style={{ fontSize: '0.72rem', color: 'var(--amber)', marginTop: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                ⇪ Caps Lock is ON
              </span>
            )}

            <button className="button primary" data-testid="auth-submit-button" disabled={isSubmitting} style={{ width: '100%', marginTop: '1.25rem' }}>
              {isSubmitting ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <button
            className="text-button"
            data-testid="auth-mode-toggle"
            onClick={onSwitchToRegister}
            style={{ marginTop: '0.75rem' }}
          >
            New resident? Create an account
          </button>
        </div>
      </section>

      <aside className="auth-aside">
        <h2>KNOW WHAT'S HAPPENING.</h2>
        <div className="aside-rule"></div>
        <p>
          Report an issue, follow its progress, and know when it's resolved.
        </p>
      </aside>
    </main>
  );
};
