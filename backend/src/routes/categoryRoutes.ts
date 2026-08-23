import { Router, Response } from 'express';
import { query } from '../config/database';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, async (_req, res: Response, next) => {
  try {
    const result = await query('SELECT * FROM categories WHERE is_active = true ORDER BY name ASC');
    res.json({ categories: result.rows });
  } catch (err) {
    next(err);
  }
});

export default router;
