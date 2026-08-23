import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { CustomSelect, SelectOption } from '../components/CustomSelect';

interface GoogleOnboardingModalProps {
  initialEmail: string;
  initialName: string;
  googleId?: string;
  onClose: () => void;
}

export const GoogleOnboardingModal: React.FC<GoogleOnboardingModalProps> = ({
  initialEmail,
  initialName,
  googleId,
  onClose,
}) => {
  const { login } = useAuth();
  const [flatNumber, setFlatNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [occupancyType, setOccupancyType] = useState<'OWNER' | 'TENANT'>('OWNER');
  const [documentType, setDocumentType] = useState<string>('AADHAAR');
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [documentPreview, setDocumentPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const documentOptions: SelectOption[] = [
    { value: 'AADHAAR', label: 'Aadhaar Card / Govt ID', sublabel: 'National photo identity' },
    { value: 'RENT_AGREEMENT', label: 'Rent Agreement', sublabel: 'Tenancy verification document' },
    { value: 'ELECTRICITY_BILL', label: 'Electricity / Utility Bill', sublabel: 'Active utility connection proof' },
    { value: 'POSSESSION_LETTER', label: 'Possession Letter / Sale Deed', sublabel: 'Property allotment deed' },
    { value: 'OTHER', label: 'Other Society Document', sublabel: 'Society-specific paperwork' },
  ];

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!flatNumber.trim()) {
      setError('Flat number is required');
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('email', initialEmail.toLowerCase().trim());
      formData.append('name', initialName.trim());
      if (googleId) formData.append('google_id', googleId);
      formData.append('flat_number', flatNumber.trim());
      if (phone.trim()) formData.append('phone', phone.trim());
      formData.append('occupancy_type', occupancyType);
      formData.append('document_type', documentType);
      if (documentFile) {
        formData.append('document', documentFile);
      }

      const res = await fetch('/api/auth/google/complete-onboarding', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || 'Failed to complete profile onboarding');
      }

      login(data.token, data.user);
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '1rem',
      }}
    >
      <div
        style={{
          background: 'var(--surface)',
          borderRadius: '12px',
          maxWidth: '520px',
          width: '100%',
          maxHeight: '92vh',
          overflowY: 'auto',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.25)',
          border: '1px solid var(--line)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid var(--line)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.2rem' }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.12em', color: 'var(--blue)', textTransform: 'uppercase' }}>
                ORQEN Society
              </span>
              <span style={{ color: 'var(--muted)', fontSize: '0.7rem' }}>/</span>
              <span style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>Resident Setup</span>
            </div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: 'var(--ink)' }}>
              Complete Resident Profile
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.4rem',
              color: 'var(--muted)',
              cursor: 'pointer',
              padding: '0.2rem 0.5rem',
            }}
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {error && (
            <div className="form-error">
              {error}
            </div>
          )}

          <div style={{ background: 'var(--subtle)', padding: '0.75rem 1rem', borderRadius: '6px', border: '1px solid var(--line)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Google Account</div>
            <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--ink)' }}>{initialName} ({initialEmail})</div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.82rem', fontWeight: 600, color: 'var(--ink)', margin: 0 }}>
              <span>Flat Number</span>
              <span style={{ color: 'var(--red)', fontWeight: 700 }}>*</span>
            </label>
            <input
              type="text"
              required
              value={flatNumber}
              onChange={(e) => setFlatNumber(e.target.value)}
              placeholder="e.g. C-402 or B-104"
              style={{ width: '100%', padding: '0.65rem 0.85rem' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.82rem', fontWeight: 600, color: 'var(--ink)', margin: 0 }}>
              <span>Occupancy Type</span>
              <span style={{ color: 'var(--red)', fontWeight: 700 }}>*</span>
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setOccupancyType('OWNER')}
                style={{
                  padding: '0.65rem',
                  borderRadius: '6px',
                  border: occupancyType === 'OWNER' ? '2px solid var(--blue)' : '1px solid var(--line)',
                  background: occupancyType === 'OWNER' ? 'rgba(37, 99, 235, 0.08)' : 'var(--surface)',
                  color: occupancyType === 'OWNER' ? 'var(--blue)' : 'var(--ink)',
                  fontWeight: 600,
                  fontSize: '0.82rem',
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
                  padding: '0.65rem',
                  borderRadius: '6px',
                  border: occupancyType === 'TENANT' ? '2px solid var(--red)' : '1px solid var(--line)',
                  background: occupancyType === 'TENANT' ? 'rgba(184, 58, 50, 0.08)' : 'var(--surface)',
                  color: occupancyType === 'TENANT' ? 'var(--red)' : 'var(--ink)',
                  fontWeight: 600,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                Tenant / Rented
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--ink)', margin: 0 }}>
              Contact Phone Number (Optional)
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. +91 98765 43210"
              style={{ width: '100%', padding: '0.65rem 0.85rem' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
            <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--ink)', margin: 0 }}>
              Residence Verification Document (Optional)
            </label>
            <CustomSelect
              options={documentOptions}
              value={documentType}
              onChange={(val) => setDocumentType(val)}
            />

            <div>
              {!documentFile ? (
                <label
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '2px dashed var(--line)',
                    borderRadius: '8px',
                    padding: '1.25rem 1rem',
                    background: 'var(--subtle)',
                    cursor: 'pointer',
                    transition: 'border-color 0.15s ease',
                  }}
                >
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                  />
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--blue)' }}>
                    Upload Aadhaar / Rent Agreement
                  </span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: '0.2rem' }}>
                    JPG, PNG, or PDF up to 10MB
                  </span>
                </label>
              ) : (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.75rem 1rem',
                    borderRadius: '8px',
                    border: '1px solid var(--line)',
                    background: 'var(--surface)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', overflow: 'hidden' }}>
                    {documentPreview ? (
                      <img
                        src={documentPreview}
                        alt="Preview"
                        style={{ width: '36px', height: '36px', objectFit: 'cover', borderRadius: '4px' }}
                      />
                    ) : (
                      <span style={{ fontSize: '1.4rem' }}>📄</span>
                    )}
                    <div style={{ overflow: 'hidden' }}>
                      <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--ink)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                        {documentFile.name}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>
                        {(documentFile.size / 1024 / 1024).toFixed(2)} MB
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveFile}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--red)',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button
              type="button"
              onClick={onClose}
              className="button secondary"
              style={{ flex: 1 }}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="button primary"
              style={{ flex: 2 }}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving Profile...' : 'Complete Registration'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
