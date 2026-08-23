import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { query, inMemStore } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { authenticate, requireRole, AuthenticatedRequest } from '../middleware/auth';
import { formatSmartTitle, formatSmartText } from '../services/textFormatterService';
import { buildNoticeBroadcastEmail } from '../services/emailTemplateService';

const router = Router();

const NoticeSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  content: z.string().min(5, 'Content must be at least 5 characters'),
  is_important: z.boolean().optional().default(false),
  start_time: z.string().optional().nullable(),
  end_time: z.string().optional().nullable(),
  approx_duration: z.string().optional().nullable(),
});

router.get('/', authenticate, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const userId = req.user!.id;
    const isResident = req.user!.role === 'RESIDENT';

    const sql = isResident
      ? `SELECT n.*, (unr.read_at IS NOT NULL) as is_read
         FROM notices n
         LEFT JOIN user_notice_reads unr ON n.id = unr.notice_id AND unr.user_id = $1
         WHERE (n.status = 'ACTIVE' OR n.status IS NULL)
           AND (n.end_time IS NULL OR n.end_time > NOW())
         ORDER BY n.is_important DESC, n.created_at DESC`
      : `SELECT n.*, (unr.read_at IS NOT NULL) as is_read
         FROM notices n
         LEFT JOIN user_notice_reads unr ON n.id = unr.notice_id AND unr.user_id = $1
         ORDER BY 
           CASE WHEN (n.status = 'ACTIVE' OR n.status IS NULL) AND (n.end_time IS NULL OR n.end_time > NOW()) THEN 0 ELSE 1 END,
           n.is_important DESC,
           n.created_at DESC`;

    const nRes = await query(sql, [userId]);
    res.json({ notices: nRes.rows });
  } catch (err) {
    next(err);
  }
});

router.get('/unread-summary', authenticate, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const userId = req.user!.id;
    const result = await query(
      `SELECT 
         COUNT(*)::int as total_active,
         COUNT(CASE WHEN unr.read_at IS NULL THEN 1 END)::int as unread_count,
         COUNT(CASE WHEN unr.read_at IS NULL AND n.is_important = true THEN 1 END)::int as unread_important_count
       FROM notices n
       LEFT JOIN user_notice_reads unr ON n.id = unr.notice_id AND unr.user_id = $1
       WHERE (n.status = 'ACTIVE' OR n.status IS NULL)
         AND (n.end_time IS NULL OR n.end_time > NOW())`,
      [userId]
    );

    const counts = result.rows[0] || { total_active: 0, unread_count: 0, unread_important_count: 0 };
    res.json(counts);
  } catch (err) {
    next(err);
  }
});

router.post('/:id/read', authenticate, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    await query(
      `INSERT INTO user_notice_reads (user_id, notice_id, read_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (user_id, notice_id) DO UPDATE SET read_at = NOW()`,
      [userId, id]
    );

    try {
      await query(
        `INSERT INTO user_read_notifications (user_id, notification_id, read_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (user_id, notification_id) DO UPDATE SET read_at = NOW()`,
        [userId, `notice-${id}`]
      );
    } catch (e) {}

    res.json({ success: true, notice_id: id });
  } catch (err) {
    next(err);
  }
});

router.post('/read-all', authenticate, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const userId = req.user!.id;
    await query(
      `INSERT INTO user_notice_reads (user_id, notice_id, read_at)
       SELECT $1, id, NOW() FROM notices
       WHERE (status = 'ACTIVE' OR status IS NULL)
       ON CONFLICT (user_id, notice_id) DO UPDATE SET read_at = NOW()`,
      [userId]
    );

    try {
      await query(
        `INSERT INTO user_read_notifications (user_id, notification_id, read_at)
         SELECT $1, 'notice-' || id, NOW() FROM notices
         WHERE (status = 'ACTIVE' OR status IS NULL)
         ON CONFLICT (user_id, notification_id) DO UPDATE SET read_at = NOW()`,
        [userId]
      );
    } catch (e) {}

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

router.post('/', authenticate, requireRole('ADMIN'), async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const body = NoticeSchema.parse(req.body);
    const user = req.user!;
    const noticeId = uuidv4();
    const now = new Date();

    const formattedTitle = formatSmartTitle(body.title);
    const formattedContent = formatSmartText(body.content);

    const startTime = body.start_time ? new Date(body.start_time) : now;
    const endTime = body.end_time ? new Date(body.end_time) : null;
    const approxDuration = body.approx_duration || (endTime ? 'Approx. Scheduled Window' : null);

    await query(
      `INSERT INTO notices (id, title, content, is_important, start_time, end_time, approx_duration, status, admin_notified_expired, created_by, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'ACTIVE', false, $8, $9, $9)`,
      [noticeId, formattedTitle, formattedContent, body.is_important, startTime, endTime, approxDuration, user.id, now]
    );

    let residentList: any[] = [];
    try {
      const dbResidents = await query('SELECT id, name, email, flat_number FROM users WHERE role = $1', ['RESIDENT']);
      residentList = dbResidents.rows;
    } catch (e) {
      residentList = inMemStore.users.filter(u => u.role === 'RESIDENT');
    }

    const startStr = startTime.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' });
    const endStr = endTime ? endTime.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' }) : 'Ongoing Advisory';
    const durationStr = approxDuration ? ` (${approxDuration})` : '';

    for (const r of residentList) {
      const notifId = uuidv4();
      const emailData = buildNoticeBroadcastEmail({
        title: formattedTitle,
        content: formattedContent,
        isImportant: body.is_important,
        startFormatted: startStr,
        endFormatted: endStr,
        durationTag: approxDuration,
        residentName: r.name,
        flatNumber: r.flat_number,
      });

      try {
        await query(
          `INSERT INTO notifications (id, recipient_id, recipient_email, subject, body, status, attempts)
           VALUES ($1, $2, $3, $4, $5, 'PENDING', 0)`,
          [notifId, r.id || null, r.email, emailData.subject, emailData.text]
        );
      } catch (ne) {}
    }

    res.status(201).json({
      notice: {
        id: noticeId,
        title: formattedTitle,
        content: formattedContent,
        is_important: body.is_important,
        start_time: startTime,
        end_time: endTime,
        approx_duration: approxDuration,
        status: 'ACTIVE',
        created_by: user.id,
        created_at: now,
        updated_at: now,
      },
      dispatched_count: residentList.length,
    });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id/extend', authenticate, requireRole('ADMIN'), async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const { id } = req.params;
    const { hours, new_end_time, approx_duration } = req.body;
    const now = new Date();

    const existingRes = await query('SELECT * FROM notices WHERE id = $1', [id]);
    if (existingRes.rowCount === 0) {
      throw new AppError(404, 'NOTICE_NOT_FOUND', 'Notice record not found');
    }

    const existing = existingRes.rows[0];
    let computedEndTime: Date;

    if (new_end_time) {
      computedEndTime = new Date(new_end_time);
    } else if (hours && typeof hours === 'number') {
      const baseTime = existing.end_time && new Date(existing.end_time) > now ? new Date(existing.end_time) : now;
      computedEndTime = new Date(baseTime.getTime() + hours * 60 * 60 * 1000);
    } else {
      computedEndTime = new Date(now.getTime() + 4 * 60 * 60 * 1000);
    }

    const durationLabel = approx_duration || `Approx. Extended Window (${hours || 4}h)`;

    const updateRes = await query(
      `UPDATE notices
       SET end_time = $1, approx_duration = $2, status = 'ACTIVE', admin_notified_expired = false, updated_at = $3
       WHERE id = $4
       RETURNING *`,
      [computedEndTime, durationLabel, now, id]
    );

    res.json({ notice: updateRes.rows[0], message: 'Notice schedule successfully extended' });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', authenticate, requireRole('ADMIN'), async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const { id } = req.params;
    const body = NoticeSchema.parse(req.body);
    const now = new Date();

    const formattedTitle = formatSmartTitle(body.title);
    const formattedContent = formatSmartText(body.content);

    const startTime = body.start_time ? new Date(body.start_time) : undefined;
    const endTime = body.end_time ? new Date(body.end_time) : undefined;
    const approxDuration = body.approx_duration;

    const updateRes = await query(
      `UPDATE notices
       SET title = $1,
           content = $2,
           is_important = $3,
           start_time = COALESCE($4, start_time),
           end_time = $5,
           approx_duration = $6,
           status = 'ACTIVE',
           admin_notified_expired = false,
           updated_at = $7
       WHERE id = $8
       RETURNING *`,
      [formattedTitle, formattedContent, body.is_important, startTime, endTime, approxDuration, now, id]
    );

    if (updateRes.rowCount === 0) {
      throw new AppError(404, 'NOTICE_NOT_FOUND', 'Notice record not found');
    }

    res.json({ notice: updateRes.rows[0] });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', authenticate, requireRole('ADMIN'), async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const { id } = req.params;
    await query('DELETE FROM notices WHERE id = $1', [id]);
    await query('DELETE FROM user_notice_reads WHERE notice_id = $1', [id]);
    res.json({ message: 'Notice deleted successfully', id });
  } catch (err) {
    next(err);
  }
});

export default router;
