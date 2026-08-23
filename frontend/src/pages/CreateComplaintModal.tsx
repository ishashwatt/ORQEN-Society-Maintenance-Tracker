import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { CustomSelect, SelectOption } from '../components/CustomSelect';

interface CreateComplaintModalProps {
  onClose: () => void;
  onSuccess: () => void;
  initialCategoryId?: string;
}

export const CreateComplaintModal: React.FC<CreateComplaintModalProps> = ({
  onClose,
  onSuccess,
  initialCategoryId,
}) => {
  const { token } = useAuth();
  const [categories, setCategories] = useState<any[]>([]);
  const [categoryId, setCategoryId] = useState(initialCategoryId || '');
  const [customCategoryName, setCustomCategoryName] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('MEDIUM');
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [idempotencyKey] = useState(
    () => `req-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/categories', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.categories) {
          setCategories(data.categories);
          if (data.categories.length > 0) {
            if (initialCategoryId && data.categories.some((c: any) => c.id === initialCategoryId)) {
              setCategoryId(initialCategoryId);
            } else if (!categoryId) {
              setCategoryId(data.categories[0].id);
            }
          }
        }
      })
      .catch(() => {});
  }, [token, initialCategoryId]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPhoto(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleRemovePhoto = () => {
    setPhoto(null);
    setPhotoPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (categoryId === 'OTHER_CUSTOM' && !customCategoryName.trim()) {
      setError('Please specify your custom issue / category name');
      return;
    }

    if (description.trim().length < 10) {
      setError('Description must be at least 10 characters long');
      return;
    }

    setIsSubmitting(true);

    try {
      let finalCategoryId = categoryId;
      let finalDescription = description;

      if (categoryId === 'OTHER_CUSTOM') {
        const otherCat = categories.find(
          (c) => c.name.toLowerCase().includes('other') || c.name.toLowerCase().includes('custom')
        ) || categories[0];
        finalCategoryId = otherCat ? otherCat.id : categories[0]?.id;
        finalDescription = `[Category: ${customCategoryName.trim()}]\n${description.trim()}`;
      }

      const formData = new FormData();
      formData.append('category_id', finalCategoryId);
      formData.append('description', finalDescription);
      formData.append('priority', priority);
      if (photo) {
        formData.append('photo', photo);
      }

      const res = await fetch('/api/complaints', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'X-Idempotency-Key': idempotencyKey,
        },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Failed to submit complaint');

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const categoryOptions: SelectOption[] = [
    ...categories.map((cat) => ({
      value: cat.id,
      label: cat.name,
      sublabel: `SLA: ${cat.default_sla_hours} hours`,
    })),
    {
      value: 'OTHER_CUSTOM',
      label: 'Other / Write your own issue category',
      sublabel: 'Specify custom maintenance or society request',
    },
  ];

  const priorityOptions: SelectOption[] = [
    { value: 'LOW', label: 'Low Priority', sublabel: 'Routine maintenance' },
    { value: 'MEDIUM', label: 'Medium Priority', sublabel: 'Standard turnaround' },
    { value: 'HIGH', label: 'High Priority (Urgent)', sublabel: 'Immediate dispatch' },
  ];

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '620px' }}>
        <div className="modal-header">
          <div>
            <p className="eyebrow">NEW ENTRY</p>
            <h2>Report Maintenance Issue</h2>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
            <span>Close</span>
          </button>
        </div>

        {error && (
          <div className="form-error" style={{ marginBottom: '1.25rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, color: 'var(--ink)', marginBottom: '0.45rem' }}>
              Maintenance Category
            </label>
            <CustomSelect
              options={categoryOptions}
              value={categoryId}
              onChange={setCategoryId}
              placeholder="Select Maintenance Category"
            />

            {categoryId === 'OTHER_CUSTOM' && (
              <div style={{ marginTop: '0.85rem', background: 'rgba(30, 79, 120, 0.04)', border: '1px solid var(--line)', borderRadius: '6px', padding: '0.85rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                  <label style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--blue)', margin: 0 }}>
                    Write Your Custom Issue / Category Name
                  </label>
                  {customCategoryName.trim().length > 3 && (
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          const res = await fetch('/api/complaints/format-text', {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                              Authorization: `Bearer ${token}`,
                            },
                            body: JSON.stringify({ text: customCategoryName, is_title: true }),
                          });
                          const d = await res.json();
                          if (d.formatted) setCustomCategoryName(d.formatted);
                        } catch (e) {}
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--blue)',
                        fontSize: '0.76rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        padding: '0.15rem 0.4rem',
                        borderRadius: '4px',
                      }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 20h9"></path>
                        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                      </svg>
                      Auto-Format
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  required
                  value={customCategoryName}
                  onChange={(e) => setCustomCategoryName(e.target.value)}
                  placeholder="e.g. Balcony pigeon netting, Intercom line distortion, Main door latch repair..."
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '0.65rem 0.85rem',
                    border: '1px solid var(--line)',
                    borderRadius: '4px',
                    background: 'var(--surface)',
                    color: 'var(--ink)',
                    fontSize: '0.88rem',
                  }}
                />
              </div>
            )}
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.45rem' }}>
              <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, color: 'var(--ink)', margin: 0 }}>
                Issue Description
              </label>
              {description.trim().length > 3 && (
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const res = await fetch('/api/complaints/format-text', {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          Authorization: `Bearer ${token}`,
                        },
                        body: JSON.stringify({ text: description, is_title: false }),
                      });
                      const d = await res.json();
                      if (d.formatted) setDescription(d.formatted);
                    } catch (e) {}
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--blue)',
                    fontSize: '0.76rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    padding: '0.15rem 0.4rem',
                    borderRadius: '4px',
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 20h9"></path>
                    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                  </svg>
                  Auto-Format & Clean
                </button>
              )}
            </div>
            <textarea
              required
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the issue, location, or symptoms clearly (e.g. leaking flush valve in master bathroom)..."
              style={{
                width: '100%',
                padding: '0.85rem',
                border: '1px solid var(--line)',
                borderRadius: '6px',
                background: 'var(--surface)',
                color: 'var(--ink)',
                fontSize: '0.9rem',
                lineHeight: 1.5,
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, color: 'var(--ink)', marginBottom: '0.45rem' }}>
                Priority Level
              </label>
              <CustomSelect
                options={priorityOptions}
                value={priority}
                onChange={setPriority}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, color: 'var(--ink)', marginBottom: '0.45rem' }}>
                Photo Proof (Optional)
              </label>
              <input
                type="file"
                ref={fileInputRef}
                accept="image/jpeg,image/png,image/webp"
                onChange={handlePhotoChange}
                style={{ display: 'none' }}
              />
              {!photoPreview ? (
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    width: '100%',
                    height: '44px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    fontSize: '0.84rem',
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                    <circle cx="12" cy="13" r="4"></circle>
                  </svg>
                  Attach Photo Proof
                </button>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', height: '44px' }}>
                  <img
                    src={photoPreview}
                    alt="Upload Preview"
                    style={{ width: '44px', height: '44px', objectFit: 'cover', borderRadius: '4px', border: '1px solid var(--line)' }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--ink)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                      {photo?.name}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>
                      {((photo?.size || 0) / (1024 * 1024)).toFixed(2)} MB
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--red)',
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      padding: '0.3rem',
                    }}
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
            >
              Cancel
            </button>
            <button
              type="submit"
              className="button primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Submitting Issue...' : 'Submit Issue'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
