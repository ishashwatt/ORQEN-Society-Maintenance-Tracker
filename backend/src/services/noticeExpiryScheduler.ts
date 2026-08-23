import { query } from '../config/database';
import { sendEmail } from './emailService';

let isRunning = false;

export async function checkExpiredNotices(): Promise<void> {
  if (isRunning) return;
  isRunning = true;

  try {
    const expiredRes = await query(`
      SELECT * FROM notices
      WHERE status = 'ACTIVE'
        AND end_time IS NOT NULL
        AND end_time <= NOW()
        AND admin_notified_expired = false
    `);

    if (expiredRes.rowCount === 0) {
      isRunning = false;
      return;
    }

    const adminUsersRes = await query(`
      SELECT email, name FROM users WHERE role = 'ADMIN'
    `);
    const adminEmails = adminUsersRes.rows.map(r => r.email);
    if (!adminEmails.includes('testingrequiredapp@gmail.com')) {
      adminEmails.push('testingrequiredapp@gmail.com');
    }

    for (const notice of expiredRes.rows) {
      await query(
        `UPDATE notices
         SET status = 'EXPIRED', admin_notified_expired = true, updated_at = NOW()
         WHERE id = $1`,
        [notice.id]
      );

      const startFormatted = notice.start_time
        ? new Date(notice.start_time).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })
        : 'Immediate';
      const endFormatted = new Date(notice.end_time).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' });
      const durationTag = notice.approx_duration || 'Scheduled Window';
      const portalUrl = process.env.FRONTEND_URL || 'https://orqenthetracker.vercel.app';

      const subject = `Announcement Schedule Elapsed: ${notice.title} — ORQEN Operations`;

      const textBody = `ORQEN RESIDENTIAL OPERATIONS — ANNOUNCEMENT SCHEDULE NOTICE

Dear Administrator,

The scheduled approximate window for the public announcement below has concluded and has been marked as EXPIRED:

• Subject: ${notice.title}
• Urgency: ${notice.is_important ? 'High Priority / Urgent' : 'General Notice'}
• Approx. Duration: ${durationTag}
• Approx. Window: ${startFormatted} to ${endFormatted}
• Current Status: Expired & Archived from Active Resident Dashboard

OPERATIONAL ACTION:
This announcement has completed its active window and has been automatically archived from active resident dashboards. If ongoing society maintenance or advisory is still required, please log in to the ORQEN Admin Portal to extend the schedule or republish.

Portal URL: ${portalUrl}

Regards,
Automated Operations Engine
ORQEN Society Management Desk`;

      const htmlBody = `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #d4dce4; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
          <div style="background-color: #1e4f78; padding: 24px; color: #ffffff;">
            <p style="margin: 0 0 6px 0; font-family: monospace; font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase; color: #93c5fd;">ORQEN Operations Alert</p>
            <h2 style="margin: 0; font-size: 20px; font-weight: 600; color: #ffffff;">Announcement Schedule Concluded</h2>
          </div>
          
          <div style="padding: 24px; color: #20252b;">
            <p style="font-size: 15px; line-height: 1.5; margin-top: 0;">Dear Administrator,</p>
            <p style="font-size: 14px; line-height: 1.6; color: #4b5563;">The scheduled approximate time window for the following public announcement has reached its completion and is now marked as <strong>Expired</strong>:</p>
            
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-left: 4px solid #1e4f78; border-radius: 6px; padding: 16px; margin: 20px 0;">
              <h3 style="margin: 0 0 10px 0; font-size: 16px; color: #0f172a;">${notice.title}</h3>
              <p style="margin: 0 0 8px 0; font-size: 13px; color: #475569;">${notice.content}</p>
              <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 12px 0;" />
              <table style="width: 100%; font-size: 12px; color: #334155;">
                <tr>
                  <td style="padding: 3px 0; font-weight: 600; width: 140px;">Urgency Level:</td>
                  <td style="padding: 3px 0;">${notice.is_important ? '<span style="color: #b83a32; font-weight: bold;">High Priority / Urgent</span>' : 'General Notice'}</td>
                </tr>
                <tr>
                  <td style="padding: 3px 0; font-weight: 600;">Approx. Duration:</td>
                  <td style="padding: 3px 0; font-family: monospace; font-weight: bold; color: #1e4f78;">${durationTag}</td>
                </tr>
                <tr>
                  <td style="padding: 3px 0; font-weight: 600;">Approx. Active Window:</td>
                  <td style="padding: 3px 0;">${startFormatted} &mdash; ${endFormatted}</td>
                </tr>
                <tr>
                  <td style="padding: 3px 0; font-weight: 600;">Current Board Status:</td>
                  <td style="padding: 3px 0;"><span style="background: #f1f5f9; padding: 2px 8px; border-radius: 4px; font-weight: 600; font-size: 11px;">EXPIRED & ARCHIVED</span></td>
                </tr>
              </table>
            </div>

            <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 6px; padding: 14px; margin: 20px 0;">
              <p style="margin: 0; font-size: 13px; color: #1e3a8a; line-height: 1.5;">
                <strong>Next Step:</strong> You can extend this announcement's approximate schedule or delete it permanently from the Management Console.
              </p>
            </div>

            <div style="text-align: center; margin: 24px 0 12px;">
              <a href="${portalUrl}" style="display: inline-block; background-color: #1e4f78; color: #ffffff; text-decoration: none; padding: 10px 22px; border-radius: 6px; font-weight: 600; font-size: 14px;">Open Management Console</a>
            </div>

            <p style="font-size: 12px; color: #64748b; margin-bottom: 0; border-top: 1px solid #f1f5f9; padding-top: 14px;">
              ORQEN Residential Operations Desk &bull; Automated Notifications
            </p>
          </div>
        </div>
      `;

      for (const adminEmail of adminEmails) {
        try {
          await sendEmail({
            to: adminEmail,
            subject,
            text: textBody,
            html: htmlBody,
          });
        } catch (mailErr) {
          console.error('Failed to dispatch expiry alert email to admin:', adminEmail, mailErr);
        }
      }
    }
  } catch (err) {
    console.error('Error in notice expiry scheduler:', err);
  } finally {
    isRunning = false;
  }
}

let schedulerTimer: NodeJS.Timeout | null = null;

export function startNoticeExpiryScheduler(): void {
  if (schedulerTimer) return;
  checkExpiredNotices().catch(() => {});
  schedulerTimer = setInterval(() => {
    checkExpiredNotices().catch(() => {});
  }, 20000);
}

export function stopNoticeExpiryScheduler(): void {
  if (schedulerTimer) {
    clearInterval(schedulerTimer);
    schedulerTimer = null;
  }
}
