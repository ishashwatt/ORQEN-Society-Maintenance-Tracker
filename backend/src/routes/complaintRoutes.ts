import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { query, transaction, inMemStore } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { authenticate, requireRole, AuthenticatedRequest } from '../middleware/auth';
import { validateStatusTransition, ComplaintStatus } from '../services/statusEngine';
import { uploadPhoto, deleteFileIfExists } from '../services/photoStorage';
import { detectRecurrenceForFlatAndCategory } from '../services/recurrenceEngine';

import { formatSmartText, formatSmartTitle } from '../services/textFormatterService';

const router = Router();

router.post('/format-text', authenticate, (req, res) => {
  const text = (req.body.text as string) || '';
  const isTitle = req.body.is_title === true;
  const formatted = isTitle ? formatSmartTitle(text) : formatSmartText(text);
  res.json({ original: text, formatted });
});

const CreateComplaintSchema = z.object({
  category_id: z.string().uuid('Invalid category ID'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional().default('MEDIUM'),
});

const UpdateStatusSchema = z.object({
  status: z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED']),
  note: z.string().optional(),
});

const UpdatePrioritySchema = z.object({
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']),
});

const handlePhotoUpload = (req: any, res: any, next: any) => {
  if (req.is('multipart/form-data')) {
    return uploadPhoto.single('photo')(req, res, next);
  }
  next();
};

router.post(
  '/',
  authenticate,
  requireRole('RESIDENT'),
  handlePhotoUpload,
  async (req: AuthenticatedRequest, res: Response, next) => {
    let uploadedFilePath: string | undefined = undefined;

    try {
      if (req.file) {
        uploadedFilePath = req.file.path.replace(/\\/g, '/');
      }



      const idempotencyKey = (req.headers['x-idempotency-key'] as string) || null;

      if (idempotencyKey) {
        const existingRes = await query('SELECT * FROM complaints WHERE idempotency_key = $1', [idempotencyKey]);
        if (existingRes.rowCount > 0) {
          if (uploadedFilePath) deleteFileIfExists(uploadedFilePath);
          return res.status(200).json({ complaint: existingRes.rows[0], idempotent: true });
        }
      }

      const body = CreateComplaintSchema.parse(req.body);
      const user = req.user!;

      const catRes = await query('SELECT * FROM categories WHERE id = $1 AND is_active = true', [body.category_id]);
      if (catRes.rowCount === 0) {
        if (uploadedFilePath) deleteFileIfExists(uploadedFilePath);
        throw new AppError(404, 'CATEGORY_NOT_FOUND', 'Selected maintenance category does not exist or is inactive');
      }

      const category = catRes.rows[0];
      const now = new Date();
      const dueAt = new Date(now.getTime() + category.default_sla_hours * 60 * 60 * 1000);
      const complaintId = uuidv4();
      const historyId = uuidv4();
      const notificationId = uuidv4();

      const formattedDescription = formatSmartText(body.description);

      const complaint = await transaction(async client => {
        const cRes = await client.query(
          `INSERT INTO complaints
           (id, resident_id, category_id, description, flat_number, priority, current_status, due_at, photo_reference, idempotency_key, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $11)
           RETURNING *`,
          [
            complaintId,
            user.id,
            body.category_id,
            formattedDescription,
            user.flat_number,
            body.priority,
            'OPEN',
            dueAt,
            uploadedFilePath || null,
            idempotencyKey,
            now,
          ]
        );

        await client.query(
          `INSERT INTO complaint_status_history
           (id, complaint_id, from_status, to_status, actor_id, note, created_at)
           VALUES ($1, $2, NULL, 'OPEN', $3, 'Complaint submitted by resident.', $4)`,
          [historyId, complaintId, user.id, now]
        );

        await client.query(
          `INSERT INTO notifications
           (id, recipient_id, type, entity_type, entity_id, status, created_at)
           VALUES ($1, $2, 'COMPLAINT_CREATED', 'COMPLAINT', $3, 'PENDING', $4)`,
          [notificationId, user.id, complaintId, now]
        );

        return cRes.rows[0];
      });

      res.status(201).json({ complaint });
    } catch (err) {
      if (uploadedFilePath) deleteFileIfExists(uploadedFilePath);
      next(err);
    }
  }
);

router.get('/', authenticate, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const user = req.user!;
    const page = parseInt((req.query.page as string) || '1', 10);
    const limit = parseInt((req.query.limit as string) || '20', 10);
    const statusFilter = req.query.status as string;
    const categoryFilter = req.query.category_id as string;
    const priorityFilter = req.query.priority as string;
    const overdueFilter = req.query.overdue === 'true';

    let allComplaints: any[] = [];
    let categoriesList: any[] = [];

    try {
      const cRes = await query('SELECT * FROM complaints ORDER BY created_at DESC');
      allComplaints = cRes.rows;
      const catRes = await query('SELECT * FROM categories');
      categoriesList = catRes.rows;
    } catch (e) {
      allComplaints = [...inMemStore.complaints];
      categoriesList = [...inMemStore.categories];
    }

    if (categoriesList.length === 0) {
      categoriesList = [...inMemStore.categories];
    }

    if (user.role === 'RESIDENT') {
      allComplaints = allComplaints.filter(c => c.resident_id === user.id);
    }

    if (statusFilter) {
      allComplaints = allComplaints.filter(c => c.current_status === statusFilter);
    }

    if (categoryFilter) {
      allComplaints = allComplaints.filter(c => c.category_id === categoryFilter);
    }

    if (priorityFilter) {
      allComplaints = allComplaints.filter(c => c.priority === priorityFilter);
    }

    const now = new Date();
    if (overdueFilter) {
      allComplaints = allComplaints.filter(c => c.current_status !== 'RESOLVED' && new Date(c.due_at) < now);
    }

    allComplaints.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const total = allComplaints.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const startIndex = (page - 1) * limit;
    const paginatedData = allComplaints.slice(startIndex, startIndex + limit);

    const enriched = paginatedData.map(c => {
      const cat = categoriesList.find(item => item.id === c.category_id) || inMemStore.categories.find(item => item.id === c.category_id);
      const isOverdue = c.current_status !== 'RESOLVED' && new Date(c.due_at) < now;
      return {
        ...c,
        category_name: cat ? cat.name : 'Maintenance',
        is_overdue: isOverdue,
      };
    });

    res.json({
      data: enriched,
      pagination: {
        page,
        limit,
        total,
        total_pages: totalPages,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', authenticate, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const user = req.user!;
    const { id } = req.params;

    let comp: any = null;
    try {
      const compDb = await query('SELECT * FROM complaints WHERE id = $1', [id]);
      if (compDb.rowCount > 0) comp = compDb.rows[0];
    } catch (e) {}
    if (!comp) {
      comp = inMemStore.complaints.find(c => c.id === id);
    }

    if (!comp) {
      throw new AppError(404, 'COMPLAINT_NOT_FOUND', 'Complaint record not found');
    }

    if (user.role === 'RESIDENT' && comp.resident_id !== user.id) {
      throw new AppError(403, 'FORBIDDEN', 'You do not have permission to view another resident\'s complaint');
    }

    const cat = inMemStore.categories.find(item => item.id === comp.category_id);
    const now = new Date();
    const isOverdue = comp.current_status !== 'RESOLVED' && new Date(comp.due_at) < now;

    const recurrence = await detectRecurrenceForFlatAndCategory(comp.flat_number, comp.category_id);

    res.json({
      complaint: {
        ...comp,
        category_name: cat ? cat.name : 'Maintenance',
        is_overdue: isOverdue,
        recurrence_insight: recurrence,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.get('/:id/history', authenticate, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const user = req.user!;
    const { id } = req.params;

    let comp: any = null;
    try {
      const compDb = await query('SELECT * FROM complaints WHERE id = $1', [id]);
      if (compDb.rowCount > 0) comp = compDb.rows[0];
    } catch (e) {}
    if (!comp) {
      comp = inMemStore.complaints.find(c => c.id === id);
    }

    if (!comp) {
      throw new AppError(404, 'COMPLAINT_NOT_FOUND', 'Complaint record not found');
    }

    if (user.role === 'RESIDENT' && comp.resident_id !== user.id) {
      throw new AppError(403, 'FORBIDDEN', 'Access denied');
    }

    let historyList: any[] = [];
    try {
      const hRes = await query('SELECT * FROM complaint_status_history WHERE complaint_id = $1 ORDER BY created_at ASC', [id]);
      historyList = hRes.rows;
    } catch (e) {
      historyList = inMemStore.history
        .filter(h => h.complaint_id === id)
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    }

    const enrichedHistory = historyList.map(h => {
      const actor = inMemStore.users.find(u => u.id === h.actor_id);
      return {
        ...h,
        actor_name: actor ? actor.name : 'System',
        actor_role: actor ? actor.role : 'ADMIN',
      };
    });

    res.json({ history: enrichedHistory });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id/priority', authenticate, requireRole('ADMIN'), async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const { id } = req.params;
    const body = UpdatePrioritySchema.parse(req.body);

    let comp: any = null;
    try {
      const compDb = await query('SELECT * FROM complaints WHERE id = $1', [id]);
      if (compDb.rowCount > 0) comp = compDb.rows[0];
    } catch (e) {}
    if (!comp) {
      comp = inMemStore.complaints.find(c => c.id === id);
    }

    if (!comp) {
      throw new AppError(404, 'COMPLAINT_NOT_FOUND', 'Complaint not found');
    }

    const now = new Date();
    await query(
      'UPDATE complaints SET priority = $1, updated_at = $2 WHERE id = $3',
      [body.priority, now, id]
    );

    res.json({ message: 'Complaint priority updated successfully', priority: body.priority });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id/status', authenticate, requireRole('ADMIN'), async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const { id } = req.params;
    const user = req.user!;
    const body = UpdateStatusSchema.parse(req.body);

    let comp: any = null;
    try {
      const compDb = await query('SELECT * FROM complaints WHERE id = $1', [id]);
      if (compDb.rowCount > 0) comp = compDb.rows[0];
    } catch (e) {}
    if (!comp) {
      comp = inMemStore.complaints.find(c => c.id === id);
    }

    if (!comp) {
      throw new AppError(404, 'COMPLAINT_NOT_FOUND', 'Complaint not found');
    }

    validateStatusTransition(comp.current_status as ComplaintStatus, body.status as ComplaintStatus);

    const now = new Date();
    const historyId = uuidv4();
    const notificationId = uuidv4();
    const formattedNote = body.note ? formatSmartText(body.note) : null;

    const updatedComplaint = await transaction(async client => {
      const updateRes = await client.query(
        `UPDATE complaints
         SET current_status = $1, updated_at = $2
         WHERE id = $3
         RETURNING *`,
        [body.status, now, id]
      );

      await client.query(
        `INSERT INTO complaint_status_history
         (id, complaint_id, from_status, to_status, actor_id, note, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [historyId, id, comp.current_status, body.status, user.id, formattedNote, now]
      );

      await client.query(
        `INSERT INTO notifications
         (id, recipient_id, type, entity_type, entity_id, status, created_at)
         VALUES ($1, $2, 'STATUS_CHANGE', 'COMPLAINT', $3, 'PENDING', $4)`,
        [notificationId, comp.resident_id, id, now]
      );

      return updateRes.rows[0];
    });

    res.json({ complaint: updatedComplaint });
  } catch (err) {
    next(err);
  }
});

export default router;
