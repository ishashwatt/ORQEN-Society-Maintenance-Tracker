import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { PasswordSuggestInput } from '../components/PasswordSuggestInput';
import { CustomSelect, SelectOption } from '../components/CustomSelect';

interface RegisterProps {
  onSwitchToLogin: () => void;
}

export const Register: React.FC<RegisterProps> = ({ onSwitchToLogin }) => {
  const { login } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [capsLockActive, setCapsLockActive] = useState(false);
  const [flatNumber, setFlatNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [occupancyType, setOccupancyType] = useState<'OWNER' | 'TENANT'>('OWNER');
  const [documentType, setDocumentType] = useState<string>('AADHAAR');
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [documentPreview, setDocumentPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [showOtpModal, setShowOtpModal] = useState(false);
  const [emailOtp, setEmailOtp] = useState('');
  const [otpError, setOtpError] = useState<string | null>(null);
  const [otpLoading, setOtpLoading] = useState(false);

  const documentOptions: SelectOption[] = [
    { value: 'AADHAAR', label: 'Aadhaar Card / Govt ID', sublabel: 'National photo identity' },
    { value: 'RENT_AGREEMENT', label: 'Rent Agreement', sublabel: 'Tenancy verification document' },
    { value: 'ELECTRICITY_BILL', label: 'Electricity / Utility Bill', sublabel: 'Active utility connection proof' },
    { value: 'POSSESSION_LETTER', label: 'Possession Letter / Sale Deed', sublabel: 'Property allotment deed' },
    { value: 'OTHER', label: 'Other Society Document', sublabel: 'Society-specific paperwork' },
  ];

  const hasMinLength = password.length >= 8;
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[@$!%*#?&_\-]/.test(password);
  const isPasswordValid = hasMinLength && hasNumber && hasSpecial;

  const handleKeyActivity = (e: React.KeyboardEvent) => {
    setCapsLockActive(e.getModifierState('CapsLock'));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setDocumentFile(file);
      if (file.type.startsWith('image/')) {
        setDocumentPreview(URL.createObjectURL(file));
      } else {
        setDocumentPreview(null);
      }
    }
  };

  const handleRemoveFile = () => {
    setDocumentFile(null);
    setDocumentPreview(null);
  };

  const handleInitiateRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isPasswordValid) {
      setError('Please ensure your password meets all complexity requirements.');
      return;
    }

    if (!flatNumber.trim()) {
      setError('Flat number is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          phone: phone.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Failed to dispatch verification code');

      setShowOtpModal(true);
      setOtpError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinalSubmitWithOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setOtpError(null);

    if (!emailOtp || emailOtp.length < 6) {
      setOtpError('Please enter the 6-digit Email OTP code');
      return;
    }

    setOtpLoading(true);

    try {
      const formData = new FormData();
      formData.append('name', name.trim());
      formData.append('email', email.trim().toLowerCase());
      formData.append('password', password);
      formData.append('flat_number', flatNumber.trim());
      if (phone.trim()) formData.append('phone', phone.trim());
      formData.append('occupancy_type', occupancyType);
      formData.append('document_type', documentType);
      formData.append('email_otp', emailOtp.trim());
      if (documentFile) {
        formData.append('document', documentFile);
      }

      const res = await fetch('/api/auth/register', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || 'Registration failed');
      }

      setShowOtpModal(false);
      login(data.token, data.user);
    } catch (err: any) {
      setOtpError(err.message);
    } finally {
      setOtpLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-panel">
        <div className="auth-form-wrap register-wrap" style={{ maxWidth: '520px', paddingBottom: '4.5rem' }}>
          <div className="auth-brand-header">
            <span className="auth-brand-name">ORQEN</span>
            <span className="auth-brand-divider">/</span>
            <span className="auth-brand-tag">Residential Operations</span>
          </div>
          <h1>Register resident.</h1>
          <p className="auth-intro">
            Create your flat account with residence validation for committee approval.
          </p>

          {error && (
            <div className="form-error">
              {error}
            </div>
          )}

          <form data-testid="auth-register-form" onSubmit={handleInitiateRegister}>
            <div style={{ marginBottom: '1.1rem' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--ink)', marginBottom: '0.45rem' }}>
                Occupancy Status
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setOccupancyType('OWNER')}
                  style={{
                    padding: '0.65rem 0.85rem',
                    borderRadius: '6px',
                    border: occupancyType === 'OWNER' ? '2px solid var(--blue)' : '1px solid var(--line)',
                    background: occupancyType === 'OWNER' ? 'rgba(30, 79, 120, 0.08)' : 'var(--surface)',
                    color: occupancyType === 'OWNER' ? 'var(--blue)' : 'var(--muted)',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.2rem',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span>Flat Owner</span>
                  <span style={{ fontSize: '0.72rem', fontWeight: 400, color: 'var(--muted)' }}>Owns the property</span>
                </button>

                <button
                  type="button"
                  onClick={() => setOccupancyType('TENANT')}
                  style={{
                    padding: '0.65rem 0.85rem',
                    borderRadius: '6px',
                    border: occupancyType === 'TENANT' ? '2px solid var(--blue)' : '1px solid var(--line)',
                    background: occupancyType === 'TENANT' ? 'rgba(30, 79, 120, 0.08)' : 'var(--surface)',
                    color: occupancyType === 'TENANT' ? 'var(--blue)' : 'var(--muted)',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.2rem',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span>Tenant / Rented</span>
                  <span style={{ fontSize: '0.72rem', fontWeight: 400, color: 'var(--muted)' }}>Residing on rent</span>
                </button>
              </div>
            </div>

            <div className="form-grid-2">
              <label>
                Full Name
                <input
                  data-testid="auth-name-input"
                  type="text"
                  required
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Sunil Verma"
                />
              </label>

              <label>
                Flat Number
                <input
                  data-testid="auth-flat-input"
                  type="text"
                  required
                  value={flatNumber}
                  onChange={(e) => setFlatNumber(e.target.value)}
                  placeholder="e.g. C-402"
                />
              </label>
            </div>

            <div className="form-grid-2">
              <label>
                Email Address
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

              <label>
                Contact Phone Number
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                />
              </label>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <PasswordSuggestInput
                label="Password"
                dataTestId="auth-password-input"
                value={password}
                onChange={setPassword}
                onKeyDown={handleKeyActivity}
                onKeyUp={handleKeyActivity}
                placeholder="••••••••"
              />

              <p style={{ fontSize: '0.74rem', color: isPasswordValid ? 'var(--green)' : 'var(--muted)', marginTop: '0.35rem', lineHeight: 1.4 }}>
                {isPasswordValid
                  ? '✓ Password criteria met'
                  : 'Use at least 8 characters, including 1 number and 1 special character'}
              </p>

              {capsLockActive && (
                <span style={{ fontSize: '0.72rem', color: 'var(--amber)', marginTop: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  ⇪ Caps Lock is ON
                </span>
              )}
            </div>

            <div style={{ background: 'rgba(30, 79, 120, 0.04)', border: '1px solid var(--line)', borderRadius: '6px', padding: '1rem', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                <span style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--ink)' }}>
                  Residence Verification Document (Optional)
                </span>
                <span style={{ fontSize: '0.74rem', color: 'var(--muted)' }}>Govt ID / Agreement</span>
              </div>

              <div style={{ marginBottom: '0.75rem' }}>
                <CustomSelect
                  options={documentOptions}
                  value={documentType}
                  onChange={setDocumentType}
                  placeholder="Select Document Type"
                />
              </div>

              {!documentFile ? (
                <label
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0.85rem',
                    border: '1px dashed var(--line)',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    background: 'var(--surface)',
                    gap: '0.35rem',
                    fontSize: '0.8rem',
                    color: 'var(--muted)',
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--blue)' }}>
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="17 8 12 3 7 8"></polyline>
                    <line x1="12" y1="3" x2="12" y2="15"></line>
                  </svg>
                  <span>Attach Document Photo or PDF (Max 10MB)</span>
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                  />
                </label>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '6px', padding: '0.65rem 0.85rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    {documentPreview ? (
                      <img src={documentPreview} alt="Doc preview" style={{ width: '38px', height: '38px', objectFit: 'cover', borderRadius: '4px' }} />
                    ) : (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--blue)' }}>
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                      </svg>
                    )}
                    <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--ink)' }}>{documentFile.name}</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveFile}
                    style={{ background: 'none', border: 'none', color: 'var(--red)', fontSize: '0.78rem', cursor: 'pointer', fontWeight: 600 }}
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>

            <button className="button primary" data-testid="auth-submit-button" disabled={isSubmitting} style={{ width: '100%', marginTop: '0.25rem' }}>
              {isSubmitting ? 'Sending Verification Code...' : 'Verify Email to Register'}
            </button>
          </form>

          <button
            className="text-button"
            data-testid="auth-mode-toggle"
            onClick={onSwitchToLogin}
            style={{ marginTop: '0.5rem' }}
          >
            Already registered? Sign In
          </button>
        </div>
      </section>

      <aside className="auth-aside">
        <h2>GET THINGS TAKEN CARE OF.</h2>
        <div className="aside-rule"></div>
        <p>
          Raise requests, stay updated, and spend less time following up.
        </p>
      </aside>

      {showOtpModal && (
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
            padding: '1rem',
          }}
        >
          <div
            style={{
              background: 'var(--card-bg, #ffffff)',
              border: '1px solid var(--line)',
              borderRadius: '8px',
              padding: '1.75rem',
              maxWidth: '460px',
              width: '100%',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: 'var(--ink)' }}>
                  Email OTP Verification
                </h2>
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: 'var(--muted)' }}>
                  Verification code dispatched to <strong style={{ color: 'var(--ink)' }}>{email}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowOtpModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: 'var(--muted)' }}
              >
                ✕
              </button>
            </div>

            {otpError && (
              <div className="form-error" style={{ marginBottom: '1rem' }}>
                {otpError}
              </div>
            )}

            <div
              style={{
                background: 'rgba(37, 99, 235, 0.05)',
                border: '1px solid rgba(37, 99, 235, 0.15)',
                borderRadius: '6px',
                padding: '0.65rem 0.85rem',
                marginBottom: '1rem',
                fontSize: '0.8rem',
                color: 'var(--blue)',
                lineHeight: 1.4,
              }}
            >
              A 6-digit verification code was sent to <strong>{email}</strong>. Please enter it below to complete your registration.
            </div>

            <form onSubmit={handleFinalSubmitWithOtp} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
              <label>
                Email Confirmation Code (6 Digits)
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={emailOtp}
                  onChange={(e) => setEmailOtp(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="123456"
                  style={{ marginTop: '0.35rem', letterSpacing: '0.2em', fontWeight: 700 }}
                />
              </label>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => setShowOtpModal(false)}
                  disabled={otpLoading}
                >
                  Back
                </button>
                <button
                  type="submit"
                  className="button primary"
                  disabled={otpLoading}
                >
                  {otpLoading ? 'Verifying...' : 'Confirm & Complete Registration'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
};
