import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { query, inMemStore } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { authenticate, requireRole, AuthenticatedRequest } from '../middleware/auth';

import { uploadPhoto, deleteFileIfExists } from '../services/photoStorage';
import { sendEmail } from '../services/emailService';
import { buildResidentVerificationAdminEmail } from '../services/emailTemplateService';

const router = Router();

const RegisterSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[@$!%*#?&_\-]/, 'Password must contain at least one special character (@, #, $, !, etc.)'),
  flat_number: z.string().min(1, 'Flat number is required'),
  phone: z.string().optional().nullable().or(z.literal('')),
  occupancy_type: z.enum(['OWNER', 'TENANT']).optional().default('OWNER'),
  document_type: z.enum(['AADHAAR', 'RENT_AGREEMENT', 'ELECTRICITY_BILL', 'POSSESSION_LETTER', 'OTHER']).optional().default('AADHAAR'),
});

const AdminCreateSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[@$!%*#?&_\-]/, 'Password must contain at least one special character (@, #, $, !, etc.)'),
});

const LoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

const handleDocUpload = (req: any, res: any, next: any) => {
  if (req.is('multipart/form-data')) {
    return uploadPhoto.single('document')(req, res, next);
  }
  next();
};

router.post('/register', handleDocUpload, async (req, res, next) => {
  let uploadedFilePath: string | undefined = undefined;

  try {
    if (req.file) {
      uploadedFilePath = req.file.path.replace(/\\/g, '/');
    }

    const data = RegisterSchema.parse(req.body);
    const existing = await query('SELECT * FROM users WHERE email = $1', [data.email.toLowerCase()]);
    if (existing.rowCount > 0) {
      throw new AppError(400, 'USER_EXISTS', 'User with this email already exists');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(data.password, salt);
    const userId = uuidv4();

    await query(
      'INSERT INTO users (id, name, email, password_hash, role, flat_number, phone, occupancy_type, document_type, document_reference, is_verified) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)',
      [
        userId,
        data.name,
        data.email.toLowerCase(),
        passwordHash,
        'RESIDENT',
        data.flat_number,
        data.phone || null,
        data.occupancy_type || 'OWNER',
        data.document_type || 'AADHAAR',
        uploadedFilePath || null,
        false,
      ]
    );

    const adminEmail = process.env.ADMIN_EMAIL || 'testingrequiredapp@gmail.com';
    const emailData = buildResidentVerificationAdminEmail({
      name: data.name,
      flatNumber: data.flat_number,
      email: data.email.toLowerCase(),
      phone: data.phone,
      occupancyType: data.occupancy_type,
      documentType: data.document_type,
    });
    const adminNotifId = uuidv4();

    await query(
      'INSERT INTO notifications (id, recipient_email, subject, body, status, attempts) VALUES ($1, $2, $3, $4, $5, $6)',
      [
        adminNotifId,
        adminEmail,
        emailData.subject,
        emailData.text,
        'PENDING',
        0,
      ]
    );

    sendEmail({
      to: adminEmail,
      subject: emailData.subject,
      text: emailData.text,
      html: emailData.html,
    }).catch(() => {});

    const userPayload = {
      id: userId,
      name: data.name,
      email: data.email.toLowerCase(),
      role: 'RESIDENT' as const,
      flat_number: data.flat_number,
      phone: data.phone || null,
      occupancy_type: data.occupancy_type || 'OWNER',
      document_type: data.document_type || 'AADHAAR',
      document_reference: uploadedFilePath || null,
      is_verified: false,
    };

    const jwtSecret = process.env.JWT_SECRET || 'orqen_super_secret_jwt_key_2026_production_grade';
    const token = jwt.sign(userPayload, jwtSecret, { expiresIn: '1d' });

    res.status(201).json({
      user: userPayload,
      token,
    });
  } catch (err) {
    if (uploadedFilePath) deleteFileIfExists(uploadedFilePath);
    next(err);
  }
});

router.post('/create-admin', authenticate, requireRole('ADMIN'), async (req: AuthenticatedRequest, res, next) => {
  try {
    const data = AdminCreateSchema.parse(req.body);
    const existing = await query('SELECT * FROM users WHERE email = $1', [data.email.toLowerCase()]);
    if (existing.rowCount > 0) {
      throw new AppError(400, 'USER_EXISTS', 'User with this email already exists');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(data.password, salt);
    const userId = uuidv4();

    await query(
      'INSERT INTO users (id, name, email, password_hash, role, flat_number, is_verified) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [userId, data.name, data.email.toLowerCase(), passwordHash, 'ADMIN', 'ADMIN-OFFICE', true]
    );

    const portalUrl = process.env.FRONTEND_URL || 'https://orqenthetracker.vercel.app';
    const notifId = uuidv4();
    await query(
      'INSERT INTO notifications (id, recipient_email, subject, body, status, attempts) VALUES ($1, $2, $3, $4, $5, $6)',
      [
        notifId,
        data.email.toLowerCase(),
        'Society Committee Administrator Account Provisioned — ORQEN',
        `Dear ${data.name},\n\nYou have been appointed and provisioned as an Administrator in the Society Management Committee for ORQEN Operations.\n\nYour official login credentials:\n• Portal URL: ${portalUrl}\n• Username / Email: ${data.email.toLowerCase()}\n• Initial Password: ${data.password}\n\nPlease sign in to ${portalUrl} to manage society maintenance queues, approve resident flats, and publish announcements.\n\nRegards,\nSociety Management Committee\nORQEN Operations Desk`,
        'PENDING',
        0,
      ]
    );

    const newAdmin = {
      id: userId,
      name: data.name,
      email: data.email.toLowerCase(),
      role: 'ADMIN',
      flat_number: 'ADMIN-OFFICE',
      is_verified: true,
      email_dispatched: true,
    };

    res.status(201).json({ admin: newAdmin });
  } catch (err) {
    next(err);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const data = LoginSchema.parse(req.body);
    const result = await query('SELECT * FROM users WHERE email = $1', [data.email.toLowerCase()]);
    if (result.rowCount === 0) {
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
    }

    const user = result.rows[0];
    const isMatch = await bcrypt.compare(data.password, user.password_hash);
    if (!isMatch) {
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
    }

    const userPayload = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      flat_number: user.flat_number,
      is_verified: user.is_verified !== undefined ? user.is_verified : true,
    };

    const jwtSecret = process.env.JWT_SECRET || 'orqen_super_secret_jwt_key_2026_production_grade';
    const token = jwt.sign(userPayload, jwtSecret, { expiresIn: '1d' });

    res.json({
      user: userPayload,
      token,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/residents', authenticate, requireRole('ADMIN'), async (req: AuthenticatedRequest, res, next) => {
  try {
    const result = await query(
      'SELECT id, name, email, phone, occupancy_type, document_type, document_reference, role, flat_number, is_verified, created_at FROM users WHERE role = $1 ORDER BY created_at DESC',
      ['RESIDENT']
    );
    res.json({ residents: result.rows });
  } catch (err) {
    next(err);
  }
});

router.patch('/residents/:id/verify', authenticate, requireRole('ADMIN'), async (req: AuthenticatedRequest, res, next) => {
  try {
    const { id } = req.params;
    const result = await query(
      'UPDATE users SET is_verified = true, updated_at = NOW() WHERE id = $1 RETURNING id, name, email, flat_number, is_verified',
      [id]
    );

    if (result.rowCount === 0) {
      throw new AppError(404, 'RESIDENT_NOT_FOUND', 'Resident account not found');
    }

    const verifiedResident = result.rows[0];

    const notifId = uuidv4();
    await query(
      'INSERT INTO notifications (id, recipient_email, subject, body, status, attempts) VALUES ($1, $2, $3, $4, $5, $6)',
      [
        notifId,
        verifiedResident.email,
        'Flat Registration Approved — ORQEN Residential Operations',
        `Dear ${verifiedResident.name},\n\nYour flat registration for ${verifiedResident.flat_number} has been verified and approved by the Society Management Committee.\n\nYou now have full access to raise and track maintenance requests.\n\nRegards,\nORQEN Committee Desk`,
        'PENDING',
        0,
      ]
    );

    res.json({ resident: verifiedResident });
  } catch (err) {
    next(err);
  }
});

router.patch('/residents/:id/reject', authenticate, requireRole('ADMIN'), async (req: AuthenticatedRequest, res, next) => {
  try {
    const { id } = req.params;
    const reason = (req.body.reason as string) || 'Residence details could not be validated by society administration.';

    const userRes = await query('SELECT * FROM users WHERE id = $1', [id]);
    if (userRes.rowCount === 0) {
      throw new AppError(404, 'RESIDENT_NOT_FOUND', 'Resident account not found');
    }

    const resident = userRes.rows[0];

    await query('DELETE FROM users WHERE id = $1', [id]);

    const notifId = uuidv4();
    await query(
      'INSERT INTO notifications (id, recipient_email, subject, body, status, attempts) VALUES ($1, $2, $3, $4, $5, $6)',
      [
        notifId,
        resident.email,
        'Flat Registration Update — ORQEN Residential Operations',
        `Dear ${resident.name},\n\nYour flat registration request for ${resident.flat_number} could not be approved at this time.\n\nReason: ${reason}\n\nPlease verify your flat details or contact the society office for assistance.\n\nRegards,\nSociety Management Committee\nORQEN Operations Desk`,
        'PENDING',
        0,
      ]
    );

    res.json({ message: 'Resident registration declined', id });
  } catch (err) {
    next(err);
  }
});

router.get('/residents', authenticate, requireRole('ADMIN'), async (_req: AuthenticatedRequest, res: Response, next) => {
  try {
    let residents: any[] = [];
    try {
      const result = await query(`
        SELECT 
          u.id, 
          u.name, 
          u.email, 
          u.role, 
          u.flat_number, 
          u.phone, 
          u.occupancy_type, 
          u.document_type, 
          u.document_reference, 
          u.is_verified, 
          u.created_at,
          COUNT(c.id) AS complaint_count
        FROM users u
        LEFT JOIN complaints c ON c.resident_id = u.id
        WHERE u.role = 'RESIDENT'
        GROUP BY u.id
        ORDER BY u.created_at DESC
      `);
      residents = result.rows.map(r => ({
        ...r,
        complaint_count: parseInt(r.complaint_count, 10) || 0,
      }));
    } catch (e) {
      residents = inMemStore.users.filter(u => u.role === 'RESIDENT').map(u => ({
        ...u,
        complaint_count: inMemStore.complaints.filter(c => c.resident_id === u.id).length,
      }));
    }

    res.json({ residents });
  } catch (err) {
    next(err);
  }
});

router.get('/me', authenticate, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const userRes = await query(
      'SELECT id, name, email, role, flat_number, phone, occupancy_type, document_type, document_reference, is_verified FROM users WHERE id = $1',
      [req.user!.id]
    );
    if (userRes.rowCount === 0) {
      throw new AppError(404, 'USER_NOT_FOUND', 'User not found');
    }
    res.json({ user: userRes.rows[0] });
  } catch (err) {
    next(err);
  }
});

export default router;
