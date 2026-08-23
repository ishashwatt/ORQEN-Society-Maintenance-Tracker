import { pool } from './database';

export async function initializeSchema() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL,
        flat_number VARCHAR(50),
        phone VARCHAR(50),
        occupancy_type VARCHAR(50) DEFAULT 'OWNER',
        document_type VARCHAR(50) DEFAULT 'AADHAAR',
        document_reference TEXT,
        is_verified BOOLEAN DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS categories (
        id UUID PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        default_sla_hours INTEGER NOT NULL,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS complaints (
        id UUID PRIMARY KEY,
        resident_id UUID,
        category_id UUID,
        description TEXT NOT NULL,
        flat_number VARCHAR(50) NOT NULL,
        priority VARCHAR(50) DEFAULT 'MEDIUM',
        current_status VARCHAR(50) DEFAULT 'OPEN',
        due_at TIMESTAMP WITH TIME ZONE NOT NULL,
        photo_reference TEXT,
        idempotency_key VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS complaint_status_history (
        id UUID PRIMARY KEY,
        complaint_id UUID,
        from_status VARCHAR(50),
        to_status VARCHAR(50) NOT NULL,
        actor_id UUID,
        note TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS notices (
        id UUID PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        is_important BOOLEAN DEFAULT false,
        start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        end_time TIMESTAMP WITH TIME ZONE,
        approx_duration VARCHAR(100),
        status VARCHAR(50) DEFAULT 'ACTIVE',
        admin_notified_expired BOOLEAN DEFAULT false,
        created_by UUID,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS user_notice_reads (
        user_id UUID NOT NULL,
        notice_id UUID NOT NULL,
        read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        PRIMARY KEY (user_id, notice_id)
      );

      CREATE TABLE IF NOT EXISTS notifications (
        id UUID PRIMARY KEY,
        recipient_id UUID,
        recipient_email VARCHAR(255),
        subject VARCHAR(255),
        body TEXT,
        type VARCHAR(50),
        entity_type VARCHAR(50),
        entity_id UUID,
        status VARCHAR(50) DEFAULT 'PENDING',
        attempts INTEGER DEFAULT 0,
        last_error TEXT,
        sent_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    const users = [
      { id: '11111111-1111-1111-1111-111111111111', name: 'Estate Administrator', email: 'testingrequiredapp@gmail.com', role: 'ADMIN', flat: 'ADMIN-OFFICE', is_verified: true },
    ];

    for (const u of users) {
      await client.query(`
        INSERT INTO users (id, name, email, password_hash, role, flat_number, is_verified)
        VALUES ($1, $2, $3, '$2a$10$/yPZeCFVUSvMLzOYayXbKu9VwYcQZHVbeGdO6fvkA41b.PTat8fR2', $4, $5, $6)
        ON CONFLICT (email) DO NOTHING
      `, [u.id, u.name, u.email, u.role, u.flat, u.is_verified]);
    }

    const categories = [
      { id: 'c1111111-1111-1111-1111-111111111111', name: 'Plumbing', sla: 24 },
      { id: 'c2222222-2222-2222-2222-222222222222', name: 'Electrical', sla: 12 },
      { id: 'c3333333-3333-3333-3333-333333333333', name: 'Cleaning', sla: 48 },
      { id: 'c4444444-4444-4444-4444-444444444444', name: 'Security', sla: 6 },
      { id: 'c5555555-5555-5555-5555-555555555555', name: 'Civil & Painting', sla: 72 },
    ];

    for (const cat of categories) {
      await client.query(`
        INSERT INTO categories (id, name, default_sla_hours, is_active)
        VALUES ($1, $2, $3, true)
        ON CONFLICT (name) DO NOTHING
      `, [cat.id, cat.name, cat.sla]);
    }

    return true;
  } finally {
    client.release();
  }
}

if (require.main === module) {
  initializeSchema()
    .then(() => {
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
