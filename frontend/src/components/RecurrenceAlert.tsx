import React from 'react';

interface RecurrenceAlertProps {
  flatNumber: string;
  categoryName: string;
  count: number;
}

export const RecurrenceAlert: React.FC<RecurrenceAlertProps> = ({ flatNumber, categoryName, count }) => {
  return (
    <div className="alert-warning">
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.2rem' }}>
          Potential Recurring Maintenance Issue Detected
        </div>
        <div style={{ fontSize: '0.85rem' }}>
          Flat <strong>{flatNumber}</strong> has registered <strong>{count} complaints</strong> under the <strong>{categoryName}</strong> category within the last 30 days. Consider scheduling a comprehensive diagnostic inspection.
        </div>
      </div>
    </div>
  );
};
