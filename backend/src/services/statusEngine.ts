import { AppError } from '../middleware/errorHandler';

export type ComplaintStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';

const ALLOWED_TRANSITIONS: Record<ComplaintStatus, ComplaintStatus[]> = {
  OPEN: ['IN_PROGRESS', 'RESOLVED'],
  IN_PROGRESS: ['RESOLVED'],
  RESOLVED: [],
};

export function validateStatusTransition(currentStatus: ComplaintStatus, targetStatus: ComplaintStatus): void {
  if (currentStatus === targetStatus) {
    return;
  }

  if (currentStatus === 'RESOLVED') {
    throw new AppError(
      400,
      'INVALID_STATUS_TRANSITION',
      'A resolved complaint is terminal and cannot be reopened or moved back'
    );
  }

  const allowed = ALLOWED_TRANSITIONS[currentStatus] || [];
  if (!allowed.includes(targetStatus)) {
    throw new AppError(
      400,
      'INVALID_STATUS_TRANSITION',
      `Cannot transition status from ${currentStatus} to ${targetStatus}`
    );
  }
}
