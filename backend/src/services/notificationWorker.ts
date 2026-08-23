import { query, inMemStore } from '../config/database';
import { sendEmail } from './emailService';

export async function processNotificationsQueue(): Promise<{ processed: number; succeeded: number; failed: number }> {
  let pendingList: any[] = [];

  try {
    const res = await query(
      `SELECT * FROM notifications WHERE status = 'PENDING' AND attempts < 3 ORDER BY created_at ASC LIMIT 10`
    );
    pendingList = res.rows;
  } catch (e) {
    pendingList = inMemStore.notifications.filter(n => n.status === 'PENDING' && n.attempts < 3);
  }

  let succeeded = 0;
  let failed = 0;

  for (const item of pendingList) {
    try {
      item.attempts = (item.attempts || 0) + 1;

      if (item.recipient_email) {
        await sendEmail({
          to: item.recipient_email,
          subject: item.subject,
          text: item.body,
        });
      }

      item.status = 'SENT';
      item.sent_at = new Date();
      succeeded++;

      try {
        await query(
          `UPDATE notifications SET status = 'SENT', attempts = $1, sent_at = NOW() WHERE id = $2`,
          [item.attempts, item.id]
        );
      } catch (e) {}
    } catch (err: any) {
      failed++;
      item.status = item.attempts >= 3 ? 'FAILED' : 'PENDING';
      item.last_error = err.message || 'Notification error';

      try {
        await query(
          `UPDATE notifications SET status = $1, attempts = $2, last_error = $3 WHERE id = $4`,
          [item.status, item.attempts, item.last_error, item.id]
        );
      } catch (e) {}
    }
  }

  return { processed: pendingList.length, succeeded, failed };
}

export function startNotificationWorker(intervalMs = 30000): NodeJS.Timeout {
  return setInterval(() => {
    processNotificationsQueue().catch(() => {});
  }, intervalMs);
}
