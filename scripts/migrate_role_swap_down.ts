import dotenv from 'dotenv';
dotenv.config();
import { initDb, getPool } from '../src/db';

async function runMigrationDown() {
  console.log('========================================================================');
  console.log('  MIGRATION DOWN (ROLLBACK): RESTORE ROLE-EXECUTIVE-1 (POLRES) & ROLE-EXECUTIVE-3 (NASIONAL)');
  console.log('========================================================================\n');

  await initDb();
  const pool = getPool();
  const conn = await pool.getConnection();

  try {
    const [beforeUsers]: any = await conn.query('SELECT role_id, COUNT(*) as c FROM users GROUP BY role_id');
    const beforeMap: Record<string, number> = {};
    for (const row of beforeUsers) {
      beforeMap[row.role_id] = Number(row.c);
    }
    console.log('[BEFORE ROLLBACK] Distribusi User:');
    console.table(beforeMap);

    await conn.beginTransaction();
    console.log('\n[TRANSACTION] Memulai rollback...');

    await conn.query('SET FOREIGN_KEY_CHECKS = 0');

    // 1) role-executive-3 -> role-executive-tmp-swap
    await conn.query(`
      UPDATE users 
      SET role_id = 'role-executive-tmp-swap' 
      WHERE role_id = 'role-executive-3'
    `);
    await conn.query(`
      UPDATE roles 
      SET id = 'role-executive-tmp-swap' 
      WHERE id = 'role-executive-3'
    `);

    // 2) role-executive-1 -> role-executive-3
    await conn.query(`
      UPDATE users 
      SET role_id = 'role-executive-3' 
      WHERE role_id = 'role-executive-1'
    `);
    await conn.query(`
      UPDATE roles 
      SET 
        id = 'role-executive-3',
        name = 'Eksekutif 3 (Level Nasional / Kapolri)',
        description = 'Pimpinan tingkat Mabes Polri / Korlantas — akses penuh pemantauan seluruh 34 Polda se-Indonesia'
      WHERE id = 'role-executive-1'
    `);

    // 3) role-executive-tmp-swap -> role-executive-1
    await conn.query(`
      UPDATE users 
      SET role_id = 'role-executive-1' 
      WHERE role_id = 'role-executive-tmp-swap'
    `);
    await conn.query(`
      UPDATE roles 
      SET 
        id = 'role-executive-1',
        name = 'Eksekutif 1 (Level Polres / Kapolres)',
        description = 'Pimpinan tingkat Polres — akses pemantauan performa & laporan kegiatan khusus di wilayah Polres terdaftar'
      WHERE id = 'role-executive-tmp-swap'
    `);

    await conn.query('SET FOREIGN_KEY_CHECKS = 1');

    const [afterUsers]: any = await conn.query('SELECT role_id, COUNT(*) as c FROM users GROUP BY role_id');
    const afterMap: Record<string, number> = {};
    for (const row of afterUsers) {
      afterMap[row.role_id] = Number(row.c);
    }
    console.log('\n[AFTER ROLLBACK] Distribusi User:');
    console.table(afterMap);

    await conn.commit();
    console.log('\n[SUCCESS] Rollback berhasil di-COMMIT!');
  } catch (err) {
    await conn.rollback();
    console.error('\n[ROLLBACK ERROR]:', err);
    throw err;
  } finally {
    conn.release();
    process.exit(0);
  }
}

runMigrationDown().catch(err => {
  console.error(err);
  process.exit(1);
});

