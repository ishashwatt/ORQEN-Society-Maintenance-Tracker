import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { app } from '../server';
import { inMemStore, query } from '../config/database';
import { initializeSchema } from '../config/initCloudDb';

vi.mock('../services/emailService', () => ({
  sendEmail: vi.fn().mockResolvedValue({ messageId: 'mock-test-id' }),
}));

let adminToken: string;
let residentToken: string;
let anotherResidentToken: string;
let testCategoryId: string;
let testComplaintId: string;

beforeAll(async () => {
  try {
    await initializeSchema();
    const hash = await bcrypt.hash('Password123!', 10);
    await query("DELETE FROM users WHERE email IN ('newresident@test.com', 'secondaryadmin@orqen.com', 'testrahul@resident.com', 'testpriya@resident.com')");
    await query("DELETE FROM complaints WHERE idempotency_key LIKE 'idem-key%'");
    await query(`
      INSERT INTO users (id, name, email, password_hash, role, flat_number, is_verified)
      VALUES 
      ('22222222-2222-2222-2222-222222222222', 'Test Rahul', 'testrahul@resident.com', $1, 'RESIDENT', 'A-203', true),
      ('33333333-3333-3333-3333-333333333333', 'Test Priya', 'testpriya@resident.com', $1, 'RESIDENT', 'B-104', true)
      ON CONFLICT (email) DO UPDATE SET password_hash = $1, is_verified = true
    `, [hash]);
  } catch (e) {}

  const catRes = await query('SELECT id FROM categories LIMIT 1');
  testCategoryId = catRes.rows.length > 0 ? catRes.rows[0].id : inMemStore.categories[0].id;

  const adminLoginRes = await request(app)
    .post('/auth/login')
    .send({ email: 'testingrequiredapp@gmail.com', password: 'Password123!' });
  adminToken = adminLoginRes.body.token;

  const residentLoginRes = await request(app)
    .post('/auth/login')
    .send({ email: 'testrahul@resident.com', password: 'Password123!' });
  residentToken = residentLoginRes.body.token;

  const anotherLoginRes = await request(app)
    .post('/auth/login')
    .send({ email: 'testpriya@resident.com', password: 'Password123!' });
  anotherResidentToken = anotherLoginRes.body.token;
});

describe('1. Authentication & Registration', () => {
  it('should register a new resident user and force RESIDENT role', async () => {
    const res = await request(app).post('/auth/register').send({
      name: 'Test Resident',
      email: 'newresident@test.com',
      password: 'Password123!',
      flat_number: 'C-302',
    });

    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe('newresident@test.com');
    expect(res.body.user.role).toBe('RESIDENT');
  });

  it('should allow logged-in admin to create a new administrator', async () => {
    const res = await request(app)
      .post('/auth/create-admin')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Secondary Admin',
        email: 'secondaryadmin@orqen.com',
        password: 'Password123!',
      });

    expect(res.status).toBe(201);
    expect(res.body.admin.role).toBe('ADMIN');
  });

  it('should reject login with invalid password', async () => {
    const res = await request(app).post('/auth/login').send({
      email: 'admin@orqen.com',
      password: 'WrongPassword!',
    });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });
});

describe('2. Authorization & RBAC Enforcement', () => {
  it('should block resident from accessing admin dashboard', async () => {
    const res = await request(app)
      .get('/analytics/dashboard')
      .set('Authorization', `Bearer ${residentToken}`);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('should block resident from viewing another resident complaint', async () => {
    const compRes = await request(app)
      .post('/complaints')
      .set('Authorization', `Bearer ${anotherResidentToken}`)
      .send({
        category_id: testCategoryId,
        description: 'Water problem in flat B-104',
        priority: 'LOW',
      });
    const complaintOfPriya = compRes.body.complaint.id;

    const res = await request(app)
      .get(`/complaints/${complaintOfPriya}`)
      .set('Authorization', `Bearer ${residentToken}`);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });
});

describe('3. Idempotent Complaint Creation & SLA Calculation', () => {
  it('should create complaint with frozen due_at SLA date', async () => {
    const res = await request(app)
      .post('/complaints')
      .set('Authorization', `Bearer ${residentToken}`)
      .send({
        category_id: testCategoryId,
        description: 'Water leak under kitchen counter leaking onto floor.',
        priority: 'HIGH',
      });

    expect(res.status).toBe(201);
    expect(res.body.complaint.id).toBeDefined();
    expect(res.body.complaint.current_status).toBe('OPEN');
    expect(res.body.complaint.due_at).toBeDefined();

    testComplaintId = res.body.complaint.id;
  });

  it('should handle duplicate request idempotently with header', async () => {
    const key = 'idem-key-12345';
    const firstRes = await request(app)
      .post('/complaints')
      .set('Authorization', `Bearer ${residentToken}`)
      .set('X-Idempotency-Key', key)
      .send({
        category_id: testCategoryId,
        description: 'Flush tank button broken and stuck.',
        priority: 'MEDIUM',
      });

    expect(firstRes.status).toBe(201);

    const secondRes = await request(app)
      .post('/complaints')
      .set('Authorization', `Bearer ${residentToken}`)
      .set('X-Idempotency-Key', key)
      .send({
        category_id: testCategoryId,
        description: 'Flush tank button broken and stuck.',
        priority: 'MEDIUM',
      });

    expect(secondRes.status).toBe(200);
    expect(secondRes.body.idempotent).toBe(true);
    expect(secondRes.body.complaint.id).toBe(firstRes.body.complaint.id);
  });
});

describe('4. Status Machine & Append-Only History', () => {
  it('should transition complaint from OPEN to IN_PROGRESS and append history', async () => {
    const statusRes = await request(app)
      .patch(`/complaints/${testComplaintId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'IN_PROGRESS', note: 'Plumber assigned to Flat A-203' });

    expect(statusRes.status).toBe(200);
    expect(statusRes.body.complaint.current_status).toBe('IN_PROGRESS');

    const historyRes = await request(app)
      .get(`/complaints/${testComplaintId}/history`)
      .set('Authorization', `Bearer ${residentToken}`);

    expect(historyRes.status).toBe(200);
    expect(historyRes.body.history.length).toBeGreaterThanOrEqual(2);
    expect(historyRes.body.history[1].to_status).toBe('IN_PROGRESS');
  });

  it('should block invalid transition out of RESOLVED state', async () => {
    const resolveRes = await request(app)
      .patch(`/complaints/${testComplaintId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'RESOLVED', note: 'Leak repaired successfully.' });

    expect(resolveRes.status).toBe(200);

    const invalidRes = await request(app)
      .patch(`/complaints/${testComplaintId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'IN_PROGRESS', note: 'Attempting to reopen complaint' });

    expect(invalidRes.status).toBe(400);
    expect(invalidRes.body.error.code).toBe('INVALID_STATUS_TRANSITION');
  });
});

describe('5. Notices & Analytics Dashboard', () => {
  it('should allow admin to create an important notice', async () => {
    const res = await request(app)
      .post('/notices')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Elevator Maintenance Notice',
        content: 'Lift A will be under servicing from 2 PM to 5 PM today.',
        is_important: true,
      });

    expect(res.status).toBe(201);
    expect(res.body.notice.title).toBe('Elevator Maintenance Notice');
  });

  it('should return complete analytics dashboard data for admin', async () => {
    const res = await request(app)
      .get('/analytics/dashboard')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.summary.total).toBeGreaterThan(0);
    expect(res.body.summary.overdue).toBeDefined();
    expect(res.body.category_breakdown).toBeDefined();
  });

  afterAll(async () => {
    try {
      await query(`
        DELETE FROM complaint_status_history 
        WHERE complaint_id IN (
          SELECT id FROM complaints WHERE resident_id IN (
            SELECT id FROM users WHERE email IN ('newresident@test.com', 'secondaryadmin@orqen.com', 'testrahul@resident.com', 'testpriya@resident.com')
          )
        )
      `);
      await query(`
        DELETE FROM complaints 
        WHERE resident_id IN (
          SELECT id FROM users WHERE email IN ('newresident@test.com', 'secondaryadmin@orqen.com', 'testrahul@resident.com', 'testpriya@resident.com')
        )
      `);
      await query("DELETE FROM complaints WHERE idempotency_key LIKE 'idem-key%'");
      await query("DELETE FROM notices WHERE title = 'Elevator Maintenance Notice'");
      await query("DELETE FROM users WHERE email IN ('newresident@test.com', 'secondaryadmin@orqen.com', 'testrahul@resident.com', 'testpriya@resident.com')");
      await query("DELETE FROM notifications WHERE subject LIKE '%Elevator Maintenance%' OR body LIKE '%idem-key%'");
    } catch (e) {}
  });
});
