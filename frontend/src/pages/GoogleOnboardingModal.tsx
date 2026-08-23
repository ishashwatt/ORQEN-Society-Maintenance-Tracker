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
  const [phoneOtp, setPhoneOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
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

  const handleSendPhoneOtp = async () => {
    if (!phone || phone.length < 10) {
      setError('Please enter a valid 10-digit phone number');
      return;
    }
    setSendingOtp(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Failed to send OTP');
      setOtpSent(true);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSendingOtp(false);
    }
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!flatNumber.trim()) {
      setError('Flat number is required');
      return;
    }

    if (!phone.trim()) {
      setError('Phone number is required');
      return;
    }

    if (!phoneOtp || phoneOtp.length < 6) {
      setError('Please enter the 6-digit phone verification OTP');
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('email', initialEmail.toLowerCase().trim());
      formData.append('name', initialName.trim());
      if (googleId) formData.append('google_id', googleId);
      formData.append('flat_number', flatNumber.trim());
      formData.append('phone', phone.trim());
      formData.append('phone_otp', phoneOtp.trim());
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
        throw new Error(data.error?.message || 'Onboarding failed');
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
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '1.25rem',
      }}
    >
      <div
        style={{
          background: 'var(--card-bg, #ffffff)',
          border: '1px solid var(--line)',
          borderRadius: '8px',
          padding: '1.75rem 2rem',
          maxWidth: '540px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          scrollbarWidth: 'thin',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, color: 'var(--ink)' }}>
              Complete Resident Onboarding
            </h2>
            <p style={{ margin: '0.3rem 0 0', fontSize: '0.82rem', color: 'var(--muted)' }}>
              Google Verified Account: <strong style={{ color: 'var(--ink)' }}>{initialEmail}</strong>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.25rem',
              cursor: 'pointer',
              color: 'var(--muted)',
              padding: '0.25rem',
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="form-error" style={{ marginBottom: '1.1rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.82rem', fontWeight: 600, color: 'var(--ink)', margin: 0 }}>
              <span>Assigned Flat / Unit Number</span>
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
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.82rem', fontWeight: 600, color: 'var(--ink)', margin: 0 }}>
              <span>Contact Phone Number</span>
              <span style={{ color: 'var(--red)', fontWeight: 700 }}>*</span>
            </label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. 9876543210"
                style={{ flex: 1, padding: '0.65rem 0.85rem' }}
              />
              <button
                type="button"
                onClick={handleSendPhoneOtp}
                disabled={sendingOtp}
                className="button secondary"
                style={{ padding: '0 1rem', fontSize: '0.82rem', whiteSpace: 'nowrap' }}
              >
                {sendingOtp ? 'Sending...' : otpSent ? 'Resend OTP' : 'Send OTP'}
              </button>
            </div>

            <div
              style={{
                background: 'rgba(37, 99, 235, 0.05)',
                border: '1px solid rgba(37, 99, 235, 0.15)',
                borderRadius: '6px',
                padding: '0.6rem 0.85rem',
                marginTop: '0.35rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '0.78rem',
              }}
            >
              <div>
                <span style={{ color: 'var(--muted)' }}>Demo Master OTP: </span>
                <strong style={{ color: 'var(--blue)' }}>123456</strong>
              </div>
              <button
                type="button"
                onClick={() => {
                  setPhoneOtp('123456');
                  setOtpSent(true);
                }}
                style={{
                  background: 'var(--blue)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '0.25rem 0.6rem',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Autofill OTP (123456)
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginTop: '0.5rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.82rem', fontWeight: 600, color: 'var(--ink)', margin: 0 }}>
                <span>Enter 6-Digit Phone OTP</span>
                <span style={{ color: 'var(--red)', fontWeight: 700 }}>*</span>
              </label>
              <input
                type="text"
                required
                maxLength={6}
                value={phoneOtp}
                onChange={(e) => setPhoneOtp(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="123456"
                style={{ width: '100%', letterSpacing: '0.25em', fontWeight: 700, padding: '0.65rem 0.85rem' }}
              />
            </div>
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
                    padding: '0.85rem',
                    border: '1px dashed var(--line)',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    background: 'var(--surface)',
                    gap: '0.35rem',
                    fontSize: '0.78rem',
                    color: 'var(--muted)',
                  }}
                >
                  <span>Attach Document Photo or PDF (Max 10MB)</span>
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                  />
                </label>
              ) : (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'var(--surface)',
                    border: '1px solid var(--line)',
                    borderRadius: '6px',
                    padding: '0.5rem 0.75rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {documentPreview ? (
                      <img src={documentPreview} alt="Proof preview" style={{ width: '32px', height: '32px', objectFit: 'cover', borderRadius: '4px' }} />
                    ) : (
                      <span style={{ fontSize: '0.78rem', color: 'var(--ink)' }}>{documentFile.name}</span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveFile}
                    style={{ background: 'none', border: 'none', color: 'var(--red)', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600 }}
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button
              type="button"
              className="button secondary"
              onClick={onClose}
              disabled={isSubmitting}
              style={{ padding: '0.65rem 1.25rem' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="button primary"
              disabled={isSubmitting}
              style={{ padding: '0.65rem 1.25rem' }}
            >
              {isSubmitting ? 'Verifying & Submitting...' : 'Complete Society Verification'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
