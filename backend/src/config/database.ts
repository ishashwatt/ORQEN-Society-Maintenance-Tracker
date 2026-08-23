import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/orqen_db';

export const pool = new Pool({
  connectionString,
  ssl: connectionString.includes('sslmode=require') || connectionString.includes('neon.tech') || connectionString.includes('supabase.co')
    ? { rejectUnauthorized: false }
    : undefined,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 6000,
});

export interface QueryResult<T = any> {
  rows: T[];
  rowCount: number;
}

class InMemStore {
  public users: any[] = [
    {
      id: '11111111-1111-1111-1111-111111111111',
      name: 'Admin User',
      email: 'testingrequiredapp@gmail.com',
      password_hash: '$2a$10$/yPZeCFVUSvMLzOYayXbKu9VwYcQZHVbeGdO6fvkA41b.PTat8fR2',
      role: 'ADMIN',
      flat_number: 'ADMIN-OFFICE',
      is_verified: true,
      created_at: new Date(Date.now() - 86400000 * 30),
      updated_at: new Date(Date.now() - 86400000 * 30),
    },
  ];

  public categories: any[] = [
    {
      id: 'c1111111-1111-1111-1111-111111111111',
      name: 'Plumbing',
      default_sla_hours: 24,
      is_active: true,
      created_at: new Date(Date.now() - 86400000 * 30),
      updated_at: new Date(Date.now() - 86400000 * 30),
    },
    {
      id: 'c2222222-2222-2222-2222-222222222222',
      name: 'Electrical',
      default_sla_hours: 12,
      is_active: true,
      created_at: new Date(Date.now() - 86400000 * 30),
      updated_at: new Date(Date.now() - 86400000 * 30),
    },
    {
      id: 'c3333333-3333-3333-3333-333333333333',
      name: 'Cleaning',
      default_sla_hours: 48,
      is_active: true,
      created_at: new Date(Date.now() - 86400000 * 30),
      updated_at: new Date(Date.now() - 86400000 * 30),
    },
    {
      id: 'c4444444-4444-4444-4444-444444444444',
      name: 'Security',
      default_sla_hours: 6,
      is_active: true,
      created_at: new Date(Date.now() - 86400000 * 30),
      updated_at: new Date(Date.now() - 86400000 * 30),
    },
    {
      id: 'c5555555-5555-5555-5555-555555555555',
      name: 'Civil & Painting',
      default_sla_hours: 72,
      is_active: true,
      created_at: new Date(Date.now() - 86400000 * 30),
      updated_at: new Date(Date.now() - 86400000 * 30),
    },
  ];

  public complaints: any[] = [];
  public history: any[] = [];
  public notices: any[] = [];
  public notifications: any[] = [];
  public readNotificationIds: Set<string> = new Set<string>();
  public otpTokens: Map<string, { code: string; expires_at: Date }> = new Map();
  public resetTokens: Map<string, { code: string; expires_at: Date }> = new Map();
}

export const inMemStore = new InMemStore();
let isPgAvailable: boolean | null = null;

export async function query<T = any>(text: string, params: any[] = []): Promise<QueryResult<T>> {
  if (isPgAvailable === null) {
    try {
      const client = await pool.connect();
      client.release();
      isPgAvailable = true;
    } catch (e) {
      isPgAvailable = false;
    }
  }

  if (isPgAvailable) {
    const res = await pool.query(text, params);
    return { rows: res.rows, rowCount: res.rowCount || 0 };
  }

  return executeInMemQuery<T>(text, params);
}

function executeInMemQuery<T>(text: string, params: any[]): QueryResult<T> {
  const normalized = text.toLowerCase().replace(/\s+/g, ' ').trim();

  if (normalized.includes('from users where email =') || normalized.includes('from users where lower(email) =')) {
    const email = (params[0] || '').toString().toLowerCase();
    const user = inMemStore.users.find(u => u.email.toLowerCase() === email);
    return { rows: user ? [user as unknown as T] : [], rowCount: user ? 1 : 0 };
  }

  if (normalized.includes('from users where id =')) {
    const id = params[0];
    const user = inMemStore.users.find(u => u.id === id);
    return { rows: user ? [user as unknown as T] : [], rowCount: user ? 1 : 0 };
  }

  if (normalized.includes('from users where role = \'resident\'') || normalized.includes('from users where role = $1')) {
    const residents = inMemStore.users.filter(u => u.role === 'RESIDENT');
    return { rows: residents as unknown as T[], rowCount: residents.length };
  }

  if (normalized.includes('update users set is_verified =') || normalized.includes('update users set is_verified=true')) {
    const id = params[0];
    const user = inMemStore.users.find(u => u.id === id);
    if (user) {
      user.is_verified = true;
      user.updated_at = new Date();
      return { rows: [user as unknown as T], rowCount: 1 };
    }
    return { rows: [], rowCount: 0 };
  }

  if (normalized.includes('update users set password_hash =')) {
    const newHash = params[0];
    const email = params[params.length - 1];
    const user = inMemStore.users.find(u => u.email === email || u.id === email);
    if (user) {
      user.password_hash = newHash;
      user.updated_at = new Date();
      return { rows: [user as unknown as T], rowCount: 1 };
    }
    return { rows: [], rowCount: 0 };
  }

  if (normalized.includes('delete from users where id =')) {
    const id = params[0];
    const initialLen = inMemStore.users.length;
    inMemStore.users = inMemStore.users.filter(u => u.id !== id);
    return { rows: [], rowCount: initialLen - inMemStore.users.length };
  }

  if (normalized.includes('insert into users')) {
    let phone: string | null = null;
    let occupancyType: 'OWNER' | 'TENANT' = 'OWNER';
    let documentType: string = 'AADHAAR';
    let documentReference: string | null = null;
    let isVerified = false;

    if (params.length >= 11) {
      phone = params[6] || null;
      occupancyType = params[7] || 'OWNER';
      documentType = params[8] || 'AADHAAR';
      documentReference = params[9] || null;
      isVerified = params[10] === true;
    } else if (params.length >= 7) {
      isVerified = params[6] === true;
    } else {
      isVerified = params[4] === 'ADMIN';
    }

    const newUser = {
      id: params[0],
      name: params[1],
      email: params[2],
      password_hash: params[3],
      role: params[4],
      flat_number: params[5],
      phone: phone,
      occupancy_type: occupancyType,
      document_type: documentType,
      document_reference: documentReference,
      is_verified: isVerified,
      created_at: new Date(),
      updated_at: new Date(),
    };
    inMemStore.users.push(newUser);
    return { rows: [newUser as unknown as T], rowCount: 1 };
  }

  if (normalized.includes('select * from categories')) {
    return { rows: inMemStore.categories, rowCount: inMemStore.categories.length };
  }

  if (normalized.includes('select * from categories where id =')) {
    const cat = inMemStore.categories.find(c => c.id === params[0]);
    return { rows: cat ? [cat] : [], rowCount: cat ? 1 : 0 };
  }

  if (normalized.includes('select * from complaints where idempotency_key =')) {
    const comp = inMemStore.complaints.find(c => c.idempotency_key === params[0]);
    return { rows: comp ? [comp] : [], rowCount: comp ? 1 : 0 };
  }

  if (normalized.includes('select * from complaints where id =')) {
    const comp = inMemStore.complaints.find(c => c.id === params[0]);
    return { rows: comp ? [comp] : [], rowCount: comp ? 1 : 0 };
  }

  if (normalized.includes('select * from complaints')) {
    return { rows: [...inMemStore.complaints], rowCount: inMemStore.complaints.length };
  }

  if (normalized.includes('insert into complaints')) {
    const newComp = {
      id: params[0],
      resident_id: params[1],
      category_id: params[2],
      description: params[3],
      flat_number: params[4],
      priority: params[5],
      current_status: params[6],
      due_at: new Date(params[7]),
      photo_reference: params[8] || null,
      idempotency_key: params[9] || null,
      resolved_at: null,
      created_at: new Date(),
      updated_at: new Date(),
    };
    inMemStore.complaints.unshift(newComp);
    return { rows: [newComp as unknown as T], rowCount: 1 };
  }

  if (normalized.includes('update complaints set current_status =')) {
    const status = params[0];
    const resolvedAt = params[1] ? new Date(params[1]) : null;
    const updatedAt = new Date(params[2]);
    const id = params[3];

    const comp = inMemStore.complaints.find(c => c.id === id);
    if (comp) {
      comp.current_status = status;
      if (resolvedAt) comp.resolved_at = resolvedAt;
      comp.updated_at = updatedAt;
    }
    return { rows: comp ? [comp] : [], rowCount: comp ? 1 : 0 };
  }

  if (normalized.includes('update complaints set priority =')) {
    const priority = params[0];
    const updatedAt = new Date(params[1]);
    const id = params[2];

    const comp = inMemStore.complaints.find(c => c.id === id);
    if (comp) {
      comp.priority = priority;
      comp.updated_at = updatedAt;
    }
    return { rows: comp ? [comp] : [], rowCount: comp ? 1 : 0 };
  }

  if (normalized.includes('insert into complaint_status_history')) {
    const newH = {
      id: params[0],
      complaint_id: params[1],
      from_status: params[2],
      to_status: params[3],
      actor_id: params[4],
      note: params[5],
      created_at: new Date(),
    };
    inMemStore.history.push(newH);
    return { rows: [newH as unknown as T], rowCount: 1 };
  }

  if (normalized.includes('select * from complaint_status_history where complaint_id =')) {
    const id = params[0];
    const list = inMemStore.history.filter(h => h.complaint_id === id);
    return { rows: list, rowCount: list.length };
  }

  if (normalized.includes('insert into notifications')) {
    const newNotif = {
      id: params[0],
      recipient_id: params[1],
      type: params[2],
      entity_type: params[3],
      entity_id: params[4],
      status: params[5] || 'PENDING',
      attempts: 0,
      last_error: null,
      created_at: new Date(),
      sent_at: null,
    };
    inMemStore.notifications.push(newNotif);
    return { rows: [newNotif as unknown as T], rowCount: 1 };
  }

  if (normalized.includes('select * from notices')) {
    const list = [...inMemStore.notices].sort((a, b) => (b.is_important ? 1 : 0) - (a.is_important ? 1 : 0) || b.created_at - a.created_at);
    return { rows: list, rowCount: list.length };
  }

  if (normalized.includes('insert into notices')) {
    const newNotice = {
      id: params[0],
      title: params[1],
      content: params[2],
      is_important: params[3],
      created_by: params[4],
      created_at: new Date(),
      updated_at: new Date(),
    };
    inMemStore.notices.unshift(newNotice);
    return { rows: [newNotice as unknown as T], rowCount: 1 };
  }

  if (normalized.includes('update notices set')) {
    const title = params[0];
    const content = params[1];
    const isImportant = params[2];
    const updatedAt = new Date(params[3]);
    const id = params[4];

    const n = inMemStore.notices.find(item => item.id === id);
    if (n) {
      n.title = title;
      n.content = content;
      n.is_important = isImportant;
      n.updated_at = updatedAt;
    }
    return { rows: n ? [n] : [], rowCount: n ? 1 : 0 };
  }

  if (normalized.includes('delete from notices where id =')) {
    const id = params[0];
    const initialLen = inMemStore.notices.length;
    inMemStore.notices = inMemStore.notices.filter(item => item.id !== id);
    return { rows: [], rowCount: initialLen - inMemStore.notices.length };
  }

  return { rows: [], rowCount: 0 };
}

export async function transaction<T>(callback: (client: any) => Promise<T>): Promise<T> {
  if (isPgAvailable === null) {
    try {
      const client = await pool.connect();
      client.release();
      isPgAvailable = true;
    } catch (e) {
      isPgAvailable = false;
    }
  }

  if (isPgAvailable) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  return callback({
    query: async (t: string, p: any[]) => executeInMemQuery(t, p),
  });
}
