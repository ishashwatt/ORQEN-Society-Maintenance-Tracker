import { pool } from './database';

async function cleanDatabase() {
  console.log('--- Cleaning ORQEN Database for Clean Deployment ---');
  const client = await pool.connect();
  try {
    const tableRes = await client.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';"
    );
    const existingTables = new Set(tableRes.rows.map((r: any) => r.table_name));
    console.log('Detected tables in DB:', Array.from(existingTables));

    await client.query('BEGIN');

    if (existingTables.has('complaint_status_history')) {
      await client.query('DELETE FROM complaint_status_history;');
      console.log('✔ Cleared complaint_status_history');
    }

    if (existingTables.has('complaints')) {
      await client.query('DELETE FROM complaints;');
      console.log('✔ Cleared complaints');
    }

    if (existingTables.has('notifications')) {
      await client.query('DELETE FROM notifications;');
      console.log('✔ Cleared notifications');
    }

    if (existingTables.has('notice_reads')) {
      await client.query('DELETE FROM notice_reads;');
      console.log('✔ Cleared notice_reads');
    }

    if (existingTables.has('notices')) {
      await client.query('DELETE FROM notices;');
      console.log('✔ Cleared notices');
    }

    if (existingTables.has('users')) {
      await client.query("DELETE FROM users WHERE role != 'ADMIN';");
      console.log('✔ Cleared test resident users (retained primary Admin accounts)');
    }

    await client.query('COMMIT');
    console.log('--- Database successfully cleaned & prepared for fresh production deployment ---');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error cleaning database:', err);
  } finally {
    client.release();
    process.exit(0);
  }
}

cleanDatabase();
