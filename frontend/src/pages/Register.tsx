import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { CustomSelect, SelectOption } from '../components/CustomSelect';

interface RegisterProps {
  onSwitchToLogin: () => void;
}

export const Register: React.FC<RegisterProps> = ({ onSwitchToLogin }) => {
  const { login } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [capsLockActive, setCapsLockActive] = useState(false);

  const [flatNumber, setFlatNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [occupancyType, setOccupancyType] = useState<'OWNER' | 'TENANT'>('OWNER');
  const [documentType, setDocumentType] = useState<string>('AADHAAR');
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [documentPreview, setDocumentPreview] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const documentOptions: SelectOption[] = [
    { value: 'AADHAAR', label: 'Aadhaar Card / Govt ID', sublabel: 'National identity verification' },
    { value: 'RENT_AGREEMENT', label: 'Registered Rent Agreement', sublabel: 'Tenancy contract proof' },
    { value: 'ELECTRICITY_BILL', label: 'Electricity / Utility Bill', sublabel: 'Proof of address connection' },
    { value: 'POSSESSION_LETTER', label: 'Possession Letter / Sale Deed', sublabel: 'Ownership allotment document' },
    { value: 'OTHER', label: 'Other Society Document', sublabel: 'Committee-approved document' },
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

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isPasswordValid) {
      setError('Please ensure your password meets all complexity requirements.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please re-enter your password.');
      return;
    }

    if (!flatNumber.trim()) {
      setError('Flat number is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('name', name.trim());
      formData.append('email', email.trim().toLowerCase());
      formData.append('password', password);
      formData.append('flat_number', flatNumber.trim());
      if (phone.trim()) formData.append('phone', phone.trim());
      formData.append('occupancy_type', occupancyType);
      formData.append('document_type', documentType);
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

          <h1>Create Resident Account</h1>
          <p className="auth-intro">
            Join your society portal to lodge maintenance requests, track resolutions, and view notices.
          </p>

          {error && <div className="form-error">{error}</div>}

          <form onSubmit={handleRegister} className="auth-form">
            <label>
              Full Name
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. John Doe"
                autoComplete="name"
              />
            </label>

            <label>
              Email Address
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. john@example.com"
                autoComplete="email"
              />
            </label>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <label>
                Flat Number
                <input
                  type="text"
                  required
                  value={flatNumber}
                  onChange={(e) => setFlatNumber(e.target.value)}
                  placeholder="e.g. A-402"
                />
              </label>

              <label>
                Contact Phone
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. +91 98765 43210"
                />
              </label>
            </div>

            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <span className="input-label" style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text)' }}>
                Occupancy Status
              </span>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setOccupancyType('OWNER')}
                  style={{
                    flex: 1,
                    padding: '0.6rem',
                    borderRadius: '8px',
                    border: occupancyType === 'OWNER' ? '2px solid var(--blue)' : '1px solid var(--border)',
                    background: occupancyType === 'OWNER' ? 'rgba(37, 99, 235, 0.08)' : 'var(--bg-card)',
                    color: occupancyType === 'OWNER' ? 'var(--blue)' : 'var(--text-muted)',
                    fontWeight: occupancyType === 'OWNER' ? 700 : 500,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  Flat Owner
                </button>
                <button
                  type="button"
                  onClick={() => setOccupancyType('TENANT')}
                  style={{
                    flex: 1,
                    padding: '0.6rem',
                    borderRadius: '8px',
                    border: occupancyType === 'TENANT' ? '2px solid var(--blue)' : '1px solid var(--border)',
                    background: occupancyType === 'TENANT' ? 'rgba(37, 99, 235, 0.08)' : 'var(--bg-card)',
                    color: occupancyType === 'TENANT' ? 'var(--blue)' : 'var(--text-muted)',
                    fontWeight: occupancyType === 'TENANT' ? 700 : 500,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  Tenant / Renter
                </button>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <span className="input-label" style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text)' }}>
                Verification Document Type
              </span>
              <CustomSelect
                options={documentOptions}
                value={documentType}
                onChange={(val) => setDocumentType(val)}
                placeholder="Select Verification Document"
              />
            </div>

            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <span className="input-label" style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text)' }}>
                Upload Proof Document (PDF, PNG, JPG &bull; Optional now, can upload later)
              </span>
              <div
                style={{
                  border: '2px dashed var(--border)',
                  borderRadius: '8px',
                  padding: '1rem',
                  textAlign: 'center',
                  background: 'var(--bg-card)',
                  cursor: 'pointer',
                  position: 'relative',
                }}
              >
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleFileChange}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    opacity: 0,
                    cursor: 'pointer',
                  }}
                />
                {documentFile ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                    {documentPreview ? (
                      <img
                        src={documentPreview}
                        alt="Document Preview"
                        style={{ width: 44, height: 44, borderRadius: 6, objectFit: 'cover' }}
                      />
                    ) : (
                      <span style={{ fontSize: '1.5rem' }}>📄</span>
                    )}
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text)' }}>{documentFile.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {(documentFile.size / 1024 / 1024).toFixed(2)} MB &bull; Ready to submit
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveFile();
                      }}
                      style={{
                        marginLeft: 'auto',
                        background: 'none',
                        border: 'none',
                        color: 'var(--red)',
                        cursor: 'pointer',
                        fontWeight: 700,
                        fontSize: '1rem',
                      }}
                      title="Remove file"
                    >
                      &times;
                    </button>
                  </div>
                ) : (
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--blue)' }}>
                      Click or drag to attach proof file
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                      Aadhaar, Rental Agreement, or Possession Letter (Max 10MB)
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <label>
                Password
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={handleKeyActivity}
                    onKeyUp={handleKeyActivity}
                    placeholder="Min. 8 chars"
                    autoComplete="new-password"
                    style={{ paddingRight: '2.5rem' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '0.6rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                      color: 'var(--text-muted)',
                    }}
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </label>

              <label>
                Confirm Password
                <div style={{ position: 'relative' }}>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    onKeyDown={handleKeyActivity}
                    onKeyUp={handleKeyActivity}
                    placeholder="Repeat password"
                    autoComplete="new-password"
                    style={{ paddingRight: '2.5rem' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={{
                      position: 'absolute',
                      right: '0.6rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                      color: 'var(--text-muted)',
                    }}
                  >
                    {showConfirmPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </label>
            </div>

            {capsLockActive && (
              <div style={{ fontSize: '0.75rem', color: '#b45309', background: '#fef3c7', padding: '0.4rem 0.6rem', borderRadius: '4px', marginTop: '0.4rem' }}>
                Warning: Caps Lock is ON
              </div>
            )}

            <div style={{ marginTop: '0.5rem', marginBottom: '1rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              <div style={{ color: hasMinLength ? '#16a34a' : 'inherit' }}>
                {hasMinLength ? '✓' : '•'} At least 8 characters
              </div>
              <div style={{ color: hasNumber ? '#16a34a' : 'inherit' }}>
                {hasNumber ? '✓' : '•'} Contains at least one number
              </div>
              <div style={{ color: hasSpecial ? '#16a34a' : 'inherit' }}>
                {hasSpecial ? '✓' : '•'} Contains at least one special character (@, #, $, etc.)
              </div>
              {confirmPassword && (
                <div style={{ color: password === confirmPassword ? '#16a34a' : '#dc2626', marginTop: '0.2rem', fontWeight: 600 }}>
                  {password === confirmPassword ? '✓ Passwords match' : '✗ Passwords do not match'}
                </div>
              )}
            </div>

            <button type="submit" className="button primary full-width" disabled={isSubmitting}>
              {isSubmitting ? 'Creating Account...' : 'Complete Registration'}
            </button>
          </form>

          <footer className="auth-footer">
            <span>Already have an account?</span>
            <button type="button" className="link-button" onClick={onSwitchToLogin}>
              Log in
            </button>
          </footer>
        </div>
      </section>

      <aside className="auth-aside">
        <div className="auth-aside-content">
          <div className="society-tag">RESIDENTIAL OPERATIONS PORTAL</div>
          <h2>Smart Infrastructure &amp; Maintenance Tracking</h2>
          <p>
            Seamless ticket lodging, real-time SLA enforcement, transparent noticeboards, and direct communication with your society management committee.
          </p>
          <div className="society-stats">
            <div>
              <div className="stat-value">24/7</div>
              <div className="stat-label">Support Dispatch</div>
            </div>
            <div>
              <div className="stat-value">98.4%</div>
              <div className="stat-label">SLA Compliance</div>
            </div>
            <div>
              <div className="stat-value">&lt; 4h</div>
              <div className="stat-label">Avg. Response Time</div>
            </div>
          </div>
        </div>
      </aside>
    </main>
  );
};
