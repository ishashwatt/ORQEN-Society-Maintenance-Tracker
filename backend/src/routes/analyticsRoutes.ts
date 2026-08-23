import { Router, Response } from 'express';
import { query, inMemStore } from '../config/database';
import { authenticate, requireRole } from '../middleware/auth';
import { getAllRecurrenceInsights } from '../services/recurrenceEngine';

const router = Router();

router.get('/dashboard', authenticate, requireRole('ADMIN'), async (_req, res: Response, next) => {
  try {
    let complaints: any[] = [];
    let categories: any[] = [];

    try {
      const compRes = await query('SELECT * FROM complaints ORDER BY created_at DESC');
      const catRes = await query('SELECT * FROM categories WHERE is_active = true');
      complaints = compRes.rows;
      categories = catRes.rows;
    } catch (e) {
      complaints = inMemStore.complaints;
      categories = inMemStore.categories;
    }

    const now = new Date();

    const total = complaints.length;
    const openCount = complaints.filter(c => c.current_status === 'OPEN').length;
    const inProgressCount = complaints.filter(c => c.current_status === 'IN_PROGRESS').length;
    const resolvedCount = complaints.filter(c => c.current_status === 'RESOLVED').length;
    const activeTotal = openCount + inProgressCount;

    const overdueCount = complaints.filter(
      c => c.current_status !== 'RESOLVED' && new Date(c.due_at) < now
    ).length;

    const categoryBreakdown: Record<string, number> = {};
    categories.forEach(cat => {
      categoryBreakdown[cat.name] = 0;
    });

    complaints
      .filter(c => c.current_status !== 'RESOLVED')
      .forEach(c => {
        const cat = categories.find(item => item.id === c.category_id);
        const catName = cat ? cat.name : 'Other';
        categoryBreakdown[catName] = (categoryBreakdown[catName] || 0) + 1;
      });

    const priorityBreakdown = {
      LOW: complaints.filter(c => c.current_status !== 'RESOLVED' && c.priority === 'LOW').length,
      MEDIUM: complaints.filter(c => c.current_status !== 'RESOLVED' && c.priority === 'MEDIUM').length,
      HIGH: complaints.filter(c => c.current_status !== 'RESOLVED' && c.priority === 'HIGH').length,
    };

    const recurrenceAlerts = await getAllRecurrenceInsights();

    res.json({
      summary: {
        total,
        active: activeTotal,
        open: openCount,
        in_progress: inProgressCount,
        resolved: resolvedCount,
        overdue: overdueCount,
      },
      category_breakdown: categoryBreakdown,
      priority_breakdown: priorityBreakdown,
      recurrence_alerts: recurrenceAlerts,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
