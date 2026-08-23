import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { CustomSelect, SelectOption } from '../components/CustomSelect';
import { PasswordSuggestInput } from '../components/PasswordSuggestInput';

interface AddAdminModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const designationOptions: SelectOption[] = [
  { value: 'Secretary', label: 'Secretary', sublabel: 'General administration & notices' },
  { value: 'President', label: 'President', sublabel: 'Committee executive head' },
  { value: 'Treasurer', label: 'Treasurer', sublabel: 'Financial & maintenance ledger' },
  { value: 'Facility Manager', label: 'Facility Manager', sublabel: 'Operations & technical repairs' },
  { value: 'Estate Supervisor', label: 'Estate Supervisor', sublabel: 'Grounds & civil maintenance' },
  { value: 'Security Supervisor', label: 'Security Supervisor', sublabel: 'Gate & surveillance operations' },
  { value: 'Joint Secretary', label: 'Joint Secretary', sublabel: 'Administrative support' },
  { value: 'CUSTOM', label: 'Add your own', sublabel: 'Type custom committee title' },
];

export const AddAdminModal: React.FC<AddAdminModalProps> = ({ onClose, onSuccess }) => {
  const { token } = useAuth();
  const [fullName, setFullName] = useState('');
  const [designation, setDesignation] = useState('Secretary');
  const [customDesignation, setCustomDesignation] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const finalRole = designation === 'CUSTOM' ? customDesignation.trim() : designation;
    if (!finalRole) {
      setError('Please specify the committee role or designation');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    setIsSubmitting(true);

    try {
      const combinedName = `${fullName.trim()} (${finalRole})`;
      const res = await fetch('/api/auth/create-admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: combinedName,
          email: email.trim().toLowerCase(),
          password,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || 'Failed to create committee member');
      }

      setSuccessMsg(`Administrator account for ${combinedName} provisioned. Official credentials dispatched to ${email.trim().toLowerCase()}.`);
      setTimeout(() => {
        onSuccess();
      }, 1800);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
        <div className="modal-header">
          <div>
            <p className="eyebrow">SOCIETY COMMITTEE / ADMINISTRATION</p>
            <h2>Add Committee Member</h2>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
            <span>Close</span>
          </button>
        </div>

        {error && <div className="form-error">{error}</div>}
        {successMsg && (
          <div style={{ background: '#dcfce7', color: '#15803d', padding: '0.75rem 1rem', borderLeft: '3px solid #15803d', marginBottom: '1rem', fontSize: '0.88rem' }}>
            {successMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, color: 'var(--ink)', marginBottom: '0.4rem' }}>
              Full Name
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Vikram Mehta"
              style={{
                width: '100%',
                height: '44px',
                padding: '0 0.85rem',
                border: '1px solid var(--line)',
                borderRadius: '6px',
                background: 'var(--surface)',
                color: 'var(--ink)',
                fontSize: '0.88rem',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, color: 'var(--ink)', marginBottom: '0.4rem' }}>
              Committee Role & Designation
            </label>
            <CustomSelect
              options={designationOptions}
              value={designation}
              onChange={setDesignation}
            />

            {designation === 'CUSTOM' && (
              <div style={{ marginTop: '0.65rem' }}>
                <input
                  type="text"
                  required
                  autoFocus
                  value={customDesignation}
                  onChange={(e) => setCustomDesignation(e.target.value)}
                  placeholder="Type custom role (e.g. Electrical Incharge, Floor Representative)"
                  style={{
                    width: '100%',
                    height: '44px',
                    padding: '0 0.85rem',
                    border: '1px solid var(--blue)',
                    borderRadius: '6px',
                    background: 'var(--surface)',
                    color: 'var(--ink)',
                    fontSize: '0.88rem',
                  }}
                />
              </div>
            )}
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, color: 'var(--ink)', marginBottom: '0.4rem' }}>
              Official Admin Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. secretary@society.com"
              style={{
                width: '100%',
                height: '44px',
                padding: '0 0.85rem',
                border: '1px solid var(--line)',
                borderRadius: '6px',
                background: 'var(--surface)',
                color: 'var(--ink)',
                fontSize: '0.88rem',
              }}
            />
          </div>

          <div>
            <PasswordSuggestInput
              label="Initial Password"
              value={password}
              onChange={setPassword}
              placeholder="Enter password or click Suggest Strong Password"
            />
            <span style={{ fontSize: '0.74rem', color: 'var(--muted)', display: 'block', marginTop: '0.3rem' }}>
              Minimum 8 characters with numbers and symbols
            </span>
          </div>

          <div className="modal-actions" style={{ marginTop: '0.75rem' }}>
            <button type="button" className="button secondary" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" className="button primary" disabled={isSubmitting}>
              {isSubmitting ? 'Creating Admin...' : 'Provision Admin Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
