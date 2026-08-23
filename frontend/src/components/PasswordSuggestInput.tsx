import React, { useState } from 'react';

export const generateCryptographicPassword = (): string => {
  const uppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lowercase = 'abcdefghijkmnopqrstuvwxyz';
  const numbers = '23456789';
  const symbols = '!@#$%^&*';
  const allChars = uppercase + lowercase + numbers + symbols;

  const array = new Uint32Array(16);
  if (typeof window !== 'undefined' && window.crypto) {
    window.crypto.getRandomValues(array);
  } else {
    for (let i = 0; i < 16; i++) {
      array[i] = Math.floor(Math.random() * 1000000000);
    }
  }

  const pwd = [
    uppercase[array[0] % uppercase.length],
    lowercase[array[1] % lowercase.length],
    numbers[array[2] % numbers.length],
    symbols[array[3] % symbols.length],
  ];

  for (let i = 4; i < 16; i++) {
    pwd.push(allChars[array[i] % allChars.length]);
  }

  for (let i = pwd.length - 1; i > 0; i--) {
    const j = array[i] % (i + 1);
    [pwd[i], pwd[j]] = [pwd[j], pwd[i]];
  }

  const raw = pwd.join('');
  return `${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}-${raw.slice(12, 16)}`;
};

interface PasswordSuggestInputProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  id?: string;
  autoComplete?: string;
  dataTestId?: string;
  required?: boolean;
  minLength?: number;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  onKeyUp?: (e: React.KeyboardEvent) => void;
}

export const PasswordSuggestInput: React.FC<PasswordSuggestInputProps> = ({
  value,
  onChange,
  label,
  placeholder = '••••••••',
  id,
  autoComplete = 'new-password',
  dataTestId,
  required = true,
  minLength = 8,
  onKeyDown,
  onKeyUp,
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [generatedFlash, setGeneratedFlash] = useState(false);

  const handleGenerate = (e: React.MouseEvent) => {
    e.preventDefault();
    const newPwd = generateCryptographicPassword();
    onChange(newPwd);
    setShowPassword(true);
    setGeneratedFlash(true);
    setTimeout(() => setGeneratedFlash(false), 2000);
  };

  return (
    <div className="password-suggest-wrap" style={{ width: '100%' }}>
      {label && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
          <label htmlFor={id} style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--ink)', margin: 0 }}>
            {label}
          </label>
          <button
            type="button"
            className="suggest-password-header-btn"
            onClick={handleGenerate}
            title="Generate secure cryptographic password"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
            <span>{generatedFlash ? 'Generated!' : 'Suggest Strong Password'}</span>
          </button>
        </div>
      )}

      <div className="password-field-container">
        <input
          id={id}
          data-testid={dataTestId}
          type={showPassword ? 'text' : 'password'}
          required={required}
          minLength={minLength}
          autoComplete={autoComplete}
          value={value}
          placeholder={placeholder}
          onKeyDown={onKeyDown}
          onKeyUp={onKeyUp}
          onChange={(e) => onChange(e.target.value)}
          className="password-inline-input"
          style={{ paddingRight: '2.75rem' }}
        />

        <button
          type="button"
          className="password-toggle-btn-inline"
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
    </div>
  );
};
