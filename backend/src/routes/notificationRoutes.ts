import { Router, Response } from 'express';
import { query, inMemStore } from '../config/database';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const user = req.user!;
    let notifications: any[] = [];
    let readIds = new Set<string>();

    try {
      const readRes = await query(
        'SELECT notification_id FROM user_read_notifications WHERE user_id = $1',
        [user.id]
      );
      readRes.rows.forEach(r => readIds.add(r.notification_id));
    } catch (e) {
      inMemStore.readNotificationIds.forEach(id => readIds.add(id));
    }

    if (user.role === 'ADMIN') {
      let complaints: any[] = [];
      let residents: any[] = [];

      try {
        const compRes = await query(
          `SELECT c.*, cat.name as category_name 
           FROM complaints c 
           JOIN categories cat ON c.category_id = cat.id 
           ORDER BY c.created_at DESC 
           LIMIT 30`
        );
        const resRes = await query(
          `SELECT * FROM users 
           WHERE role = $1 
           ORDER BY created_at DESC 
           LIMIT 30`,
          ['RESIDENT']
        );
        complaints = compRes.rows;
        residents = resRes.rows;
      } catch (e) {
        complaints = inMemStore.complaints.map(c => {
          const cat = inMemStore.categories.find(k => k.id === c.category_id);
          return { ...c, category_name: cat ? cat.name : 'Maintenance' };
        });
        residents = inMemStore.users.filter(u => u.role === 'RESIDENT');
      }

      complaints.forEach((c) => {
        const id = `complaint-${c.id}`;
        notifications.push({
          id,
          title: `New Request: Flat ${c.flat_number} (${c.category_name})`,
          description: c.description,
          type: 'COMPLAINT',
          entity_id: c.id,
          is_read: readIds.has(id),
          created_at: c.created_at,
          flat_number: c.flat_number,
        });
      });

      residents.filter(r => !r.is_verified).forEach((r) => {
        const id = `resident-${r.id}`;
        const occ = r.occupancy_type ? `[${r.occupancy_type}] ` : '';
        const phoneStr = r.phone ? ` • Ph: ${r.phone}` : '';
        const docStr = r.document_reference ? ' • Proof Document Attached' : '';
        notifications.push({
          id,
          title: `Flat Verification: Flat ${r.flat_number} (${r.occupancy_type || 'RESIDENT'})`,
          description: `${occ}${r.name} (${r.email})${phoneStr}${docStr}`,
          type: 'RESIDENT_APPROVAL',
          entity_id: r.id,
          is_read: readIds.has(id),
          created_at: r.created_at,
          flat_number: r.flat_number,
          phone: r.phone,
          occupancy_type: r.occupancy_type,
          document_reference: r.document_reference,
          document_type: r.document_type,
        });
      });

      notifications.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } else {
      let notices: any[] = [];
      try {
        const nRes = await query(
          `SELECT * FROM notices 
           WHERE (status = 'ACTIVE' OR status IS NULL)
           ORDER BY created_at DESC 
           LIMIT 20`
        );
        notices = nRes.rows;
      } catch (e) {
        notices = inMemStore.notices;
      }

      notices.forEach((n) => {
        const id = `notice-${n.id}`;
        notifications.push({
          id,
          title: n.title,
          description: n.content,
          type: 'NOTICE',
          entity_id: n.id,
          is_read: readIds.has(id),
          created_at: n.created_at,
        });
      });
    }

    const unreadCount = notifications.filter(n => !n.is_read).length;

    res.json({
      notifications,
      unread_count: unreadCount,
    });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id/read', authenticate, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    try {
      await query(
        `INSERT INTO user_read_notifications (user_id, notification_id, read_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (user_id, notification_id) DO UPDATE SET read_at = NOW()`,
        [userId, id]
      );

      if (id.startsWith('notice-')) {
        const noticeId = id.replace('notice-', '');
        await query(
          `INSERT INTO user_notice_reads (user_id, notice_id, read_at)
           VALUES ($1, $2, NOW())
           ON CONFLICT (user_id, notice_id) DO UPDATE SET read_at = NOW()`,
          [userId, noticeId]
        );
      }
    } catch (e) {
      inMemStore.readNotificationIds.add(id);
    }

    res.json({ message: 'Marked as read', id });
  } catch (err) {
    next(err);
  }
});

router.patch('/read-all', authenticate, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const user = req.user!;
    const userId = user.id;

    if (user.role === 'ADMIN') {
      try {
        const compRes = await query('SELECT id FROM complaints ORDER BY created_at DESC LIMIT 50');
        const userRes = await query('SELECT id FROM users WHERE role = $1 AND is_verified = false', ['RESIDENT']);

        for (const c of compRes.rows) {
          await query(
            `INSERT INTO user_read_notifications (user_id, notification_id, read_at)
             VALUES ($1, $2, NOW())
             ON CONFLICT (user_id, notification_id) DO UPDATE SET read_at = NOW()`,
            [userId, `complaint-${c.id}`]
          );
        }

        for (const u of userRes.rows) {
          await query(
            `INSERT INTO user_read_notifications (user_id, notification_id, read_at)
             VALUES ($1, $2, NOW())
             ON CONFLICT (user_id, notification_id) DO UPDATE SET read_at = NOW()`,
            [userId, `resident-${u.id}`]
          );
        }
      } catch (e) {
        inMemStore.complaints.forEach(c => inMemStore.readNotificationIds.add(`complaint-${c.id}`));
        inMemStore.users.forEach(u => inMemStore.readNotificationIds.add(`resident-${u.id}`));
      }
    } else {
      try {
        const noticeRes = await query(`SELECT id FROM notices WHERE (status = 'ACTIVE' OR status IS NULL)`);
        for (const n of noticeRes.rows) {
          await query(
            `INSERT INTO user_read_notifications (user_id, notification_id, read_at)
             VALUES ($1, $2, NOW())
             ON CONFLICT (user_id, notification_id) DO UPDATE SET read_at = NOW()`,
            [userId, `notice-${n.id}`]
          );
          await query(
            `INSERT INTO user_notice_reads (user_id, notice_id, read_at)
             VALUES ($1, $2, NOW())
             ON CONFLICT (user_id, notice_id) DO UPDATE SET read_at = NOW()`,
            [userId, n.id]
          );
        }
      } catch (e) {
        inMemStore.notices.forEach(n => inMemStore.readNotificationIds.add(`notice-${n.id}`));
      }
    }

    res.json({ message: 'All notifications marked as read', unread_count: 0 });
  } catch (err) {
    next(err);
  }
});

export default router;
