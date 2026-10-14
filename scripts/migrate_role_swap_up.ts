import dotenv from 'dotenv';
dotenv.config();
import { initDb, getPool } from '../src/db';

async function runMigrationUp() {
  console.log('========================================================================');
  console.log('  MIGRATION UP: SWAP ROLE-EXECUTIVE-1 (POLRES) <-> ROLE-EXECUTIVE-3 (NASIONAL)');
  console.log('========================================================================\n');

  await initDb();
  const pool = getPool();
  const conn = await pool.getConnection();

  try {
    // 1. Audit Sebelum
    const [beforeUsers]: any = await conn.query('SELECT role_id, COUNT(*) as c FROM users GROUP BY role_id');
    const beforeMap: Record<string, number> = {};
    for (const row of beforeUsers) {
      beforeMap[row.role_id] = Number(row.c);
    }
    console.log('[BEFORE] Distribusi User per Role:');
    console.table(beforeMap);

    const countExec1Before = beforeMap['role-executive-1'] || 0;
    const countExec2Before = beforeMap['role-executive-2'] || 0;
    const countExec3Before = beforeMap['role-executive-3'] || 0;
    const countAdminBefore = beforeMap['role-admin'] || 0;
    const countTrainerBefore = beforeMap['role-trainer'] || 0;

    await conn.beginTransaction();
    console.log('\n[TRANSACTION] Memulai transaksi atomic...');

    // Matikan FK sementara dalam transaksi untuk menangani update urutan
    await conn.query('SET FOREIGN_KEY_CHECKS = 0');

    // === TAHAP 1: role-executive-1 -> role-executive-tmp-swap ===
    console.log('  Langkah 1/3: role-executive-1 -> role-executive-tmp-swap');
    await conn.query(`
      UPDATE users 
      SET role_id = 'role-executive-tmp-swap' 
      WHERE role_id = 'role-executive-1'
    `);
    await conn.query(`
      UPDATE roles 
      SET id = 'role-executive-tmp-swap' 
      WHERE id = 'role-executive-1'
    `);

    // === TAHAP 2: role-executive-3 -> role-executive-1 ===
    console.log('  Langkah 2/3: role-executive-3 -> role-executive-1');
    await conn.query(`
      UPDATE users 
      SET role_id = 'role-executive-1' 
      WHERE role_id = 'role-executive-3'
    `);
    await conn.query(`
      UPDATE roles 
      SET 
        id = 'role-executive-1',
        name = 'Eksekutif 1 (Level Nasional / Kapolri)',
        description = 'Pimpinan tingkat Mabes Polri / Korlantas — akses penuh pemantauan seluruh 34 Polda se-Indonesia'
      WHERE id = 'role-executive-3'
    `);

    // === TAHAP 3: role-executive-tmp-swap -> role-executive-3 ===
    console.log('  Langkah 3/3: role-executive-tmp-swap -> role-executive-3');
    await conn.query(`
      UPDATE users 
      SET role_id = 'role-executive-3' 
      WHERE role_id = 'role-executive-tmp-swap'
    `);
    await conn.query(`
      UPDATE roles 
      SET 
        id = 'role-executive-3',
        name = 'Eksekutif 3 (Level Polres / Kapolres)',
        description = 'Pimpinan tingkat Polres — akses pemantauan performa & laporan kegiatan khusus di wilayah Polres terdaftar'
      WHERE id = 'role-executive-tmp-swap'
    `);

    // Aktifkan kembali FK checks sebelum commit
    await conn.query('SET FOREIGN_KEY_CHECKS = 1');

    // 2. Audit Sesudah (dalam transaksi)
    const [afterUsers]: any = await conn.query('SELECT role_id, COUNT(*) as c FROM users GROUP BY role_id');
    const afterMap: Record<string, number> = {};
    for (const row of afterUsers) {
      afterMap[row.role_id] = Number(row.c);
    }
    console.log('\n[AFTER] Distribusi User per Role:');
    console.table(afterMap);

    const countExec1After = afterMap['role-executive-1'] || 0;
    const countExec2After = afterMap['role-executive-2'] || 0;
    const countExec3After = afterMap['role-executive-3'] || 0;
    const countAdminAfter = afterMap['role-admin'] || 0;
    const countTrainerAfter = afterMap['role-trainer'] || 0;
    const countTmpAfter = afterMap['role-executive-tmp-swap'] || 0;

    // Verifikasi Integritas Data
    if (countTmpAfter !== 0) {
      throw new Error(`Data sementara masih tersisa di users: ${countTmpAfter}`);
    }
    if (countExec1After !== countExec3Before) {
      throw new Error(`Jumlah user role-executive-1 (${countExec1After}) tidak sama dengan role-executive-3 sebelumnya (${countExec3Before})!`);
    }
    if (countExec3After !== countExec1Before) {
      throw new Error(`Jumlah user role-executive-3 (${countExec3After}) tidak sama dengan role-executive-1 sebelumnya (${countExec1Before})!`);
    }
    if (countExec2After !== countExec2Before) {
      throw new Error(`Jumlah user role-executive-2 berubah! Sebelum=${countExec2Before}, Sesudah=${countExec2After}`);
    }
    if (countAdminAfter !== countAdminBefore || countTrainerAfter !== countTrainerBefore) {
      throw new Error(`Role admin atau trainer tersentuh!`);
    }

    // Cek akun khusus
    const [kapolri]: any = await conn.query("SELECT id, username, role_id, executive_level FROM users WHERE username = 'kapolri'");
    console.log('\nVerifikasi Akun Kapolri:', kapolri[0]);
    if (kapolri[0]?.role_id !== 'role-executive-1') {
      throw new Error(`Akun kapolri seharusnya role-executive-1, ditemukan: ${kapolri[0]?.role_id}`);
    }

    const [sampleKapolres]: any = await conn.query("SELECT id, username, role_id, executive_level, polres FROM users WHERE username LIKE 'kapolres_%' LIMIT 3");
    console.log('Sample Akun Kapolres:', sampleKapolres);
    for (const k of sampleKapolres) {
      if (k.role_id !== 'role-executive-3') {
        throw new Error(`Akun kapolres ${k.username} seharusnya role-executive-3, ditemukan: ${k.role_id}`);
      }
    }

    await conn.commit();
    console.log('\n[SUCCESS] Transaksi berhasil di-COMMIT ke basis data MySQL!');
  } catch (err) {
    await conn.rollback();
    console.error('\n[ROLLBACK] Terjadi kegagalan! Perubahan di-ROLLBACK:', err);
    throw err;
  } finally {
    conn.release();
    process.exit(0);
  }
}

runMigrationUp().catch(err => {
  console.error(err);
  process.exit(1);
});

