import React from 'react';

export interface HistoryItem {
  id: string;
  from_status: string | null;
  to_status: string;
  actor_name: string;
  actor_role: string;
  note: string | null;
  created_at: string;
}

interface TimelineProps {
  history: HistoryItem[];
}

export const Timeline: React.FC<TimelineProps> = ({ history }) => {
  if (!history || history.length === 0) {
    return <div style={{ color: 'var(--text-muted)' }}>No status history recorded yet.</div>;
  }

  return (
    <div className="timeline">
      {history.map((item) => (
        <div className="timeline-item" key={item.id}>
          <div className="timeline-dot" />
          <div className="timeline-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
              <span style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--ink)' }}>
                {item.from_status ? `${item.from_status} → ${item.to_status}` : `Status initialized as ${item.to_status}`}
              </span>
              <span style={{ fontSize: '0.76rem', color: 'var(--muted)', fontWeight: 500 }}>
                {new Date(item.created_at).toLocaleString()}
              </span>
            </div>

            <div style={{ fontSize: '0.84rem', color: 'var(--muted)' }}>
              By <strong style={{ color: 'var(--ink)' }}>{item.actor_name}</strong> ({item.actor_role})
            </div>

            {item.note && (
              <div
                style={{
                  marginTop: '0.5rem',
                  padding: '0.55rem 0.85rem',
                  background: 'rgba(30, 79, 120, 0.06)',
                  borderLeft: '3px solid var(--blue)',
                  borderRadius: '4px',
                  fontSize: '0.84rem',
                  color: 'var(--ink)',
                  lineHeight: 1.5,
                }}
              >
                "{item.note}"
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};
