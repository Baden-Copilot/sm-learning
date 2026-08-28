/**
 * Script untuk membersihkan data transaksi/riwayat dari MySQL
 * Menjaga: users, roles, polda, polres, materials
 */

import mysql from 'mysql2/promise';

const DB_CONFIG = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'sm_learning',
};

async function clean() {
  console.log('Menghubungkan ke MySQL...');
  const conn = await mysql.createConnection(DB_CONFIG);

  console.log('Membersihkan tabel transaksi...');
  await conn.query('SET FOREIGN_KEY_CHECKS = 0');
  await conn.query('TRUNCATE TABLE outreach_sessions');
  await conn.query('TRUNCATE TABLE outreach_reports');
  await conn.query('TRUNCATE TABLE session_participants');
  await conn.query('TRUNCATE TABLE learning_events');
  await conn.query('TRUNCATE TABLE user_progress');
  await conn.query('TRUNCATE TABLE user_bookmarks');
  await conn.query('TRUNCATE TABLE user_history');
  await conn.query('TRUNCATE TABLE quiz_attempts');
  await conn.query('TRUNCATE TABLE certificates');
  await conn.query('TRUNCATE TABLE audit_logs');
  await conn.query('TRUNCATE TABLE notifications');
  await conn.query('UPDATE materials SET views = 0, downloads = 0');
  await conn.query('SET FOREIGN_KEY_CHECKS = 1');

  await conn.end();
  console.log('Data transaksi berhasil dibersihkan. Akun, wilayah, dan materi tetap utuh.');
}

clean().catch(err => {
  console.error('Gagal:', err);
  process.exit(1);
});
