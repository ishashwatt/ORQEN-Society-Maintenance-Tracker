import React from 'react';

interface StatusBadgeProps {
  status: string;
  isOverdue?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, isOverdue }) => {
  if (isOverdue && status !== 'RESOLVED') {
    return <span className="status-badge OVERDUE">OVERDUE</span>;
  }

  return (
    <span className={`status-badge ${status}`}>
      {status === 'IN_PROGRESS' ? 'IN PROGRESS' : status}
    </span>
  );
};
