/**
 * SM-LEARNING DIKMAS POLRI — MySQL Data Access Layer
 * =============================================================================
 * Arsitektur:
 *   1. Saat server boot, `initDb()` menghubungkan pool mysql2 ke database `sm_learning`.
 *   2. Seluruh tabel dihidrasi ke cache memori lokal.
 *   3. 14 fungsi `get*` dan `save*` beroperasi sinkron pada cache dan
 *      menjalankan persistensi asinkron ke MySQL secara fire-and-forget (dengan
 *      log error bila gagal).
 *   4. Endpoint tetap instan, 48 rute server.ts tidak perlu diubah ke async
 *      hanya demi pembacaan data.
 *
 * Konfigurasi DB (dari .env bila ada, fallback ke default XAMPP):
 *   DB_HOST = localhost
 *   DB_PORT = 3306
 *   DB_USER = root
 *   DB_PASSWORD = ''
 *   DB_NAME = sm_learning
 */

import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { MaterialItem } from './types';

dotenv.config();

export interface DbConfig {
  host?: string;
  port?: number;
  user?: string;
  password?: string;
  database?: string;
}

let pool: mysql.Pool | null = null;
let isInitialized = false;

// -----------------------------------------------------------------------------
// In-Memory Caches (dihidrasi dari MySQL saat boot)
// -----------------------------------------------------------------------------

interface UserDataState {
  roles: any[];
  users: any[];
}

interface LearningRecordsState {
  userProgress: any[];
  quizAttempts: any[];
  certificates: any[];
  userBookmarks: any[];
  userHistory: any[];
  auditLogs: any[];
  notifications: any[];
}

let outreachSessionsCache: any[] = [];
let outreachReportsCache: any[] = [];
let learningEventsCache: any[] = [];
let sessionParticipantsCache: any[] = [];
let materialsCache: MaterialItem[] = [];
let userDataCache: UserDataState = { roles: [], users: [] };
let learningRecordsCache: LearningRecordsState = {
  userProgress: [],
  quizAttempts: [],
  certificates: [],
  userBookmarks: [],
  userHistory: [],
  auditLogs: [],
  notifications: [],
};

// Master wilayah cache untuk validasi & lookup cepat
export interface WilayahPolda {
  poldaId: string;
  nama: string;
  isWilayah: boolean;
}

export interface WilayahPolres {
  poldaId: string;
  polresId: string;
  nama: string;
}

export interface MasterInstansiItem {
  id: string;
  nama: string;
}

export interface MasterOrganisasiItem {
  id: string;
  instansiId?: string;
  nama: string;
}

export interface MasterSubOrgItem {
  id: string;
  organisasiId?: string;
  nama: string;
}

export interface MasterSatkerItem {
  id: string;
  subOrgId?: string;
  nama: string;
}

let poldaCache: WilayahPolda[] = [];
let polresCache: WilayahPolres[] = [];
let masterInstansiCache: MasterInstansiItem[] = [];
let masterOrganisasiCache: MasterOrganisasiItem[] = [];
let masterSubOrgCache: MasterSubOrgItem[] = [];
let masterSatkerCache: MasterSatkerItem[] = [];

function toMySqlDatetime(val: any): string | null {
  if (!val) return null;
  const d = new Date(val);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 19).replace('T', ' ');
}

// -----------------------------------------------------------------------------
// Inisialisasi Pool & Auto-Bootstrap
// -----------------------------------------------------------------------------

export function getDbConfig(): DbConfig {
  return {
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'sm_learning',
  };
}

export async function initDb(configOverride?: DbConfig): Promise<void> {
  const config = configOverride || getDbConfig();

  // 1. Pastikan database ada terlebih dahulu lewat root connection
  try {
    const rootConn = await mysql.createConnection({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
    });
    await rootConn.query(
      `CREATE DATABASE IF NOT EXISTS \`${config.database}\`
       DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
    await rootConn.end();
  } catch (err) {
    console.warn('[DB] Gagal memastikan database lewat root connection, lanjut ke pool:', err);
  }

  // 2. Buat pool
  pool = mysql.createPool({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    database: config.database,
    waitForConnections: true,
    connectionLimit: 15,
    queueLimit: 0,
    charset: 'utf8mb4',
    dateStrings: true,
    multipleStatements: true,
  });

  // Uji koneksi awal
  const conn = await pool.getConnection();
  try {
    await autoBootstrapIfEmpty(conn);
  } finally {
    conn.release();
  }

  // Pastikan tabel-tabel master kedinasan sudah ada (idempotent CREATE)
  try {
    await conn.query(`
      CREATE TABLE IF NOT EXISTS \`instansi\` (
        \`id\`            VARCHAR(50)  NOT NULL,
        \`nama_instansi\` VARCHAR(255) NOT NULL,
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

      CREATE TABLE IF NOT EXISTS \`organisasi\` (
        \`id\`              VARCHAR(50)  NOT NULL,
        \`instansi_id\`      VARCHAR(50)  NOT NULL,
        \`nama_organisasi\` VARCHAR(255) NOT NULL,
        PRIMARY KEY (\`id\`),
        KEY \`idx_org_instansi\` (\`instansi_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

      CREATE TABLE IF NOT EXISTS \`sub_organisasi\` (
        \`id\`                  VARCHAR(50)  NOT NULL,
        \`organisasi_id\`        VARCHAR(50)  NOT NULL,
        \`nama_sub_organisasi\` VARCHAR(255) NOT NULL,
        PRIMARY KEY (\`id\`),
        KEY \`idx_sub_org\` (\`organisasi_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

      CREATE TABLE IF NOT EXISTS \`satker\` (
        \`id\`                VARCHAR(50)  NOT NULL,
        \`sub_organisasi_id\` VARCHAR(50)  NOT NULL,
        \`nama_satker\`       VARCHAR(255) NOT NULL,
        PRIMARY KEY (\`id\`),
        KEY \`idx_satker_sub\` (\`sub_organisasi_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

      CREATE TABLE IF NOT EXISTS \`master_instansi\` (
        \`id\`   VARCHAR(50)  NOT NULL,
        \`nama\` VARCHAR(255) NOT NULL,
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

      CREATE TABLE IF NOT EXISTS \`master_organisasi\` (
        \`id\`   VARCHAR(50)  NOT NULL,
        \`nama\` VARCHAR(255) NOT NULL,
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

      CREATE TABLE IF NOT EXISTS \`master_sub_org\` (
        \`id\`   VARCHAR(50)  NOT NULL,
        \`nama\` VARCHAR(255) NOT NULL,
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

      CREATE TABLE IF NOT EXISTS \`master_satker\` (
        \`id\`   VARCHAR(50)  NOT NULL,
        \`nama\` VARCHAR(255) NOT NULL,
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

      CREATE TABLE IF NOT EXISTS \`ai_chat_sessions\` (
        \`id\`         VARCHAR(80)  NOT NULL,
        \`user_id\`    VARCHAR(50)  NOT NULL,
        \`title\`      VARCHAR(255) NOT NULL,
        \`created_at\` DATETIME     NOT NULL,
        \`updated_at\` DATETIME     NOT NULL,
        PRIMARY KEY (\`id\`),
        KEY \`idx_chat_user\` (\`user_id\`),
        KEY \`idx_chat_updated\` (\`updated_at\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

      CREATE TABLE IF NOT EXISTS \`ai_chat_messages\` (
        \`id\`         VARCHAR(80)  NOT NULL,
        \`session_id\` VARCHAR(80)  NOT NULL,
        \`user_id\`    VARCHAR(50)  NOT NULL,
        \`role\`       ENUM('user', 'assistant', 'system') NOT NULL,
        \`content\`    LONGTEXT     NOT NULL,
        \`created_at\` DATETIME     NOT NULL,
        PRIMARY KEY (\`id\`),
        KEY \`idx_chat_session\` (\`session_id\`),
        KEY \`idx_chat_msg_user\` (\`user_id\`),
        KEY \`idx_chat_created\` (\`created_at\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
  } catch (err) {
    // Ignore if already exist
  }

  // Auto-seed data master instansi/organisasi/sub_organisasi/satker jika masih kosong
  try {
    const [insCountRows]: any = await conn.query('SELECT COUNT(*) as c FROM instansi');
    if (Number(insCountRows[0]?.c) === 0) {
      await autoSeedMasterKedinasan(conn);
    }
  } catch (_e) {
    // Fallback seed
  }

  // Pastikan kolom baru di tabel users sudah ada (idempotent ALTER)
  try {
    const [cols]: any = await conn.query('SHOW COLUMNS FROM users LIKE "phone"');
    if (!cols || cols.length === 0) {
      await conn.query(`
        ALTER TABLE users
          ADD COLUMN \`phone\` VARCHAR(50) NULL AFTER \`is_active\`,
          ADD COLUMN \`email\` VARCHAR(150) NULL AFTER \`phone\`,
          ADD COLUMN \`photo_url\` LONGTEXT NULL AFTER \`email\`,
          ADD COLUMN \`nip\` VARCHAR(100) NULL AFTER \`photo_url\`,
          ADD COLUMN \`instansi\` VARCHAR(200) NULL AFTER \`unit\`,
          ADD COLUMN \`organisasi\` VARCHAR(200) NULL AFTER \`instansi\`,
          ADD COLUMN \`sub_org\` VARCHAR(200) NULL AFTER \`organisasi\`,
          ADD COLUMN \`satker\` VARCHAR(200) NULL AFTER \`sub_org\`
      `);
    }
  } catch (err) {
    // Ignore if columns already exist or non-critical
  }

  // Auto-migration: bersihkan nama prefix POLDA & POLRES di database MySQL yang sudah ada
  try {
    await conn.query(`
      UPDATE polda
      SET nama = TRIM(SUBSTRING(nama, 7))
      WHERE nama LIKE 'POLDA %'
    `);
    await conn.query(`
      UPDATE polres
      SET nama = TRIM(SUBSTRING(nama, 14))
      WHERE nama LIKE 'POLRES METRO %'
    `);
    await conn.query(`
      UPDATE polres
      SET nama = TRIM(SUBSTRING(nama, 12))
      WHERE nama LIKE 'POLRESTABES %'
    `);
    await conn.query(`
      UPDATE polres
      SET nama = TRIM(SUBSTRING(nama, 10))
      WHERE nama LIKE 'POLRESTA %'
    `);
    await conn.query(`
      UPDATE polres
      SET nama = TRIM(SUBSTRING(nama, 8))
      WHERE nama LIKE 'POLRES %'
    `);
    await conn.query(`
      UPDATE users
      SET polda = TRIM(SUBSTRING(polda, 7))
      WHERE polda LIKE 'POLDA %'
    `);
    await conn.query(`
      UPDATE users
      SET polres = TRIM(SUBSTRING(polres, 14))
      WHERE polres LIKE 'POLRES METRO %'
    `);
    await conn.query(`
      UPDATE users
      SET polres = TRIM(SUBSTRING(polres, 12))
      WHERE polres LIKE 'POLRESTABES %'
    `);
    await conn.query(`
      UPDATE users
      SET polres = TRIM(SUBSTRING(polres, 10))
      WHERE polres LIKE 'POLRESTA %'
    `);
    await conn.query(`
      UPDATE users
      SET polres = TRIM(SUBSTRING(polres, 8))
      WHERE polres LIKE 'POLRES %'
    `);
  } catch (migErr) {
    // Non-critical auto-clean
  }

  await hydrateAllFromDb();
  isInitialized = true;
  console.log(`[DB] MySQL terhubung ke "${config.database}" (${userDataCache.users.length} akun, ${poldaCache.length} polda, ${materialsCache.length} materi).`);
}

/**
 * Otomatis jalankan skema + seed wilayah & akun jika database masih kosong.
 */
async function autoBootstrapIfEmpty(conn: mysql.PoolConnection): Promise<void> {
  // Cek apakah tabel polda sudah ada dan terisi
  let poldaCount = 0;
  try {
    const [rows]: any = await conn.query('SELECT COUNT(*) AS c FROM polda');
    poldaCount = Number(rows[0]?.c) || 0;
  } catch (_e) {
    poldaCount = 0;
  }

  if (poldaCount > 0) {
    return; // Sudah terisi, tidak perlu bootstrap ulang
  }

  console.log('[DB] Database kosong terdeteksi. Menjalankan auto-bootstrap schema & seed...');
  const rootDir = process.cwd();

  // 1. Eksekusi schema.sql
  const schemaPath = path.join(rootDir, 'schema.sql');
  if (fs.existsSync(schemaPath)) {
    const schemaSql = fs.readFileSync(schemaPath, 'utf-8');
    await conn.query(schemaSql);
  }

  // 2. Parse & seed data_polda
  const poldaCsvPath = path.join(rootDir, 'data_polda');
  const poldaList: Array<{ id: string; nama: string; isWilayah: number }> = [];
  if (fs.existsSync(poldaCsvPath)) {
    const poldaCsv = fs.readFileSync(poldaCsvPath, 'utf-8');
    const poldaRows = parseCsvSimple(poldaCsv);
    for (let i = 1; i < poldaRows.length; i++) {
      const row = poldaRows[i];
      if (row.length < 3) continue;
      const poldaId = row[1].padStart(2, '0');
      const rawNama = row[2];
      const nama = rawNama.replace(/^POLDA\s+/i, '').trim();
      const isWilayah = poldaId === '90' || poldaId === '99' ? 0 : 1;
      poldaList.push({ id: poldaId, nama, isWilayah });
      await conn.query(
        `INSERT INTO polda (polda_id, nama, is_wilayah) VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE nama = VALUES(nama), is_wilayah = VALUES(is_wilayah)`,
        [poldaId, nama, isWilayah]
      );
    }
  }

  // 3. Parse & seed data_polres
  const polresCsvPath = path.join(rootDir, 'data_polres');
  const polresRows: string[][] = [];
  if (fs.existsSync(polresCsvPath)) {
    const polresCsv = fs.readFileSync(polresCsvPath, 'utf-8');
    const parsedPolres = parseCsvSimple(polresCsv);
    for (let i = 0; i < parsedPolres.length; i++) {
      polresRows.push(parsedPolres[i]);
    }
    for (let i = 1; i < polresRows.length; i++) {
      const row = polresRows[i];
      if (row.length < 4) continue;
      const polresId = row[1];
      const poldaId = row[2].padStart(2, '0');
      const rawNama = row[3];
      const nama = rawNama
        .replace(/^POLRES\s+METRO\s+/i, '')
        .replace(/^POLRESTABES\s+/i, '')
        .replace(/^POLRESTA\s+/i, '')
        .replace(/^POLRES\s+/i, '')
        .trim();
      if (poldaId === '00' || !poldaList.some(p => p.id === poldaId)) continue;

      await conn.query(
        `INSERT INTO polres (polda_id, polres_id, nama) VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE nama = VALUES(nama)`,
        [poldaId, polresId, nama]
      );
    }
  }

  // 4. Seed roles
  const DEFAULT_ROLES_PAYLOAD = [
    {
      id: 'role-admin',
      name: 'Admin / Superuser',
      description: 'Akses penuh ke seluruh sistem, modul pembelajaran, analitik, laporan, dan manajemen hak akses user',
      permissions: [
        { menuId: 'beranda', menuLabel: 'Beranda', actions: ['view', 'add', 'edit', 'delete'] },
        { menuId: 'public-portal', menuLabel: 'Portal Edukasi Publik (/umum)', actions: ['view', 'add', 'edit', 'delete'] },
        { menuId: 'learning', menuLabel: 'Learning', actions: ['view', 'add', 'edit', 'delete'] },
        { menuId: 'my-learning', menuLabel: 'My Learning', actions: ['view', 'add', 'edit', 'delete'] },
        { menuId: 'progress', menuLabel: 'Capaian & Sertifikat', actions: ['view', 'add', 'edit', 'delete'] },
        { menuId: 'trainer-outreach', menuLabel: 'Lap Giat', actions: ['view', 'add', 'edit', 'delete'] },
        { menuId: 'content-management', menuLabel: 'Manajemen Konten', actions: ['view', 'add', 'edit', 'delete'] },
        { menuId: 'executive', menuLabel: 'Eksekutif Dashboard', actions: ['view', 'add', 'edit', 'delete'] },
        { menuId: 'reports', menuLabel: 'Laporan & Ekspor', actions: ['view', 'add', 'edit', 'delete'] },
        { menuId: 'user-akses', menuLabel: 'User Akses', actions: ['view', 'add', 'edit', 'delete'] },
        { menuId: 'katalog', menuLabel: 'Katalog Materi', actions: ['view', 'add', 'edit', 'delete'] },
        { menuId: 'jenjang', menuLabel: 'Jenjang Pendidikan', actions: ['view', 'add', 'edit', 'delete'] },
        { menuId: 'video', menuLabel: 'Video', actions: ['view', 'add', 'edit', 'delete'] },
        { menuId: 'dokumen', menuLabel: 'Dokumen', actions: ['view', 'add', 'edit', 'delete'] },
        { menuId: 'infografis', menuLabel: 'Infografis', actions: ['view', 'add', 'edit', 'delete'] },
        { menuId: 'kuis', menuLabel: 'Kuis & Evaluasi', actions: ['view', 'add', 'edit', 'delete'] },
        { menuId: 'favorit', menuLabel: 'Favorit', actions: ['view', 'add', 'edit', 'delete'] },
        { menuId: 'riwayat', menuLabel: 'Riwayat', actions: ['view', 'add', 'edit', 'delete'] },
      ],
    },
    {
      id: 'role-trainer',
      name: 'Trainer / Instruktur',
      description: 'Tenaga pendidik kepolisian — dapat melihat, menambah, dan mengedit silabus materi, modul, video, dan kuis',
      permissions: [
        { menuId: 'beranda', menuLabel: 'Beranda', actions: ['view'] },
        { menuId: 'public-portal', menuLabel: 'Portal Edukasi Publik (/umum)', actions: ['view'] },
        { menuId: 'learning', menuLabel: 'Learning', actions: ['view', 'add', 'edit'] },
        { menuId: 'my-learning', menuLabel: 'My Learning', actions: ['view', 'add', 'edit'] },
        { menuId: 'progress', menuLabel: 'Capaian & Sertifikat', actions: ['view'] },
        { menuId: 'trainer-outreach', menuLabel: 'Lap Giat', actions: ['view', 'add', 'edit'] },
        { menuId: 'content-management', menuLabel: 'Manajemen Konten', actions: ['view', 'add', 'edit'] },
        { menuId: 'reports', menuLabel: 'Laporan & Ekspor', actions: ['view'] },
        { menuId: 'katalog', menuLabel: 'Katalog Materi', actions: ['view', 'add', 'edit'] },
        { menuId: 'jenjang', menuLabel: 'Jenjang Pendidikan', actions: ['view'] },
        { menuId: 'video', menuLabel: 'Video', actions: ['view', 'add', 'edit'] },
        { menuId: 'dokumen', menuLabel: 'Dokumen', actions: ['view', 'add', 'edit'] },
        { menuId: 'infografis', menuLabel: 'Infografis', actions: ['view', 'add', 'edit'] },
        { menuId: 'kuis', menuLabel: 'Kuis & Evaluasi', actions: ['view', 'add', 'edit'] },
        { menuId: 'favorit', menuLabel: 'Favorit', actions: ['view', 'add', 'edit', 'delete'] },
        { menuId: 'riwayat', menuLabel: 'Riwayat', actions: ['view'] },
      ],
    },
    {
      id: 'role-executive-1',
      name: 'Eksekutif 1 (Level Polres / Kapolres)',
      description: 'Pimpinan tingkat Polres — akses pemantauan performa & laporan kegiatan khusus di wilayah Polres terdaftar',
      permissions: [
        { menuId: 'beranda', menuLabel: 'Beranda', actions: ['view'] },
        { menuId: 'public-portal', menuLabel: 'Portal Edukasi Publik (/umum)', actions: ['view'] },
        { menuId: 'executive', menuLabel: 'Eksekutif Dashboard', actions: ['view'] },
        { menuId: 'reports', menuLabel: 'Laporan & Ekspor', actions: ['view'] },
        { menuId: 'learning', menuLabel: 'Learning', actions: ['view'] },
        { menuId: 'my-learning', menuLabel: 'My Learning', actions: ['view'] },
        { menuId: 'progress', menuLabel: 'Capaian & Sertifikat', actions: ['view'] },
        { menuId: 'katalog', menuLabel: 'Katalog Materi', actions: ['view'] },
        { menuId: 'jenjang', menuLabel: 'Jenjang Pendidikan', actions: ['view'] },
        { menuId: 'video', menuLabel: 'Video', actions: ['view'] },
        { menuId: 'dokumen', menuLabel: 'Dokumen', actions: ['view'] },
        { menuId: 'infografis', menuLabel: 'Infografis', actions: ['view'] },
        { menuId: 'kuis', menuLabel: 'Kuis & Evaluasi', actions: ['view'] },
        { menuId: 'favorit', menuLabel: 'Favorit', actions: ['view'] },
        { menuId: 'riwayat', menuLabel: 'Riwayat', actions: ['view'] },
      ],
    },
    {
      id: 'role-executive-2',
      name: 'Eksekutif 2 (Level Polda / Kapolda)',
      description: 'Pimpinan tingkat Polda — akses pemantauan performa & laporan seluruh Polres di wilayah Polda terdaftar',
      permissions: [
        { menuId: 'beranda', menuLabel: 'Beranda', actions: ['view'] },
        { menuId: 'public-portal', menuLabel: 'Portal Edukasi Publik (/umum)', actions: ['view'] },
        { menuId: 'executive', menuLabel: 'Eksekutif Dashboard', actions: ['view'] },
        { menuId: 'reports', menuLabel: 'Laporan & Ekspor', actions: ['view'] },
        { menuId: 'learning', menuLabel: 'Learning', actions: ['view'] },
        { menuId: 'my-learning', menuLabel: 'My Learning', actions: ['view', 'add', 'edit'] },
        { menuId: 'progress', menuLabel: 'Capaian & Sertifikat', actions: ['view'] },
        { menuId: 'katalog', menuLabel: 'Katalog Materi', actions: ['view'] },
        { menuId: 'jenjang', menuLabel: 'Jenjang Pendidikan', actions: ['view'] },
        { menuId: 'video', menuLabel: 'Video', actions: ['view'] },
        { menuId: 'dokumen', menuLabel: 'Dokumen', actions: ['view'] },
        { menuId: 'infografis', menuLabel: 'Infografis', actions: ['view'] },
        { menuId: 'kuis', menuLabel: 'Kuis & Evaluasi', actions: ['view'] },
        { menuId: 'favorit', menuLabel: 'Favorit', actions: ['view'] },
        { menuId: 'riwayat', menuLabel: 'Riwayat', actions: ['view'] },
      ],
    },
    {
      id: 'role-executive-3',
      name: 'Eksekutif 3 (Level Nasional / Kapolri)',
      description: 'Pimpinan tingkat Mabes Polri / Korlantas — akses penuh pemantauan seluruh 34 Polda se-Indonesia',
      permissions: [
        { menuId: 'beranda', menuLabel: 'Beranda', actions: ['view'] },
        { menuId: 'public-portal', menuLabel: 'Portal Edukasi Publik (/umum)', actions: ['view'] },
        { menuId: 'executive', menuLabel: 'Eksekutif Dashboard', actions: ['view'] },
        { menuId: 'reports', menuLabel: 'Laporan & Ekspor', actions: ['view'] },
        { menuId: 'learning', menuLabel: 'Learning', actions: ['view'] },
        { menuId: 'my-learning', menuLabel: 'My Learning', actions: ['view'] },
        { menuId: 'progress', menuLabel: 'Capaian & Sertifikat', actions: ['view'] },
        { menuId: 'katalog', menuLabel: 'Katalog Materi', actions: ['view'] },
        { menuId: 'jenjang', menuLabel: 'Jenjang Pendidikan', actions: ['view'] },
        { menuId: 'video', menuLabel: 'Video', actions: ['view'] },
        { menuId: 'dokumen', menuLabel: 'Dokumen', actions: ['view'] },
        { menuId: 'infografis', menuLabel: 'Infografis', actions: ['view'] },
        { menuId: 'kuis', menuLabel: 'Kuis & Evaluasi', actions: ['view'] },
        { menuId: 'favorit', menuLabel: 'Favorit', actions: ['view'] },
        { menuId: 'riwayat', menuLabel: 'Riwayat', actions: ['view'] },
      ],
    },
  ];

  const userDataPath = path.join(rootDir, 'data', 'user-data.json');
  let oldRoles: any[] = [];
  if (fs.existsSync(userDataPath)) {
    const raw = JSON.parse(fs.readFileSync(userDataPath, 'utf-8'));
    oldRoles = raw.roles || [];
  }

  const mergedRoles = [...DEFAULT_ROLES_PAYLOAD];
  for (const r of oldRoles) {
    if (!mergedRoles.some(m => m.id === r.id)) {
      mergedRoles.push(r);
    }
  }

  for (const r of mergedRoles) {
    const permList = (r as any).permissions || [
      { menuId: 'beranda', menuLabel: 'Beranda', actions: ['view'] },
      { menuId: 'executive', menuLabel: 'Eksekutif Dashboard', actions: ['view'] },
      { menuId: 'reports', menuLabel: 'Laporan & Ekspor', actions: ['view'] },
      { menuId: 'learning', menuLabel: 'Learning', actions: ['view'] },
      { menuId: 'my-learning', menuLabel: 'My Learning', actions: ['view'] },
      { menuId: 'progress', menuLabel: 'Capaian & Sertifikat', actions: ['view'] },
      { menuId: 'katalog', menuLabel: 'Katalog Materi', actions: ['view'] },
      { menuId: 'jenjang', menuLabel: 'Jenjang Pendidikan', actions: ['view'] },
      { menuId: 'video', menuLabel: 'Video', actions: ['view'] },
      { menuId: 'dokumen', menuLabel: 'Dokumen', actions: ['view'] },
      { menuId: 'infografis', menuLabel: 'Infografis', actions: ['view'] },
      { menuId: 'kuis', menuLabel: 'Kuis & Evaluasi', actions: ['view'] },
      { menuId: 'favorit', menuLabel: 'Favorit', actions: ['view'] },
      { menuId: 'riwayat', menuLabel: 'Riwayat', actions: ['view'] },
    ];
    await conn.query(
      `INSERT INTO roles (id, name, description, permissions) VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description), permissions = VALUES(permissions)`,
      [r.id, r.name, r.description || null, JSON.stringify(permList)]
    );
  }

  // 5. Seed materials dari JSON
  const matPath = path.join(rootDir, 'data', 'materials.json');
  if (fs.existsSync(matPath)) {
    const raw = JSON.parse(fs.readFileSync(matPath, 'utf-8'));
    for (const m of raw) {
      const extra = {
        typeLabel: m.typeLabel,
        badgeTag: m.badgeTag,
        imageUrl: m.imageUrl,
        imageAlt: m.imageAlt,
        metadataText: m.metadataText,
        readTime: m.readTime,
        duration: m.duration,
        questionsCount: m.questionsCount,
        pageCount: m.pageCount,
        isNew: m.isNew,
        featured: m.featured,
        size: m.size,
        author: m.author,
        publishDate: m.publishDate,
        summary: m.summary,
        keyPoints: m.keyPoints,
        videoUrl: m.videoUrl,
        downloadSize: m.downloadSize,
        passingScore: m.passingScore,
      };
      await conn.query(
        `INSERT INTO materials (
           id, title, level, type, type_label, description,
           publish_status, public_access, views, downloads,
           author, publish_date, estimated_hours, certification_available,
           modules, quiz, presentation, extra
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           title = VALUES(title),
           level = VALUES(level),
           type = VALUES(type),
           type_label = VALUES(type_label),
           description = VALUES(description),
           publish_status = VALUES(publish_status),
           public_access = VALUES(public_access),
           author = VALUES(author),
           publish_date = VALUES(publish_date),
           estimated_hours = VALUES(estimated_hours),
           certification_available = VALUES(certification_available),
           modules = VALUES(modules),
           quiz = VALUES(quiz),
           presentation = VALUES(presentation),
           extra = VALUES(extra)`,
        [
          m.id,
          m.title,
          m.level,
          m.type,
          m.typeLabel || null,
          m.description || null,
          m.publishStatus || 'published',
          m.publicAccess || 'allowed',
          m.views || 0,
          m.downloads || 0,
          m.author || null,
          m.publishDate || null,
          m.estimatedHours || null,
          m.certificationAvailable ? 1 : 0,
          m.modules ? JSON.stringify(m.modules) : null,
          m.quiz ? JSON.stringify(m.quiz) : null,
          m.presentation ? JSON.stringify(m.presentation) : null,
          JSON.stringify(extra),
        ]
      );
    }
  }

  // 6. Generate akun pengguna (Nasional, Polda, Polres, Trainer)
  const regionalPoldas = poldaList.filter(p => p.isWilayah === 1);
  const accountRows: any[] = [];
  const usedUsernames = new Set<string>();

  const sanitizeSlug = (str: string) => {
    return str
      .toLowerCase()
      .replace(/^polda\s+/i, '')
      .replace(/^polres\s+/i, '')
      .replace(/^polresta\s+/i, '')
      .replace(/^polrestabes\s+/i, '')
      .replace(/^polres\s+metro\s+/i, '')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  };

  const getUniqueUsername = (base: string) => {
    let name = base;
    let counter = 2;
    while (usedUsernames.has(name)) {
      name = `${base}_${counter}`;
      counter++;
    }
    usedUsernames.add(name);
    return name;
  };

  // 1. Superuser
  const uSuper = getUniqueUsername('superuser');
  accountRows.push({
    id: 'user-1',
    username: uSuper,
    password: '123456',
    fullName: 'AKBP Hendra Wijaya, S.I.K.',
    roleId: 'role-admin',
    isActive: 1,
    executiveLevel: null,
    poldaId: null,
    polresId: null,
    position: 'Administrator Sistem',
    unit: 'Korlantas Polri',
    polda: 'KORLANTAS POLRI',
    polres: null,
    createdAt: '2026-01-01',
  });

  // 2. Kapolri (Eksekutif 3 / Tingkat Nasional)
  const uKapolri = getUniqueUsername('kapolri');
  accountRows.push({
    id: 'user-kapolri',
    username: uKapolri,
    password: '123456',
    fullName: 'Jenderal Polisi Drs. Listyo Sigit Prabowo, M.Si. (Kapolri)',
    roleId: 'role-executive-3',
    isActive: 1,
    executiveLevel: 'nasional',
    poldaId: null,
    polresId: null,
    position: 'Kapolri',
    unit: 'Mabes Polri',
    polda: 'MABES POLRI (NASIONAL)',
    polres: null,
    createdAt: '2026-01-01',
  });

  // 3. 34 Kapolda (Eksekutif 2 / Tingkat Polda)
  for (const p of regionalPoldas) {
    const slugPolda = sanitizeSlug(p.nama);
    const username = getUniqueUsername(`kapolda_${slugPolda}`);
    accountRows.push({
      id: `user-kapolda-${p.id}`,
      username: username,
      password: '123456',
      fullName: `Kapolda ${p.nama.replace(/^POLDA\s+/i, '')}`,
      roleId: 'role-executive-2',
      isActive: 1,
      executiveLevel: 'polda',
      poldaId: p.id,
      polresId: null,
      position: `Kapolda (${p.nama})`,
      unit: p.nama,
      polda: p.nama,
      polres: null,
      createdAt: '2026-01-15',
    });
  }

  // 4. Seluruh Kapolres per Polda (Eksekutif 1 / Tingkat Polres)
  for (let i = 1; i < polresRows.length; i++) {
    const row = polresRows[i];
    if (row.length < 4) continue;
    const polresId = row[1];
    const poldaId = row[2].padStart(2, '0');
    const namaPolres = row[3];

    if (poldaId === '00') continue;
    const parentPolda = poldaList.find(p => p.id === poldaId);
    if (!parentPolda) continue;

    const slugPolres = sanitizeSlug(namaPolres);
    const username = getUniqueUsername(`kapolres_${slugPolres}`);

    accountRows.push({
      id: `user-kapolres-${poldaId}-${polresId}`,
      username: username,
      password: '123456',
      fullName: `Kapolres ${namaPolres.replace(/^POLRES(TA|TABES)?\s+/i, '').replace(/^METRO\s+/i, '')}`,
      roleId: 'role-executive-1',
      isActive: 1,
      executiveLevel: 'polres',
      poldaId: poldaId,
      polresId: polresId,
      position: `Kapolres (${namaPolres})`,
      unit: namaPolres,
      polda: parentPolda.nama,
      polres: namaPolres,
      createdAt: '2026-01-15',
    });
  }

  // 5. 34 Trainer (Satu per Polda)
  for (const p of regionalPoldas) {
    const slugPolda = sanitizeSlug(p.nama);
    const username = getUniqueUsername(`trainer_${slugPolda}`);
    accountRows.push({
      id: `user-trainer-${p.id}`,
      username: username,
      password: '123456',
      fullName: `Instruktur Dikmas ${p.nama.replace(/^POLDA\s+/i, '')}`,
      roleId: 'role-trainer',
      isActive: 1,
      executiveLevel: null,
      poldaId: p.id,
      polresId: null,
      position: 'Instruktur Dikmas Lantas',
      unit: `Ditlantas ${p.nama}`,
      polda: p.nama,
      polres: null,
      createdAt: '2026-01-15',
    });
  }

  // 6. Akun legacy bawaan
  const uTrainer1 = getUniqueUsername('trainer1');
  accountRows.push({
    id: 'user-2',
    username: uTrainer1,
    password: '123456',
    fullName: 'Kompol Budi Santoso, S.H. (Trainer Metro Jaya)',
    roleId: 'role-trainer',
    isActive: 1,
    executiveLevel: null,
    poldaId: '12',
    polresId: null,
    position: 'Kanit Dikyasa',
    unit: 'Ditlantas Polda Metro Jaya',
    polda: 'POLDA METRO JAYA',
    polres: 'POLRES METRO JAKARTA SELATAN',
    createdAt: '2026-01-15',
  });

  const uExec = getUniqueUsername('executive');
  accountRows.push({
    id: 'user-3',
    username: uExec,
    password: '123456',
    fullName: 'Irjen Pol. Drs. Ahmad Fauzi, M.Si. (Kapolda Metro Jaya)',
    roleId: 'role-executive-2',
    isActive: 1,
    executiveLevel: 'polda',
    poldaId: '12',
    polresId: null,
    position: 'Kapolda Metro Jaya',
    unit: 'Polda Metro Jaya',
    polda: 'POLDA METRO JAYA',
    polres: null,
    createdAt: '2026-02-01',
  });

  for (const u of accountRows) {
    await conn.query(
      `INSERT IGNORE INTO users (
         id, username, password, full_name, role_id, is_active,
         executive_level, polda_id, polres_id, position, unit, polda, polres, created_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        u.id,
        u.username,
        u.password,
        u.fullName,
        u.roleId,
        u.isActive,
        u.executiveLevel || null,
        u.poldaId || null,
        u.polresId || null,
        u.position || null,
        u.unit || null,
        u.polda || null,
        u.polres || null,
        u.createdAt,
      ]
    );
  }

  console.log('[DB] Auto-bootstrap selesai.');
}

async function autoSeedMasterKedinasan(conn: mysql.PoolConnection): Promise<void> {
  // 1. Instansi
  const INSTANSI_DATA = [
    ['ins-kemenko-polkam', 'Kementerian Koordinator Bidang Politik dan Keamanan'],
    ['ins-kemenko-perekonomian', 'Kementerian Koordinator Bidang Perekonomian'],
    ['ins-kemenko-pmk', 'Kementerian Koordinator Bidang Pembangunan Manusia dan Kebudayaan'],
    ['ins-kemenko-infrastruktur', 'Kementerian Koordinator Bidang Infrastruktur dan Pembangunan Kewilayahan'],
    ['ins-kemenko-pangan', 'Kementerian Koordinator Bidang Pangan'],
    ['ins-kemenko-hukum-ham', 'Kementerian Koordinator Bidang Hukum, Hak Asasi Manusia, Imigrasi, dan Pemasyarakatan'],
    ['ins-kemenko-pemberdayaan', 'Kementerian Koordinator Bidang Pemberdayaan Masyarakat'],
    ['ins-kemenkeu', 'Kementerian Keuangan'],
    ['ins-kemendagri', 'Kementerian Dalam Negeri'],
    ['ins-kemenlu', 'Kementerian Luar Negeri'],
    ['ins-kemenhan', 'Kementerian Pertahanan'],
    ['ins-kemenkum', 'Kementerian Hukum'],
    ['ins-kemenimipas', 'Kementerian Imigrasi dan Pemasyarakatan'],
    ['ins-kemenkes', 'Kementerian Kesehatan'],
    ['ins-kemendikdasmen', 'Kementerian Pendidikan Dasar dan Menengah'],
    ['ins-kemendiktisaintek', 'Kementerian Pendidikan Tinggi, Sains, dan Teknologi'],
    ['ins-kemenbud', 'Kementerian Kebudayaan'],
    ['ins-kemenag', 'Kementerian Agama'],
    ['ins-komdigi', 'Kementerian Komunikasi dan Digital'],
    ['ins-kemenhub', 'Kementerian Perhubungan'],
    ['ins-kementan', 'Kementerian Pertanian'],
    ['ins-kemenpu', 'Kementerian Pekerjaan Umum'],
    ['ins-kemenperkim', 'Kementerian Perumahan dan Kawasan Permukiman'],
    ['ins-kemenatrbpn', 'Kementerian Agraria dan Tata Ruang / Badan Pertanahan Nasional'],
    ['ins-kemenaker', 'Kementerian Ketenagakerjaan'],
    ['ins-kemensos', 'Kementerian Sosial'],
    ['ins-kemenesdm', 'Kementerian Energi dan Sumber Daya Mineral'],
    ['ins-kemenperin', 'Kementerian Perindustrian'],
    ['ins-kemendag', 'Kementerian Perdagangan'],
    ['ins-kemenhut', 'Kementerian Kehutanan'],
    ['ins-kemenlh', 'Kementerian Lingkungan Hidup'],
    ['ins-kemenkkp', 'Kementerian Kelautan dan Perikanan'],
    ['ins-kemenparekraf', 'Kementerian Pariwisata dan Ekonomi Kreatif'],
    ['ins-kemenkop', 'Kementerian Koperasi'],
    ['ins-kemenukm', 'Kementerian Usaha Mikro, Kecil, dan Menengah'],
    ['ins-kemenbumn', 'Kementerian Badan Usaha Milik Negara'],
    ['ins-kemenpanrb', 'Kementerian Pendayagunaan Aparatur Negara dan Reformasi Birokrasi'],
    ['ins-kemenppn', 'Kementerian Perencanaan Pembangunan Nasional / Bappenas'],
    ['ins-kemenpora', 'Kementerian Pemuda dan Olahraga'],
    ['ins-kemenpppa', 'Kementerian Pemberdayaan Perempuan dan Perlindungan Anak'],
    ['ins-kemeninvestasi', 'Kementerian Investasi dan Hilirisasi / BKPM'],
    ['ins-kemendes', 'Kementerian Desa dan Pembangunan Daerah Tertinggal'],
    ['ins-kemenp2mi', 'Kementerian Perlindungan Pekerja Migran Indonesia / BP2MI'],
    ['ins-polri', 'Kepolisian Negara Republik Indonesia'],
    ['ins-tni-ad', 'Tentara Nasional Indonesia Angkatan Darat'],
    ['ins-tni-al', 'Tentara Nasional Indonesia Angkatan Laut'],
    ['ins-tni-au', 'Tentara Nasional Indonesia Angkatan Udara'],
    ['ins-kejaksaan', 'Kejaksaan Republik Indonesia'],
    ['ins-ma', 'Mahkamah Agung Republik Indonesia'],
    ['ins-kpk', 'Komisi Pemberantasan Korupsi'],
    ['ins-bpk', 'Badan Pemeriksa Keuangan'],
    ['ins-bps', 'Badan Pusat Statistik'],
    ['ins-bssn', 'Badan Siber dan Sandi Negara'],
    ['ins-bin', 'Badan Intelijen Negara'],
    ['ins-bnpb', 'Badan Nasional Penanggulangan Bencana'],
    ['ins-basarnas', 'Badan Nasional Pencarian dan Pertolongan'],
    ['ins-bpom', 'Badan Pengawas Obat dan Makanan'],
    ['ins-bmkg', 'Badan Meteorologi, Klimatologi, dan Geofisika'],
    ['ins-bkn', 'Badan Kepegawaian Negara']
  ];

  for (const [id, nama] of INSTANSI_DATA) {
    await conn.query(
      `INSERT IGNORE INTO instansi (id, nama_instansi) VALUES (?, ?)`,
      [id, nama]
    );
    await conn.query(
      `INSERT IGNORE INTO master_instansi (id, nama) VALUES (?, ?)`,
      [id, nama]
    );
  }

  // 2. Organisasi
  const ORGANISASI_DATA = [
    ['org-kemenkeu-djp', 'ins-kemenkeu', 'Direktorat Jenderal Pajak'],
    ['org-kemenkeu-djbc', 'ins-kemenkeu', 'Direktorat Jenderal Bea dan Cukai'],
    ['org-kemenkeu-djpb', 'ins-kemenkeu', 'Direktorat Jenderal Perbendaharaan'],
    ['org-kemenkeu-djkn', 'ins-kemenkeu', 'Direktorat Jenderal Kekayaan Negara'],
    ['org-kemenkeu-dja', 'ins-kemenkeu', 'Direktorat Jenderal Anggaran'],
    ['org-kemendagri-dukcapil', 'ins-kemendagri', 'Direktorat Jenderal Kependudukan dan Pencatatan Sipil'],
    ['org-kemendagri-otda', 'ins-kemendagri', 'Direktorat Jenderal Otonomi Daerah'],
    ['org-kemendagri-pemdes', 'ins-kemendagri', 'Direktorat Jenderal Bina Pemerintahan Desa'],
    ['org-kemendagri-bangda', 'ins-kemendagri', 'Direktorat Jenderal Bina Pembangunan Daerah'],
    ['org-kemenkum-ahu', 'ins-kemenkum', 'Direktorat Jenderal Administrasi Hukum Umum'],
    ['org-kemenkum-ki', 'ins-kemenkum', 'Direktorat Jenderal Kekayaan Intelektual'],
    ['org-kemenkum-pp', 'ins-kemenkum', 'Direktorat Jenderal Peraturan Perundang-undangan'],
    ['org-kemenimipas-imigrasi', 'ins-kemenimipas', 'Direktorat Jenderal Imigrasi'],
    ['org-kemenimipas-pas', 'ins-kemenimipas', 'Direktorat Jenderal Pemasyarakatan'],
    ['org-kemenkes-yankes', 'ins-kemenkes', 'Direktorat Jenderal Pelayanan Kesehatan'],
    ['org-kemenkes-p2p', 'ins-kemenkes', 'Direktorat Jenderal Pencegahan dan Pengendalian Penyakit'],
    ['org-kemenkes-farmalkes', 'ins-kemenkes', 'Direktorat Jenderal Kefarmasian dan Alat Kesehatan'],
    ['org-kemenkes-nakes', 'ins-kemenkes', 'Direktorat Jenderal Tenaga Kesehatan'],
    ['org-kemendikdasmen-paud', 'ins-kemendikdasmen', 'Direktorat Jenderal Pendidikan Anak Usia Dini, Pendidikan Dasar, dan Pendidikan Menengah'],
    ['org-kemendikdasmen-guru', 'ins-kemendikdasmen', 'Direktorat Jenderal Guru dan Tenaga Kependidikan'],
    ['org-kemendikdasmen-vokasi', 'ins-kemendikdasmen', 'Direktorat Jenderal Pendidikan Vokasi'],
    ['org-kemendiktisaintek-dikti', 'ins-kemendiktisaintek', 'Direktorat Jenderal Pendidikan Tinggi'],
    ['org-kemendiktisaintek-riset', 'ins-kemendiktisaintek', 'Direktorat Jenderal Riset dan Pengembangan'],
    ['org-komdigi-aptika', 'ins-komdigi', 'Direktorat Jenderal Aplikasi Informatika'],
    ['org-komdigi-ppi', 'ins-komdigi', 'Direktorat Jenderal Penyelenggaraan Pos dan Informatika'],
    ['org-komdigi-sdppi', 'ins-komdigi', 'Direktorat Jenderal Sumber Daya dan Perangkat Pos dan Informatika'],
    ['org-komdigi-ikp', 'ins-komdigi', 'Direktorat Jenderal Informasi dan Komunikasi Publik'],
    ['org-kemenhub-hubdat', 'ins-kemenhub', 'Direktorat Jenderal Perhubungan Darat'],
    ['org-kemenhub-hubla', 'ins-kemenhub', 'Direktorat Jenderal Perhubungan Laut'],
    ['org-kemenhub-hubud', 'ins-kemenhub', 'Direktorat Jenderal Perhubungan Udara'],
    ['org-kemenhub-kereta', 'ins-kemenhub', 'Direktorat Jenderal Perkeretaapian'],
    ['org-kementan-tanaman', 'ins-kementan', 'Direktorat Jenderal Tanaman Pangan'],
    ['org-kementan-horti', 'ins-kementan', 'Direktorat Jenderal Hortikultura'],
    ['org-kementan-ternak', 'ins-kementan', 'Direktorat Jenderal Peternakan dan Kesehatan Hewan'],
    ['org-kementan-kebun', 'ins-kementan', 'Direktorat Jenderal Perkebunan'],
    ['org-kemenpu-binamarga', 'ins-kemenpu', 'Direktorat Jenderal Bina Marga'],
    ['org-kemenpu-ciptakarya', 'ins-kemenpu', 'Direktorat Jenderal Cipta Karya'],
    ['org-kemenpu-sda', 'ins-kemenpu', 'Direktorat Jenderal Sumber Daya Air'],
    ['org-kemenperkim-perumahan', 'ins-kemenperkim', 'Direktorat Jenderal Perumahan dan Kawasan Permukiman'],
    ['org-kemenatrbpn-survei', 'ins-kemenatrbpn', 'Direktorat Jenderal Survei dan Pemetaan Pertanahan dan Ruang'],
    ['org-kemenatrbpn-hak', 'ins-kemenatrbpn', 'Direktorat Jenderal Penetapan Hak dan Pendaftaran Tanah'],
    ['org-kemenatrbpn-tataruang', 'ins-kemenatrbpn', 'Direktorat Jenderal Tata Ruang'],
    ['org-kemenaker-vokasi', 'ins-kemenaker', 'Direktorat Jenderal Pembinaan Pelatihan Vokasi dan Produktivitas'],
    ['org-kemenaker-wasnaker', 'ins-kemenaker', 'Direktorat Jenderal Pembinaan Pengawasan Ketenagakerjaan dan K3'],
    ['org-kemenaker-phi', 'ins-kemenaker', 'Direktorat Jenderal Pembinaan Hubungan Industrial dan Jamsos'],
    ['org-kemensos-linjamsos', 'ins-kemensos', 'Direktorat Jenderal Perlindungan dan Jaminan Sosial'],
    ['org-kemensos-rehsos', 'ins-kemensos', 'Direktorat Jenderal Rehabilitasi Sosial'],
    ['org-kemensos-dayasos', 'ins-kemensos', 'Direktorat Jenderal Pemberdayaan Sosial'],
    ['org-kemenag-pendis', 'ins-kemenag', 'Direktorat Jenderal Pendidikan Islam'],
    ['org-kemenag-bimas-islam', 'ins-kemenag', 'Direktorat Jenderal Bimbingan Masyarakat Islam'],
    ['org-kemenag-phu', 'ins-kemenag', 'Direktorat Jenderal Penyelenggaraan Haji dan Umrah'],
    ['org-kemenlu-protkons', 'ins-kemenlu', 'Direktorat Jenderal Protokol dan Konsuler'],
    ['org-kemenlu-multilateral', 'ins-kemenlu', 'Direktorat Jenderal Kerja Sama Multilateral'],
    ['org-kemenesdm-migas', 'ins-kemenesdm', 'Direktorat Jenderal Minyak dan Gas Bumi'],
    ['org-kemenesdm-listrik', 'ins-kemenesdm', 'Direktorat Jenderal Ketenagalistrikan'],
    ['org-kemenesdm-minerba', 'ins-kemenesdm', 'Direktorat Jenderal Mineral dan Batubara'],
    ['org-kemenesdm-ebtke', 'ins-kemenesdm', 'Direktorat Jenderal Energi Baru, Terbarukan, dan Konservasi Energi'],
    ['org-kemenperin-ikma', 'ins-kemenperin', 'Direktorat Jenderal Industri Kecil, Menengah, dan Aneka'],
    ['org-kemenperin-ilmate', 'ins-kemenperin', 'Direktorat Jenderal Industri Logam, Mesin, Alat Transportasi, dan Elektronika'],
    ['org-kemendag-pdn', 'ins-kemendag', 'Direktorat Jenderal Perdagangan Dalam Negeri'],
    ['org-kemendag-pln', 'ins-kemendag', 'Direktorat Jenderal Perdagangan Luar Negeri'],
    ['org-kemendag-pktn', 'ins-kemendag', 'Direktorat Jenderal Perlindungan Konsumen dan Tertib Niaga'],
    ['org-kemenhut-ksdae', 'ins-kemenhut', 'Direktorat Jenderal Konservasi Sumber Daya Alam dan Ekosistem'],
    ['org-kemenhut-gakkum', 'ins-kemenhut', 'Direktorat Jenderal Penegakan Hukum Kehutanan'],
    ['org-kemenlh-pslb3', 'ins-kemenlh', 'Direktorat Jenderal Pengelolaan Sampah, Limbah, dan B3'],
    ['org-kemenlh-ppkl', 'ins-kemenlh', 'Direktorat Jenderal Pengendalian Pencemaran dan Kerusakan Lingkungan'],
    ['org-kemenkkp-tangkap', 'ins-kemenkkp', 'Direktorat Jenderal Perikanan Tangkap'],
    ['org-kemenkkp-budidaya', 'ins-kemenkkp', 'Direktorat Jenderal Perikanan Budidaya'],
    ['org-kemenkkp-psdkp', 'ins-kemenkkp', 'Direktorat Jenderal Pengawasan Sumber Daya Kelautan dan Perikanan'],
    ['org-polri-korlantas', 'ins-polri', 'Korps Lalu Lintas'],
    ['org-polri-bareskrim', 'ins-polri', 'Badan Reserse Kriminal'],
    ['org-polri-baharkam', 'ins-polri', 'Badan Pemelihara Keamanan'],
    ['org-polri-korbrimob', 'ins-polri', 'Korps Brigade Mobil'],
    ['org-polri-baintelkam', 'ins-polri', 'Badan Intelijen Keamanan'],
    ['org-tniad-pom', 'ins-tni-ad', 'Pusat Polisi Militer Angkatan Darat'],
    ['org-tniad-kodam', 'ins-tni-ad', 'Komando Daerah Militer'],
    ['org-tniad-korem', 'ins-tni-ad', 'Komando Resor Militer'],
    ['org-tnial-pom', 'ins-tni-al', 'Pusat Polisi Militer Angkatan Laut'],
    ['org-tnial-koarmada', 'ins-tni-al', 'Komando Armada RI'],
    ['org-tniau-pom', 'ins-tni-au', 'Pusat Polisi Militer Angkatan Udara'],
    ['org-tniau-koopsud', 'ins-tni-au', 'Komando Operasi Udara Nasional'],
    ['org-kejaksaan-pidum', 'ins-kejaksaan', 'Jaksa Agung Muda Bidang Tindak Pidana Umum'],
    ['org-kejaksaan-pidsus', 'ins-kejaksaan', 'Jaksa Agung Muda Bidang Tindak Pidana Khusus'],
    ['org-kejaksaan-intel', 'ins-kejaksaan', 'Jaksa Agung Muda Bidang Intelijen'],
    ['org-kejaksaan-datun', 'ins-kejaksaan', 'Jaksa Agung Muda Bidang Perdata dan Tata Usaha Negara'],
    ['org-ma-badilum', 'ins-ma', 'Direktorat Jenderal Badan Peradilan Umum'],
    ['org-ma-badilag', 'ins-ma', 'Direktorat Jenderal Badan Peradilan Agama'],
    ['org-ma-badimiltun', 'ins-ma', 'Direktorat Jenderal Badan Peradilan Militer dan Tata Usaha Negara'],
    ['org-kpk-penindakan', 'ins-kpk', 'Deputi Bidang Penindakan dan Eksekusi'],
    ['org-kpk-pencegahan', 'ins-kpk', 'Deputi Bidang Pencegahan dan Monitoring'],
    ['org-kpk-pendidikan', 'ins-kpk', 'Deputi Bidang Pendidikan dan Peran Serta Masyarakat'],
    ['org-bpk-auditorat', 'ins-bpk', 'Auditorat Utama Keuangan Negara'],
    ['org-bps-sosial', 'ins-bps', 'Deputi Bidang Statistik Sosial'],
    ['org-bps-produksi', 'ins-bps', 'Deputi Bidang Statistik Produksi'],
    ['org-bps-distribusi', 'ins-bps', 'Deputi Bidang Statistik Distribusi dan Jasa'],
    ['org-bssn-kripto', 'ins-bssn', 'Deputi Bidang Kriptografi dan Keamanan Siber'],
    ['org-bssn-operasi', 'ins-bssn', 'Deputi Bidang Operasi Keamanan Siber dan Sandi'],
    ['org-bin-dn', 'ins-bin', 'Deputi Bidang Intelijen Dalam Negeri'],
    ['org-bin-ln', 'ins-bin', 'Deputi Bidang Intelijen Luar Negeri'],
    ['org-bnpb-darurat', 'ins-bnpb', 'Deputi Bidang Penanganan Darurat'],
    ['org-bnpb-cegah', 'ins-bnpb', 'Deputi Bidang Pencegahan'],
    ['org-basarnas-ops', 'ins-basarnas', 'Deputi Bidang Operasi Pencarian dan Pertolongan'],
    ['org-bpom-obat', 'ins-bpom', 'Deputi Bidang Pengawasan Obat, Narkotika, Psikotropika, dan Prekursor'],
    ['org-bpom-pangan', 'ins-bpom', 'Deputi Bidang Pengawasan Pangan Olahan'],
    ['org-bmkg-meteo', 'ins-bmkg', 'Deputi Bidang Meteorologi'],
    ['org-bmkg-geofisika', 'ins-bmkg', 'Deputi Bidang Geofisika'],
    ['org-bkn-mutasi', 'ins-bkn', 'Deputi Bidang Mutasi Kepegawaian'],
    ['org-bkn-simpeg', 'ins-bkn', 'Deputi Bidang Sistem Informasi Kepegawaian']
  ];

  for (const [id, insId, nama] of ORGANISASI_DATA) {
    await conn.query(
      `INSERT IGNORE INTO organisasi (id, instansi_id, nama_organisasi) VALUES (?, ?, ?)`,
      [id, insId, nama]
    );
    await conn.query(
      `INSERT IGNORE INTO master_organisasi (id, nama) VALUES (?, ?)`,
      [id, nama]
    );
  }

  // 3. Sub Organisasi
  const SUB_ORG_DATA = [
    ['sub-djp-kanwil', 'org-kemenkeu-djp', 'Kantor Wilayah Direktorat Jenderal Pajak'],
    ['sub-djbc-kanwil', 'org-kemenkeu-djbc', 'Kantor Wilayah Direktorat Jenderal Bea dan Cukai'],
    ['sub-djpb-kanwil', 'org-kemenkeu-djpb', 'Kantor Wilayah Direktorat Jenderal Perbendaharaan'],
    ['sub-djkn-kanwil', 'org-kemenkeu-djkn', 'Kantor Wilayah Direktorat Jenderal Kekayaan Negara'],
    ['sub-dukcapil-prov', 'org-kemendagri-dukcapil', 'Dinas Kependudukan dan Pencatatan Sipil Provinsi'],
    ['sub-pemdes-bina', 'org-kemendagri-pemdes', 'Balai Besar Bina Pemerintahan Desa'],
    ['sub-kemenkum-kanwil', 'org-kemenkum-ahu', 'Kantor Wilayah Kementerian Hukum'],
    ['sub-imigrasi-kanwil', 'org-kemenimipas-imigrasi', 'Divisi Keimigrasian Kantor Wilayah'],
    ['sub-pas-kanwil', 'org-kemenimipas-pas', 'Divisi Pemasyarakatan Kantor Wilayah'],
    ['sub-yankes-rsup', 'org-kemenkes-yankes', 'Direktorat Pelayanan Rumah Sakit Vertikal'],
    ['sub-p2p-bbkk', 'org-kemenkes-p2p', 'Balai Besar Kekarantinaan Kesehatan'],
    ['sub-farmalkes-lab', 'org-kemenkes-farmalkes', 'Balai Besar Pengujian dan Kalibrasi Alat Kesehatan'],
    ['sub-paud-bbpmp', 'org-kemendikdasmen-paud', 'Balai Besar Penjaminan Mutu Pendidikan'],
    ['sub-guru-bbpgp', 'org-kemendikdasmen-guru', 'Balai Besar Guru Penggerak'],
    ['sub-vokasi-bbppmpv', 'org-kemendikdasmen-vokasi', 'Balai Besar Pengembangan Penjaminan Mutu Pendidikan Vokasi'],
    ['sub-dikti-lldikti', 'org-kemendiktisaintek-dikti', 'Lembaga Layanan Pendidikan Tinggi'],
    ['sub-aptika-layanan', 'org-komdigi-aptika', 'Direktorat Layanan Aplikasi Informatika Pemerintahan'],
    ['sub-sdppi-bmon', 'org-komdigi-sdppi', 'Balai Monitor Spektrum Frekuensi Radio'],
    ['sub-hubdat-bptd', 'org-kemenhub-hubdat', 'Balai Pengelola Transportasi Darat'],
    ['sub-hubla-ksop', 'org-kemenhub-hubla', 'Kantor Kesyahbandaran dan Otoritas Pelabuhan Utama'],
    ['sub-hubud-otban', 'org-kemenhub-hubud', 'Kantor Otoritas Bandar Udara'],
    ['sub-kereta-btp', 'org-kemenhub-kereta', 'Balai Teknik Perkeretaapian'],
    ['sub-tanaman-bpts', 'org-kementan-tanaman', 'Balai Besar Pengujian Standar Instrumen Tanaman Pangan'],
    ['sub-horti-bbps', 'org-kementan-horti', 'Balai Besar Pengujian Standar Instrumen Hortikultura'],
    ['sub-ternak-bvet', 'org-kementan-ternak', 'Balai Besar Veteriner'],
    ['sub-binamarga-bbpjn', 'org-kemenpu-binamarga', 'Balai Besar Pelaksanaan Jalan Nasional'],
    ['sub-ciptakarya-bbppw', 'org-kemenpu-ciptakarya', 'Balai Prasarana Permukiman Wilayah'],
    ['sub-sda-bbws', 'org-kemenpu-sda', 'Balai Besar Wilayah Sungai'],
    ['sub-perkim-bp2p', 'org-kemenperkim-perumahan', 'Balai Pelaksana Penyediaan Perumahan'],
    ['sub-atrbpn-kanwil', 'org-kemenatrbpn-hak', 'Kantor Wilayah Badan Pertanahan Nasional'],
    ['sub-vokasi-bbpvp', 'org-kemenaker-vokasi', 'Balai Besar Pelatihan Vokasi dan Produktivitas'],
    ['sub-wasnaker-bbk3', 'org-kemenaker-wasnaker', 'Balai Besar Pengujian K3'],
    ['sub-rehsos-sentra', 'org-kemensos-rehsos', 'Sentra Terpadu Rehabilitasi Sosial'],
    ['sub-kemenag-kanwil', 'org-kemenag-bimas-islam', 'Kantor Wilayah Kementerian Agama'],
    ['sub-kemenlu-kbri', 'org-kemenlu-protkons', 'Kedutaan Besar Republik Indonesia'],
    ['sub-kemenlu-kjri', 'org-kemenlu-protkons', 'Konsulat Jenderal Republik Indonesia'],
    ['sub-minerba-bblm', 'org-kemenesdm-minerba', 'Balai Besar Pengujian Mineral dan Batubara'],
    ['sub-ebtke-bbpke', 'org-kemenesdm-ebtke', 'Balai Besar Pengujian Energi Baru Terbarukan dan Konservasi Energi'],
    ['sub-perin-bbks', 'org-kemenperin-ikma', 'Balai Besar Kerajinan dan Batik'],
    ['sub-dag-bbm', 'org-kemendag-pktn', 'Balai Standardisasi Metrologi Legal'],
    ['sub-ksdae-bbksda', 'org-kemenhut-ksdae', 'Balai Besar Konservasi Sumber Daya Alam'],
    ['sub-ksdae-btn', 'org-kemenhut-ksdae', 'Balai Taman Nasional'],
    ['sub-gakkum-bb', 'org-kemenhut-gakkum', 'Balai Pengamanan dan Penegakan Hukum LHK'],
    ['sub-kkp-bbpbl', 'org-kemenkkp-budidaya', 'Balai Besar Perikanan Budidaya Laut'],
    ['sub-kkp-psdkp', 'org-kemenkkp-psdkp', 'Pangkalan Pengawasan Sumber Daya Kelautan dan Perikanan'],
    ['sub-polri-ditlantas', 'org-polri-korlantas', 'Direktorat Lalu Lintas Kepolisian Daerah'],
    ['sub-polri-ditreskrimum', 'org-polri-bareskrim', 'Direktorat Reserse Kriminal Umum Kepolisian Daerah'],
    ['sub-polri-ditreskrimsus', 'org-polri-bareskrim', 'Direktorat Reserse Kriminal Khusus Kepolisian Daerah'],
    ['sub-polri-ditresnarkoba', 'org-polri-bareskrim', 'Direktorat Reserse Narkoba Kepolisian Daerah'],
    ['sub-polri-ditintelkam', 'org-polri-baintelkam', 'Direktorat Intelijen Keamanan Kepolisian Daerah'],
    ['sub-polri-ditsamapta', 'org-polri-baharkam', 'Direktorat Samapta Kepolisian Daerah'],
    ['sub-polri-ditpolairud', 'org-polri-baharkam', 'Direktorat Kepolisian Perairan dan Udara Kepolisian Daerah'],
    ['sub-polri-satbrimob', 'org-polri-korbrimob', 'Satuan Korps Brigade Mobil Kepolisian Daerah'],
    ['sub-tniad-pomdam', 'org-tniad-pom', 'Polisi Militer Komando Daerah Militer'],
    ['sub-tniad-kodim', 'org-tniad-korem', 'Komando Distrik Militer'],
    ['sub-tnial-pomal', 'org-tnial-pom', 'Detasemen Polisi Militer Angkatan Laut'],
    ['sub-tnial-lantamal', 'org-tnial-koarmada', 'Pangkalan Utama TNI Angkatan Laut'],
    ['sub-tniau-pomau', 'org-tniau-pom', 'Satuan Polisi Militer Angkatan Udara'],
    ['sub-tniau-lanud', 'org-tniau-koopsud', 'Pangkalan TNI Angkatan Udara'],
    ['sub-kejaksaan-kejati', 'org-kejaksaan-pidum', 'Kejaksaan Tinggi'],
    ['sub-ma-pt', 'org-ma-badilum', 'Pengadilan Tinggi'],
    ['sub-ma-pta', 'org-ma-badilag', 'Pengadilan Tinggi Agama'],
    ['sub-ma-pttun', 'org-ma-badimiltun', 'Pengadilan Tinggi Tata Usaha Negara'],
    ['sub-ma-dilmilti', 'org-ma-badimiltun', 'Pengadilan Militer Tinggi'],
    ['sub-kpk-satgas-sidik', 'org-kpk-penindakan', 'Direktorat Penyidikan dan Tindak Pidana Korupsi'],
    ['sub-bpk-perwakilan', 'org-bpk-auditorat', 'Badan Pemeriksa Keuangan Kantor Perwakilan'],
    ['sub-bps-prov', 'org-bps-sosial', 'Badan Pusat Statistik Provinsi'],
    ['sub-bssn-balai', 'org-bssn-kripto', 'Balai Sertifikasi Elektronik'],
    ['sub-bin-posda', 'org-bin-dn', 'Badan Intelijen Negara Daerah'],
    ['sub-bnpb-pusdalops', 'org-bnpb-darurat', 'Pusat Pengendalian Operasi Penanggulangan Bencana'],
    ['sub-basarnas-kantor', 'org-basarnas-ops', 'Kantor Pencarian dan Pertolongan'],
    ['sub-bpom-bbpom', 'org-bpom-obat', 'Balai Besar Pengawas Obat dan Makanan'],
    ['sub-bmkg-bbmkg', 'org-bmkg-meteo', 'Balai Besar Meteorologi, Klimatologi, dan Geofisika'],
    ['sub-bkn-kanreg', 'org-bkn-mutasi', 'Kantor Regional Badan Kepegawaian Negara']
  ];

  for (const [id, orgId, nama] of SUB_ORG_DATA) {
    await conn.query(
      `INSERT IGNORE INTO sub_organisasi (id, organisasi_id, nama_sub_organisasi) VALUES (?, ?, ?)`,
      [id, orgId, nama]
    );
    await conn.query(
      `INSERT IGNORE INTO master_sub_org (id, nama) VALUES (?, ?)`,
      [id, nama]
    );
  }

  // 4. Satker
  const SATKER_DATA = [
    ['stk-kpp-pratama', 'sub-djp-kanwil', 'Kantor Pelayanan Pajak Pratama'],
    ['stk-kpp-madya', 'sub-djp-kanwil', 'Kantor Pelayanan Pajak Madya'],
    ['stk-kppbc-tmp', 'sub-djbc-kanwil', 'Kantor Pengawasan dan Pelayanan Bea dan Cukai Tipe Madya Pabean'],
    ['stk-kppn', 'sub-djpb-kanwil', 'Kantor Pelayanan Perbendaharaan Negara'],
    ['stk-kpknl', 'sub-djkn-kanwil', 'Kantor Pelayanan Kekayaan Negara dan Lelang'],
    ['stk-dukcapil-kabkota', 'sub-dukcapil-prov', 'Dinas Kependudukan dan Pencatatan Sipil Kabupaten/Kota'],
    ['stk-bapas', 'sub-pas-kanwil', 'Balai Pemasyarakatan'],
    ['stk-lapas', 'sub-pas-kanwil', 'Lembaga Pemasyarakatan'],
    ['stk-rutan', 'sub-pas-kanwil', 'Rumah Tahanan Negara'],
    ['stk-kanim', 'sub-imigrasi-kanwil', 'Kantor Imigrasi'],
    ['stk-rudinim', 'sub-imigrasi-kanwil', 'Rumah Detensi Imigrasi'],
    ['stk-rsup-vertikal', 'sub-yankes-rsup', 'Rumah Sakit Umum Pusat'],
    ['stk-bkk-pelabuhan', 'sub-p2p-bbkk', 'Balai Kekarantinaan Kesehatan Pelabuhan dan Bandara'],
    ['stk-bpmp-prov', 'sub-paud-bbpmp', 'Balai Penjaminan Mutu Pendidikan Provinsi'],
    ['stk-bgp-prov', 'sub-guru-bbpgp', 'Balai Guru Penggerak Provinsi'],
    ['stk-ptn-universitas', 'sub-dikti-lldikti', 'Perguruan Tinggi Negeri / Universitas Negeri'],
    ['stk-ptn-politeknik', 'sub-vokasi-bbppmpv', 'Politeknik Negeri'],
    ['stk-lokamon-sdppi', 'sub-sdppi-bmon', 'Loka Monitor Spektrum Frekuensi Radio'],
    ['stk-upp-laut', 'sub-hubla-ksop', 'Unit Penyelenggara Pelabuhan'],
    ['stk-upbu-udara', 'sub-hubud-otban', 'Unit Penyelenggara Bandar Udara'],
    ['stk-satpel-hubdat', 'sub-hubdat-bptd', 'Satuan Pelayanan Terminal dan Penyeberangan'],
    ['stk-bvet-daerah', 'sub-ternak-bvet', 'Balai Veteriner Daerah'],
    ['stk-pjn-wilayah', 'sub-binamarga-bbpjn', 'Satuan Kerja Pelaksanaan Jalan Nasional Wilayah'],
    ['stk-sumber-daya-air', 'sub-sda-bbws', 'Satuan Kerja Operasi dan Pemeliharaan Sumber Daya Air'],
    ['stk-kantah-kabkota', 'sub-atrbpn-kanwil', 'Kantor Pertanahan Kabupaten/Kota'],
    ['stk-bpvp-daerah', 'sub-vokasi-bbpvp', 'Balai Pelatihan Vokasi dan Produktivitas'],
    ['stk-sentra-rehsos', 'sub-rehsos-sentra', 'Sentra Rehabilitasi Sosial Anak dan Lansia'],
    ['stk-kemenag-kabkota', 'sub-kemenag-kanwil', 'Kantor Kementerian Agama Kabupaten/Kota'],
    ['stk-kua-kecamatan', 'sub-kemenag-kanwil', 'Kantor Urusan Agama Kecamatan'],
    ['stk-perutusan-pbb', 'sub-kemenlu-kbri', 'Perutusan Tetap Republik Indonesia untuk PBB'],
    ['stk-inspektur-tambang', 'sub-minerba-bblm', 'Seksi Pengawasan Inspektur Tambang Lapangan'],
    ['stk-balai-industri', 'sub-perin-bbks', 'Balai Standardisasi dan Pelayanan Jasa Industri'],
    ['stk-kemendag-metrologi', 'sub-dag-bbm', 'Unit Pelaksana Teknis Metrologi Legal'],
    ['stk-seksikonservasi-bksda', 'sub-ksdae-bbksda', 'Seksi Konservasi Wilayah BKSDA'],
    ['stk-resor-tamannasional', 'sub-ksdae-btn', 'Resor Pengelolaan Taman Nasional'],
    ['stk-pos-gakkum', 'sub-gakkum-bb', 'Pos Pengamanan dan Penegakan Hukum Kawasan Hutan'],
    ['stk-stasiun-psdkp', 'sub-kkp-psdkp', 'Stasiun Pengawasan Sumber Daya Kelautan dan Perikanan'],
    ['stk-satlantas-polres', 'sub-polri-ditlantas', 'Satuan Lalu Lintas Polres'],
    ['stk-satreskrim-polres', 'sub-polri-ditreskrimum', 'Satuan Reserse Kriminal Polres'],
    ['stk-satresnarkoba-polres', 'sub-polri-ditresnarkoba', 'Satuan Reserse Narkoba Polres'],
    ['stk-satintelkam-polres', 'sub-polri-ditintelkam', 'Satuan Intelijen Keamanan Polres'],
    ['stk-satsamapta-polres', 'sub-polri-ditsamapta', 'Satuan Samapta Polres'],
    ['stk-satpolairud-polres', 'sub-polri-ditpolairud', 'Satuan Kepolisian Perairan dan Udara Polres'],
    ['stk-batalyon-brimob', 'sub-polri-satbrimob', 'Batalyon Pelopor / Gegana Satuan Brimob'],
    ['stk-polsek', 'sub-polri-ditsamapta', 'Kepolisian Sektor'],
    ['stk-denpom-ad', 'sub-tniad-pomdam', 'Detasemen Polisi Militer AD'],
    ['stk-koramil-ad', 'sub-tniad-kodim', 'Komando Rayon Militer AD'],
    ['stk-lanal-al', 'sub-tnial-lantamal', 'Pangkalan TNI Angkatan Laut'],
    ['stk-pos-al', 'sub-tnial-lantamal', 'Pos Pengamat TNI Angkatan Laut'],
    ['stk-satrad-au', 'sub-tniau-lanud', 'Satuan Radar Komando Operasi Udara'],
    ['stk-kejari', 'sub-kejaksaan-kejati', 'Kejaksaan Negeri'],
    ['stk-cabjari', 'sub-kejaksaan-kejati', 'Cabang Kejaksaan Negeri'],
    ['stk-pn', 'sub-ma-pt', 'Pengadilan Negeri'],
    ['stk-pa', 'sub-ma-pta', 'Pengadilan Agama'],
    ['stk-ptun', 'sub-ma-pttun', 'Pengadilan Tata Usaha Negara'],
    ['stk-dilmil', 'sub-ma-dilmilti', 'Pengadilan Militer'],
    ['stk-kpk-penyelidikan', 'sub-kpk-satgas-sidik', 'Satuan Tugas Penindakan dan Investigasi Lapangan KPK'],
    ['stk-bpk-subauditorat', 'sub-bpk-perwakilan', 'Subauditorat Daerah Kantor Perwakilan BPK'],
    ['stk-bps-kabkota', 'sub-bps-prov', 'Badan Pusat Statistik Kabupaten/Kota'],
    ['stk-basarnas-pos', 'sub-basarnas-kantor', 'Pos Pencarian dan Pertolongan'],
    ['stk-bpom-loka', 'sub-bpom-bbpom', 'Loka Pengawas Obat dan Makanan'],
    ['stk-bmkg-stasiun-meteo', 'sub-bmkg-bbmkg', 'Stasiun Meteorologi Penerbangan dan Maritim'],
    ['stk-bmkg-stasiun-geo', 'sub-bmkg-bbmkg', 'Stasiun Geofisika dan Klimatologi'],
    ['stk-bkn-upt', 'sub-bkn-kanreg', 'Unit Penyelenggara Seleksi Calon Aparatur Sipil Negara BKN']
  ];

  for (const [id, subId, nama] of SATKER_DATA) {
    await conn.query(
      `INSERT IGNORE INTO satker (id, sub_organisasi_id, nama_satker) VALUES (?, ?, ?)`,
      [id, subId, nama]
    );
    await conn.query(
      `INSERT IGNORE INTO master_satker (id, nama) VALUES (?, ?)`,
      [id, nama]
    );
  }
}

function parseCsvSimple(content: string): string[][] {
  const lines = content.split(/\r?\n/).filter(l => l.trim().length > 0);
  const rows: string[][] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const row: string[] = [];
    let inQuotes = false;
    let cell = '';
    for (let j = 0; j < line.length; j++) {
      const c = line[j];
      if (c === '"') {
        inQuotes = !inQuotes;
      } else if (c === ',' && !inQuotes) {
        row.push(cell.trim());
        cell = '';
      } else {
        cell += c;
      }
    }
    row.push(cell.trim());
    rows.push(row);
  }
  return rows;
}

export function getPool(): mysql.Pool {
  if (!pool) {
    throw new Error('Database pool belum diinisialisasi. Panggil initDb() sebelum mengakses database.');
  }
  return pool;
}

export function isDbReady(): boolean {
  return isInitialized && pool !== null;
}

// -----------------------------------------------------------------------------
// Hidrasi Semua Tabel ke Memori
// -----------------------------------------------------------------------------

export async function hydrateAllFromDb(): Promise<void> {
  const p = getPool();

  // 1. Master wilayah & kedinasan
  const [poldaRows]: any = await p.query('SELECT polda_id, nama, is_wilayah FROM polda ORDER BY polda_id ASC');
  poldaCache = poldaRows.map((r: any) => ({
    poldaId: r.polda_id,
    nama: r.nama,
    isWilayah: Boolean(r.is_wilayah),
  }));

  const [polresRows]: any = await p.query('SELECT polda_id, polres_id, nama FROM polres ORDER BY polda_id ASC, polres_id ASC');
  polresCache = polresRows.map((r: any) => ({
    poldaId: r.polda_id,
    polresId: r.polres_id,
    nama: r.nama,
  }));

  try {
    const [insRows]: any = await p.query(`
      SELECT id, COALESCE(nama_instansi, nama) AS nama FROM (
        SELECT id, nama_instansi, NULL AS nama FROM instansi
        UNION ALL
        SELECT id, NULL AS nama_instansi, nama FROM master_instansi
      ) t WHERE id IS NOT NULL GROUP BY id ORDER BY nama ASC
    `);
    masterInstansiCache = insRows.map((r: any) => ({ id: r.id, nama: r.nama }));
  } catch (_e) {
    try {
      const [insRows]: any = await p.query('SELECT id, nama FROM master_instansi ORDER BY nama ASC');
      masterInstansiCache = insRows.map((r: any) => ({ id: r.id, nama: r.nama }));
    } catch (_e2) {
      masterInstansiCache = [];
    }
  }

  try {
    const [orgRows]: any = await p.query(`
      SELECT id, instansi_id, nama FROM (
        SELECT id, instansi_id, nama_organisasi AS nama FROM organisasi
        UNION ALL
        SELECT id, NULL AS instansi_id, nama FROM master_organisasi
      ) t WHERE id IS NOT NULL GROUP BY id ORDER BY nama ASC
    `);
    masterOrganisasiCache = orgRows.map((r: any) => ({
      id: r.id,
      instansiId: r.instansi_id || undefined,
      nama: r.nama
    }));
  } catch (_e) {
    try {
      const [orgRows]: any = await p.query('SELECT id, nama FROM master_organisasi ORDER BY nama ASC');
      masterOrganisasiCache = orgRows.map((r: any) => ({ id: r.id, nama: r.nama }));
    } catch (_e2) {
      masterOrganisasiCache = [];
    }
  }

  try {
    const [subRows]: any = await p.query(`
      SELECT id, organisasi_id, nama FROM (
        SELECT id, organisasi_id, nama_sub_organisasi AS nama FROM sub_organisasi
        UNION ALL
        SELECT id, NULL AS organisasi_id, nama FROM master_sub_org
      ) t WHERE id IS NOT NULL GROUP BY id ORDER BY nama ASC
    `);
    masterSubOrgCache = subRows.map((r: any) => ({
      id: r.id,
      organisasiId: r.organisasi_id || undefined,
      nama: r.nama
    }));
  } catch (_e) {
    try {
      const [subRows]: any = await p.query('SELECT id, nama FROM master_sub_org ORDER BY nama ASC');
      masterSubOrgCache = subRows.map((r: any) => ({ id: r.id, nama: r.nama }));
    } catch (_e2) {
      masterSubOrgCache = [];
    }
  }

  try {
    const [stkRows]: any = await p.query(`
      SELECT id, sub_organisasi_id, nama FROM (
        SELECT id, sub_organisasi_id, nama_satker AS nama FROM satker
        UNION ALL
        SELECT id, NULL AS sub_organisasi_id, nama FROM master_satker
      ) t WHERE id IS NOT NULL GROUP BY id ORDER BY nama ASC
    `);
    masterSatkerCache = stkRows.map((r: any) => ({
      id: r.id,
      subOrgId: r.sub_organisasi_id || undefined,
      nama: r.nama
    }));
  } catch (_e) {
    try {
      const [stkRows]: any = await p.query('SELECT id, nama FROM master_satker ORDER BY nama ASC');
      masterSatkerCache = stkRows.map((r: any) => ({ id: r.id, nama: r.nama }));
    } catch (_e2) {
      masterSatkerCache = [];
    }
  }

  // 2. Roles & Users
  const [roleRows]: any = await p.query('SELECT id, name, description, permissions FROM roles');
  const roles = roleRows.map((r: any) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    permissions: typeof r.permissions === 'string' ? JSON.parse(r.permissions) : r.permissions,
  }));

  const [userRows]: any = await p.query('SELECT * FROM users');
  const users = userRows.map((u: any) => {
    const parse = (v: any) => (typeof v === 'string' ? (v ? JSON.parse(v) : undefined) : v);
    const extra = parse(u.extra) || {};
    return {
      id: u.id,
      username: u.username,
      password: u.password,
      fullName: u.full_name,
      roleId: u.role_id,
      isActive: Boolean(u.is_active),
      phone: u.phone || extra.phone,
      email: u.email || extra.email,
      photoUrl: u.photo_url || extra.photoUrl,
      nip: u.nip || extra.nip,
      position: u.position || extra.position,
      unit: u.unit || extra.unit,
      instansi: u.instansi || extra.instansi,
      organisasi: u.organisasi || extra.organisasi,
      subOrg: u.sub_org || extra.subOrg,
      satker: u.satker || extra.satker,
      polda: u.polda || extra.polda,
      polres: u.polres || extra.polres,
      executiveLevel: u.executive_level || undefined,
      poldaId: u.polda_id || undefined,
      polresId: u.polres_id || undefined,
      createdAt: u.created_at,
    };
  });

  userDataCache = { roles, users };

  // 3. Materials
  const [matRows]: any = await p.query('SELECT * FROM materials ORDER BY id ASC');
  materialsCache = matRows.map((m: any) => {
    const parse = (v: any) => (typeof v === 'string' ? (v ? JSON.parse(v) : undefined) : v);
    const extra = parse(m.extra) || {};
    return {
      id: m.id,
      title: m.title,
      level: m.level,
      type: m.type,
      typeLabel: m.type_label || extra.typeLabel || '',
      badgeTag: extra.badgeTag,
      description: m.description || '',
      imageUrl: extra.imageUrl || '',
      imageAlt: extra.imageAlt || m.title,
      metadataText: extra.metadataText || '',
      views: Number(m.views) || 0,
      downloads: Number(m.downloads) || 0,
      readTime: extra.readTime,
      duration: extra.duration,
      questionsCount: extra.questionsCount,
      pageCount: extra.pageCount,
      isNew: extra.isNew,
      featured: extra.featured,
      size: extra.size,
      author: m.author || extra.author,
      publishDate: m.publish_date || extra.publishDate,
      summary: extra.summary,
      keyPoints: extra.keyPoints,
      quiz: parse(m.quiz),
      videoUrl: extra.videoUrl,
      downloadSize: extra.downloadSize,
      publishStatus: m.publish_status,
      publicAccess: m.public_access,
      modules: parse(m.modules),
      estimatedHours: m.estimated_hours ? Number(m.estimated_hours) : undefined,
      certificationAvailable: Boolean(m.certification_available),
      passingScore: extra.passingScore,
      presentation: parse(m.presentation),
    } as MaterialItem;
  });

  // 4. Outreach sessions
  const [sessRows]: any = await p.query('SELECT * FROM outreach_sessions ORDER BY created_at DESC');
  outreachSessionsCache = sessRows.map((s: any) => {
    const parse = (v: any) => (typeof v === 'string' ? (v ? JSON.parse(v) : undefined) : v);
    return {
      id: s.id,
      materialId: s.material_id,
      materialTitle: s.material_title,
      trainerId: s.trainer_id,
      trainerName: s.trainer_name,
      trainerPosition: s.trainer_position,
      trainerUnit: s.trainer_unit,
      trainerCompetency: parse(s.trainer_competency),
      activityName: s.activity_name,
      poldaId: s.polda_id,
      polresId: s.polres_id,
      polda: s.polda,
      polres: s.polres,
      location: s.location,
      date: s.date,
      startTime: s.start_time,
      status: s.status,
      publicAccessCode: s.public_access_code,
      publicAccessUrl: s.public_access_url,
      targetParticipants: s.target_participants ? Number(s.target_participants) : undefined,
      audienceType: s.audience_type || parse(s.extra)?.audienceType,
      evidenceImages: parse(s.evidence_images) || parse(s.extra)?.evidenceImages || [],
      description: s.description,
      createdAt: s.created_at,
      closedAt: s.closed_at,
    };
  });

  // 5. Outreach reports
  const [repRows]: any = await p.query('SELECT * FROM outreach_reports ORDER BY created_at DESC');
  outreachReportsCache = repRows.map((r: any) => {
    const parse = (v: any) => (typeof v === 'string' ? (v ? JSON.parse(v) : undefined) : v);
    const extra = parse(r.extra) || {};
    return {
      id: r.id,
      sessionId: r.session_id,
      materialId: r.material_id,
      materialTitle: r.material_title,
      trainerId: r.trainer_id,
      trainerName: r.trainer_name,
      activityName: r.activity_name,
      poldaId: r.polda_id,
      polresId: r.polres_id,
      polda: r.polda,
      polres: r.polres,
      location: r.location,
      date: r.date,
      startTime: r.start_time || extra.startTime || '',
      closedAt: r.closed_at || extra.closedAt || '',
      totalParticipants: Number(r.total_participants) || 0,
      totalViews: Number(r.total_views) || 0,
      totalQuizAttempts: Number(r.total_quiz_attempts) || 0,
      totalQuizCompleted: Number(r.total_quiz_completed) || 0,
      averageScore: Number(r.average_score) || 0,
      passingRate: Number(r.passing_rate) || 0,
      notes: r.notes || '',
      evidenceImages: parse(r.evidence_images) || [],
      createdAt: r.created_at,
      ...extra,
    };
  });

  // 6. Session participants
  const [partRows]: any = await p.query('SELECT * FROM session_participants ORDER BY joined_at DESC');
  sessionParticipantsCache = partRows.map((pt: any) => ({
    id: pt.id,
    sessionId: pt.session_id,
    name: pt.name,
    place: pt.place,
    joinedAt: pt.joined_at,
  }));

  // 7. Learning events
  const [evtRows]: any = await p.query('SELECT * FROM learning_events ORDER BY timestamp DESC');
  learningEventsCache = evtRows.map((e: any) => {
    const parse = (v: any) => (typeof v === 'string' ? (v ? JSON.parse(v) : undefined) : v);
    return {
      id: e.id,
      userId: e.user_id,
      sessionId: e.session_id,
      participantId: e.participant_id,
      materialId: e.material_id,
      eventType: e.event_type,
      details: parse(e.details),
      timestamp: e.timestamp,
    };
  });

  // 8. Learning records (user_progress, bookmarks, history, quiz_attempts, certificates, audit, notifs)
  const [progRows]: any = await p.query('SELECT * FROM user_progress');
  const userProgress = progRows.map((pr: any) => {
    const parse = (v: any) => (typeof v === 'string' ? (v ? JSON.parse(v) : undefined) : v);
    return {
      userId: pr.user_id,
      materialId: pr.material_id,
      progressPercent: Number(pr.progress_percent) || 0,
      status: pr.status,
      completedLessonIds: parse(pr.completed_lesson_ids) || [],
      lastAccessedAt: pr.last_accessed_at,
    };
  });

  const [bookRows]: any = await p.query('SELECT user_id, material_id, created_at FROM user_bookmarks');
  const userBookmarks = bookRows.map((b: any) => ({
    userId: b.user_id,
    materialId: b.material_id,
    createdAt: b.created_at,
  }));

  const [histRows]: any = await p.query('SELECT user_id, material_id, accessed_at FROM user_history ORDER BY accessed_at DESC');
  const userHistory = histRows.map((h: any) => ({
    userId: h.user_id,
    materialId: h.material_id,
    accessedAt: h.accessed_at,
  }));

  const [quizRows]: any = await p.query('SELECT * FROM quiz_attempts ORDER BY started_at DESC');
  const quizAttempts = quizRows.map((q: any) => {
    const parse = (v: any) => (typeof v === 'string' ? (v ? JSON.parse(v) : undefined) : v);
    return {
      attemptId: q.attempt_id,
      id: q.attempt_id,
      userId: q.user_id,
      sessionId: q.session_id,
      participantId: q.participant_id,
      participantName: q.participant_name,
      materialId: q.material_id,
      score: q.score !== null ? Number(q.score) : null,
      passed: Boolean(q.passed),
      passingGrade: Number(q.passing_grade) || 70,
      totalQuestions: q.total_questions !== null ? Number(q.total_questions) : undefined,
      correctAnswers: q.correct_answers !== null ? Number(q.correct_answers) : undefined,
      answers: parse(q.answers),
      completed: Boolean(q.completed),
      startedAt: q.started_at,
      submittedAt: q.submitted_at,
      completedAt: q.submitted_at,
    };
  });

  const [certRows]: any = await p.query('SELECT * FROM certificates ORDER BY issued_at_iso DESC');
  const certificates = certRows.map((c: any) => ({
    certificateId: c.certificate_id,
    certificateNumber: c.certificate_number,
    userId: c.user_id,
    participantId: c.participant_id,
    sessionId: c.session_id,
    recipientName: c.recipient_name,
    institution: c.institution,
    materialId: c.material_id,
    materialTitle: c.material_title,
    score: c.score !== null ? Number(c.score) : undefined,
    completionType: c.completion_type,
    sessionName: c.session_name,
    trainerName: c.trainer_name,
    trainerPosition: c.trainer_position,
    trainerUnit: c.trainer_unit,
    poldaId: c.polda_id,
    polresId: c.polres_id,
    polda: c.polda,
    polres: c.polres,
    completedAt: c.completed_at,
    issuedAt: c.issued_at,
    issuedAtIso: c.issued_at_iso,
    isValid: Boolean(c.is_valid),
  }));

  const [auditRows]: any = await p.query('SELECT * FROM audit_logs ORDER BY created_at DESC');
  const auditLogs = auditRows.map((a: any) => ({
    id: a.id,
    actorId: a.actor_id,
    actorName: a.actor_name,
    action: a.action,
    target: a.target,
    createdAt: a.created_at,
  }));

  const [notifRows]: any = await p.query('SELECT * FROM notifications ORDER BY created_at DESC');
  const notifications = notifRows.map((n: any) => ({
    id: n.id,
    userId: n.user_id,
    title: n.title,
    message: n.message,
    isRead: Boolean(n.is_read),
    createdAt: n.created_at,
  }));

  learningRecordsCache = {
    userProgress,
    userBookmarks,
    userHistory,
    quizAttempts,
    certificates,
    auditLogs,
    notifications,
  };
}

// -----------------------------------------------------------------------------
// 14 Drop-In Read/Write Functions (menggantikan fungsi berbasis file JSON)
// -----------------------------------------------------------------------------

export function readOutreachSessions(): any[] {
  return outreachSessionsCache;
}

export function writeOutreachSessions(data: any[]): void {
  outreachSessionsCache = data;
  if (!pool) return;
  persistOutreachSessions(data).catch(err => {
    console.error('Gagal menyimpan outreach_sessions ke MySQL:', err);
  });
}

export function readOutreachReports(): any[] {
  return outreachReportsCache;
}

export function writeOutreachReports(data: any[]): void {
  outreachReportsCache = data;
  if (!pool) return;
  persistOutreachReports(data).catch(err => {
    console.error('Gagal menyimpan outreach_reports ke MySQL:', err);
  });
}

export function readLearningEvents(): any[] {
  return learningEventsCache;
}

export function writeLearningEvents(data: any[]): void {
  learningEventsCache = data;
  if (!pool) return;
  persistLearningEvents(data).catch(err => {
    console.error('Gagal menyimpan learning_events ke MySQL:', err);
  });
}

export function readSessionParticipants(): any[] {
  return sessionParticipantsCache;
}

export function writeSessionParticipants(data: any[]): void {
  sessionParticipantsCache = data;
  if (!pool) return;
  persistSessionParticipants(data).catch(err => {
    console.error('Gagal menyimpan session_participants ke MySQL:', err);
  });
}

export function readMaterialsData(): MaterialItem[] {
  return materialsCache;
}

export function writeMaterialsData(data: MaterialItem[]): void {
  materialsCache = data;
  if (!pool) return;
  persistMaterials(data).catch(err => {
    console.error('Gagal menyimpan materials ke MySQL:', err);
  });
}

export function readLearningRecords(): LearningRecordsState {
  return learningRecordsCache;
}

export function writeLearningRecords(data: any): void {
  learningRecordsCache = {
    userProgress: data.userProgress || [],
    quizAttempts: data.quizAttempts || [],
    certificates: data.certificates || [],
    userBookmarks: data.userBookmarks || [],
    userHistory: data.userHistory || [],
    auditLogs: data.auditLogs || [],
    notifications: data.notifications || [],
  };
  if (!pool) return;
  persistLearningRecords(learningRecordsCache).catch(err => {
    console.error('Gagal menyimpan learning_records ke MySQL:', err);
  });
}

export function readUserData(): UserDataState {
  return userDataCache;
}

export async function createSingleUser(u: any): Promise<any> {
  const p = getPool();
  try {
    await p.query(
      `INSERT INTO users (
         id, username, password, full_name, role_id, is_active,
         phone, email, photo_url, nip, position, unit, instansi, organisasi, sub_org, satker,
         executive_level, polda_id, polres_id, polda, polres, created_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        u.id,
        u.username,
        u.password || '123456',
        u.fullName,
        u.roleId || 'role-trainer',
        u.isActive ? 1 : 0,
        u.phone || null,
        u.email || null,
        u.photoUrl || null,
        u.nip || null,
        u.position || null,
        u.unit || null,
        u.instansi || null,
        u.organisasi || null,
        u.subOrg || null,
        u.satker || null,
        u.executiveLevel || null,
        u.poldaId || null,
        u.polresId || null,
        u.polda || null,
        u.polres || null,
        u.createdAt || new Date().toISOString().slice(0, 10),
      ]
    );
  } catch (err) {
    // Fallback if schema doesn't have all columns yet
    await p.query(
      `INSERT INTO users (
         id, username, password, full_name, role_id, is_active,
         executive_level, polda_id, polres_id, position, unit, polda, polres, created_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        u.id,
        u.username,
        u.password || '123456',
        u.fullName,
        u.roleId || 'role-trainer',
        u.isActive ? 1 : 0,
        u.executiveLevel || null,
        u.poldaId || null,
        u.polresId || null,
        u.position || null,
        u.unit || null,
        u.polda || null,
        u.polres || null,
        u.createdAt || new Date().toISOString().slice(0, 10),
      ]
    );
  }

  // Update in-memory cache
  const existingIdx = userDataCache.users.findIndex(x => x.id === u.id);
  const safeUser = {
    ...u,
    roleId: u.roleId || 'role-trainer',
    password: u.password || '123456',
    isActive: Boolean(u.isActive),
    createdAt: u.createdAt || new Date().toISOString().slice(0, 10),
  };
  if (existingIdx !== -1) {
    userDataCache.users[existingIdx] = safeUser;
  } else {
    userDataCache.users.unshift(safeUser);
  }
  return safeUser;
}

export async function updateSingleUser(userId: string, u: any): Promise<any> {
  const p = getPool();
  const existing = userDataCache.users.find(x => x.id === userId);
  const finalPassword = u.password && u.password.trim() ? u.password.trim() : (existing?.password || '123456');

  try {
    await p.query(
      `UPDATE users SET
         username = ?,
         password = ?,
         full_name = ?,
         role_id = ?,
         is_active = ?,
         phone = ?,
         email = ?,
         photo_url = ?,
         nip = ?,
         position = ?,
         unit = ?,
         instansi = ?,
         organisasi = ?,
         sub_org = ?,
         satker = ?,
         executive_level = ?,
         polda_id = ?,
         polres_id = ?,
         polda = ?,
         polres = ?
       WHERE id = ?`,
      [
        u.username,
        finalPassword,
        u.fullName,
        u.roleId || existing?.roleId || 'role-trainer',
        u.isActive ? 1 : 0,
        u.phone || null,
        u.email || null,
        u.photoUrl || null,
        u.nip || null,
        u.position || null,
        u.unit || null,
        u.instansi || null,
        u.organisasi || null,
        u.subOrg || null,
        u.satker || null,
        u.executiveLevel || null,
        u.poldaId || null,
        u.polresId || null,
        u.polda || null,
        u.polres || null,
        userId,
      ]
    );
  } catch (err) {
    await p.query(
      `UPDATE users SET
         username = ?,
         password = ?,
         full_name = ?,
         role_id = ?,
         is_active = ?,
         executive_level = ?,
         polda_id = ?,
         polres_id = ?,
         position = ?,
         unit = ?,
         polda = ?,
         polres = ?
       WHERE id = ?`,
      [
        u.username,
        finalPassword,
        u.fullName,
        u.roleId || existing?.roleId || 'role-trainer',
        u.isActive ? 1 : 0,
        u.executiveLevel || null,
        u.poldaId || null,
        u.polresId || null,
        u.position || null,
        u.unit || null,
        u.polda || null,
        u.polres || null,
        userId,
      ]
    );
  }

  // Update cache
  const idx = userDataCache.users.findIndex(x => x.id === userId);
  const updated = {
    ...(existing || {}),
    ...u,
    id: userId,
    password: finalPassword,
    isActive: Boolean(u.isActive),
  };
  if (idx !== -1) {
    userDataCache.users[idx] = updated;
  } else {
    userDataCache.users.unshift(updated);
  }
  return updated;
}

export async function deleteSingleUser(userId: string): Promise<void> {
  const p = getPool();
  await p.query('DELETE FROM users WHERE id = ?', [userId]);
  userDataCache.users = userDataCache.users.filter(x => x.id !== userId);
}

export async function createOrUpdateRole(role: any): Promise<any> {
  const p = getPool();
  await p.query(
    `INSERT INTO roles (id, name, description, permissions)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       name = VALUES(name),
       description = VALUES(description),
       permissions = VALUES(permissions)`,
    [role.id, role.name, role.description || null, JSON.stringify(role.permissions || [])]
  );

  const idx = userDataCache.roles.findIndex(r => r.id === role.id);
  if (idx !== -1) {
    userDataCache.roles[idx] = role;
  } else {
    userDataCache.roles.push(role);
  }
  return role;
}

export async function deleteSingleRole(roleId: string): Promise<void> {
  const p = getPool();
  await p.query('DELETE FROM roles WHERE id = ?', [roleId]);
  userDataCache.roles = userDataCache.roles.filter(r => r.id !== roleId);
}

export async function writeUserData(data: any): Promise<void> {
  userDataCache = {
    roles: data.roles || [],
    users: data.users || [],
  };
  if (!pool) return;
  try {
    await persistUserData(userDataCache);
  } catch (err) {
    console.error('Gagal menyimpan users/roles ke MySQL:', err);
    throw err;
  }
}

// Lookup Master Wilayah & Kedinasan
export function getPoldaList(): WilayahPolda[] {
  return poldaCache;
}

export function getPolresList(poldaId?: string): WilayahPolres[] {
  if (!poldaId) return polresCache;
  return polresCache.filter(p => p.poldaId === poldaId);
}

export function getMasterInstansiList(): MasterInstansiItem[] {
  return masterInstansiCache;
}

export function getMasterOrganisasiList(instansiIdOrNama?: string): MasterOrganisasiItem[] {
  if (!instansiIdOrNama) return masterOrganisasiCache;
  const matchInstansi = masterInstansiCache.find(
    i =>
      i.id.toLowerCase() === instansiIdOrNama.toLowerCase() ||
      i.nama.toLowerCase() === instansiIdOrNama.toLowerCase() ||
      instansiIdOrNama.toLowerCase().includes(i.nama.toLowerCase()) ||
      i.nama.toLowerCase().includes(instansiIdOrNama.toLowerCase())
  );
  if (!matchInstansi) {
    return masterOrganisasiCache;
  }
  const filtered = masterOrganisasiCache.filter(o => o.instansiId === matchInstansi.id);
  return filtered.length > 0 ? filtered : masterOrganisasiCache;
}

export function getMasterSubOrgList(organisasiIdOrNama?: string): MasterSubOrgItem[] {
  if (!organisasiIdOrNama) return masterSubOrgCache;
  const matchOrg = masterOrganisasiCache.find(
    o =>
      o.id.toLowerCase() === organisasiIdOrNama.toLowerCase() ||
      o.nama.toLowerCase() === organisasiIdOrNama.toLowerCase() ||
      organisasiIdOrNama.toLowerCase().includes(o.nama.toLowerCase()) ||
      o.nama.toLowerCase().includes(organisasiIdOrNama.toLowerCase())
  );
  if (!matchOrg) {
    return masterSubOrgCache;
  }
  const filtered = masterSubOrgCache.filter(s => s.organisasiId === matchOrg.id);
  return filtered.length > 0 ? filtered : masterSubOrgCache;
}

export function getMasterSatkerList(subOrgIdOrNama?: string): MasterSatkerItem[] {
  if (!subOrgIdOrNama) return masterSatkerCache;
  const matchSub = masterSubOrgCache.find(
    s =>
      s.id.toLowerCase() === subOrgIdOrNama.toLowerCase() ||
      s.nama.toLowerCase() === subOrgIdOrNama.toLowerCase() ||
      subOrgIdOrNama.toLowerCase().includes(s.nama.toLowerCase()) ||
      s.nama.toLowerCase().includes(subOrgIdOrNama.toLowerCase())
  );
  if (!matchSub) {
    return masterSatkerCache;
  }
  const filtered = masterSatkerCache.filter(stk => stk.subOrgId === matchSub.id);
  return filtered.length > 0 ? filtered : masterSatkerCache;
}

export async function createMasterKedinasanItem(
  type: 'instansi' | 'organisasi' | 'sub_organisasi' | 'satker',
  payload: { id: string; nama: string; parentId?: string }
): Promise<any> {
  const p = getPool();
  if (type === 'instansi') {
    await p.query(`INSERT INTO instansi (id, nama_instansi) VALUES (?, ?) ON DUPLICATE KEY UPDATE nama_instansi = VALUES(nama_instansi)`, [payload.id, payload.nama]);
    await p.query(`INSERT INTO master_instansi (id, nama) VALUES (?, ?) ON DUPLICATE KEY UPDATE nama = VALUES(nama)`, [payload.id, payload.nama]);
    const idx = masterInstansiCache.findIndex(i => i.id === payload.id);
    if (idx !== -1) masterInstansiCache[idx] = { id: payload.id, nama: payload.nama };
    else masterInstansiCache.push({ id: payload.id, nama: payload.nama });
  } else if (type === 'organisasi') {
    await p.query(`INSERT INTO organisasi (id, instansi_id, nama_organisasi) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE instansi_id = VALUES(instansi_id), nama_organisasi = VALUES(nama_organisasi)`, [payload.id, payload.parentId || 'ins-polri', payload.nama]);
    await p.query(`INSERT INTO master_organisasi (id, nama) VALUES (?, ?) ON DUPLICATE KEY UPDATE nama = VALUES(nama)`, [payload.id, payload.nama]);
    const idx = masterOrganisasiCache.findIndex(i => i.id === payload.id);
    if (idx !== -1) masterOrganisasiCache[idx] = { id: payload.id, instansiId: payload.parentId, nama: payload.nama };
    else masterOrganisasiCache.push({ id: payload.id, instansiId: payload.parentId, nama: payload.nama });
  } else if (type === 'sub_organisasi') {
    await p.query(`INSERT INTO sub_organisasi (id, organisasi_id, nama_sub_organisasi) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE organisasi_id = VALUES(organisasi_id), nama_sub_organisasi = VALUES(nama_sub_organisasi)`, [payload.id, payload.parentId || 'org-polri-korlantas', payload.nama]);
    await p.query(`INSERT INTO master_sub_org (id, nama) VALUES (?, ?) ON DUPLICATE KEY UPDATE nama = VALUES(nama)`, [payload.id, payload.nama]);
    const idx = masterSubOrgCache.findIndex(i => i.id === payload.id);
    if (idx !== -1) masterSubOrgCache[idx] = { id: payload.id, organisasiId: payload.parentId, nama: payload.nama };
    else masterSubOrgCache.push({ id: payload.id, organisasiId: payload.parentId, nama: payload.nama });
  } else if (type === 'satker') {
    await p.query(`INSERT INTO satker (id, sub_organisasi_id, nama_satker) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE sub_organisasi_id = VALUES(sub_organisasi_id), nama_satker = VALUES(nama_satker)`, [payload.id, payload.parentId || 'sub-polri-ditlantas', payload.nama]);
    await p.query(`INSERT INTO master_satker (id, nama) VALUES (?, ?) ON DUPLICATE KEY UPDATE nama = VALUES(nama)`, [payload.id, payload.nama]);
    const idx = masterSatkerCache.findIndex(i => i.id === payload.id);
    if (idx !== -1) masterSatkerCache[idx] = { id: payload.id, subOrgId: payload.parentId, nama: payload.nama };
    else masterSatkerCache.push({ id: payload.id, subOrgId: payload.parentId, nama: payload.nama });
  }
  return payload;
}

export async function deleteMasterKedinasanItem(
  type: 'instansi' | 'organisasi' | 'sub_organisasi' | 'satker',
  id: string
): Promise<void> {
  const p = getPool();
  if (type === 'instansi') {
    await p.query(`DELETE FROM instansi WHERE id = ?`, [id]);
    await p.query(`DELETE FROM master_instansi WHERE id = ?`, [id]);
    masterInstansiCache = masterInstansiCache.filter(i => i.id !== id);
  } else if (type === 'organisasi') {
    await p.query(`DELETE FROM organisasi WHERE id = ?`, [id]);
    await p.query(`DELETE FROM master_organisasi WHERE id = ?`, [id]);
    masterOrganisasiCache = masterOrganisasiCache.filter(i => i.id !== id);
  } else if (type === 'sub_organisasi') {
    await p.query(`DELETE FROM sub_organisasi WHERE id = ?`, [id]);
    await p.query(`DELETE FROM master_sub_org WHERE id = ?`, [id]);
    masterSubOrgCache = masterSubOrgCache.filter(i => i.id !== id);
  } else if (type === 'satker') {
    await p.query(`DELETE FROM satker WHERE id = ?`, [id]);
    await p.query(`DELETE FROM master_satker WHERE id = ?`, [id]);
    masterSatkerCache = masterSatkerCache.filter(i => i.id !== id);
  }
}

// -----------------------------------------------------------------------------
// Persistensi Asinkron ke MySQL
// -----------------------------------------------------------------------------

async function persistUserData(data: UserDataState): Promise<void> {
  const p = getPool();
  const conn = await p.getConnection();
  try {
    await conn.beginTransaction();

    // Simpan roles
    for (const r of data.roles) {
      await conn.query(
        `INSERT INTO roles (id, name, description, permissions)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           name = VALUES(name),
           description = VALUES(description),
           permissions = VALUES(permissions)`,
        [r.id, r.name, r.description || null, JSON.stringify(r.permissions || [])]
      );
    }

    // Simpan users
    for (const u of data.users) {
      await conn.query(
        `INSERT INTO users (
           id, username, password, full_name, role_id, is_active,
           phone, email, photo_url, nip, position, unit, instansi, organisasi, sub_org, satker,
           executive_level, polda_id, polres_id, polda, polres, created_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           username = VALUES(username),
           password = VALUES(password),
           full_name = VALUES(full_name),
           role_id = VALUES(role_id),
           is_active = VALUES(is_active),
           phone = VALUES(phone),
           email = VALUES(email),
           photo_url = VALUES(photo_url),
           nip = VALUES(nip),
           position = VALUES(position),
           unit = VALUES(unit),
           instansi = VALUES(instansi),
           organisasi = VALUES(organisasi),
           sub_org = VALUES(sub_org),
           satker = VALUES(satker),
           executive_level = VALUES(executive_level),
           polda_id = VALUES(polda_id),
           polres_id = VALUES(polres_id),
           polda = VALUES(polda),
           polres = VALUES(polres),
           created_at = VALUES(created_at)`,
        [
          u.id,
          u.username,
          u.password,
          u.fullName,
          u.roleId,
          u.isActive ? 1 : 0,
          u.phone || null,
          u.email || null,
          u.photoUrl || null,
          u.nip || null,
          u.position || null,
          u.unit || null,
          u.instansi || null,
          u.organisasi || null,
          u.subOrg || null,
          u.satker || null,
          u.executiveLevel || null,
          u.poldaId || null,
          u.polresId || null,
          u.polda || null,
          u.polres || null,
          u.createdAt || '2026-01-01',
        ]
      );
    }

    // Non-destructive: jangan hapus user existing di database
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function persistMaterials(materials: MaterialItem[]): Promise<void> {
  const p = getPool();
  const conn = await p.getConnection();
  try {
    await conn.beginTransaction();

    for (const m of materials) {
      const extra: Record<string, any> = {
        typeLabel: m.typeLabel,
        badgeTag: m.badgeTag,
        imageUrl: m.imageUrl,
        imageAlt: m.imageAlt,
        metadataText: m.metadataText,
        readTime: m.readTime,
        duration: m.duration,
        questionsCount: m.questionsCount,
        pageCount: m.pageCount,
        isNew: m.isNew,
        featured: m.featured,
        size: m.size,
        author: m.author,
        publishDate: m.publishDate,
        summary: m.summary,
        keyPoints: m.keyPoints,
        videoUrl: m.videoUrl,
        downloadSize: m.downloadSize,
        passingScore: m.passingScore,
      };

      await conn.query(
        `INSERT INTO materials (
           id, title, level, type, type_label, description,
           publish_status, public_access, views, downloads,
           author, publish_date, estimated_hours, certification_available,
           modules, quiz, presentation, extra
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           title = VALUES(title),
           level = VALUES(level),
           type = VALUES(type),
           type_label = VALUES(type_label),
           description = VALUES(description),
           publish_status = VALUES(publish_status),
           public_access = VALUES(public_access),
           views = VALUES(views),
           downloads = VALUES(downloads),
           author = VALUES(author),
           publish_date = VALUES(publish_date),
           estimated_hours = VALUES(estimated_hours),
           certification_available = VALUES(certification_available),
           modules = VALUES(modules),
           quiz = VALUES(quiz),
           presentation = VALUES(presentation),
           extra = VALUES(extra)`,
        [
          m.id,
          m.title,
          m.level,
          m.type,
          m.typeLabel || null,
          m.description || null,
          m.publishStatus || 'published',
          m.publicAccess || 'allowed',
          m.views || 0,
          m.downloads || 0,
          m.author || null,
          m.publishDate || null,
          m.estimatedHours || null,
          m.certificationAvailable ? 1 : 0,
          m.modules ? JSON.stringify(m.modules) : null,
          m.quiz ? JSON.stringify(m.quiz) : null,
          (m as any).presentation ? JSON.stringify((m as any).presentation) : null,
          JSON.stringify(extra),
        ]
      );
    }

    if (materials.length > 0) {
      const matIds = materials.map(m => m.id);
      await conn.query('DELETE FROM materials WHERE id NOT IN (?)', [matIds]);
    }

    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function persistOutreachSessions(sessions: any[]): Promise<void> {
  const p = getPool();
  const conn = await p.getConnection();
  try {
    await conn.beginTransaction();

    for (const s of sessions) {
      await conn.query(
        `INSERT INTO outreach_sessions (
           id, material_id, material_title, trainer_id, trainer_name,
           trainer_position, trainer_unit, trainer_competency, activity_name,
           polda_id, polres_id, polda, polres, location, date, start_time,
           status, public_access_code, public_access_url, target_participants,
           description, created_at, closed_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           material_id = VALUES(material_id),
           material_title = VALUES(material_title),
           trainer_id = VALUES(trainer_id),
           trainer_name = VALUES(trainer_name),
           trainer_position = VALUES(trainer_position),
           trainer_unit = VALUES(trainer_unit),
           trainer_competency = VALUES(trainer_competency),
           activity_name = VALUES(activity_name),
           polda_id = VALUES(polda_id),
           polres_id = VALUES(polres_id),
           polda = VALUES(polda),
           polres = VALUES(polres),
           location = VALUES(location),
           date = VALUES(date),
           start_time = VALUES(start_time),
           status = VALUES(status),
           public_access_code = VALUES(public_access_code),
           public_access_url = VALUES(public_access_url),
           target_participants = VALUES(target_participants),
           description = VALUES(description),
           created_at = VALUES(created_at),
           closed_at = VALUES(closed_at)`,
        [
          s.id,
          s.materialId,
          s.materialTitle || null,
          s.trainerId,
          s.trainerName || null,
          s.trainerPosition || null,
          s.trainerUnit || null,
          s.trainerCompetency ? JSON.stringify(s.trainerCompetency) : null,
          s.activityName || null,
          s.poldaId || null,
          s.polresId || null,
          s.polda || null,
          s.polres || null,
          s.location || null,
          s.date || null,
          s.startTime || null,
          s.status || 'active',
          s.publicAccessCode,
          s.publicAccessUrl || null,
          s.targetParticipants || null,
          s.description || null,
          toMySqlDatetime(s.createdAt),
          toMySqlDatetime(s.closedAt),
        ]
      );
    }

    if (sessions.length > 0) {
      const ids = sessions.map(s => s.id);
      await conn.query('DELETE FROM outreach_sessions WHERE id NOT IN (?)', [ids]);
    } else {
      await conn.query('DELETE FROM outreach_sessions');
    }

    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function persistOutreachReports(reports: any[]): Promise<void> {
  const p = getPool();
  const conn = await p.getConnection();
  try {
    await conn.beginTransaction();

    for (const r of reports) {
      const extra = {
        totalPassed: r.totalPassed,
      };

      await conn.query(
        `INSERT INTO outreach_reports (
           id, session_id, material_id, material_title, trainer_id,
           trainer_name, activity_name, polda_id, polres_id, polda, polres,
           location, date, start_time, closed_at, total_participants,
           total_views, total_quiz_attempts, total_quiz_completed,
           average_score, passing_rate, notes, evidence_images, created_at, extra
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           session_id = VALUES(session_id),
           material_id = VALUES(material_id),
           material_title = VALUES(material_title),
           trainer_id = VALUES(trainer_id),
           trainer_name = VALUES(trainer_name),
           activity_name = VALUES(activity_name),
           polda_id = VALUES(polda_id),
           polres_id = VALUES(polres_id),
           polda = VALUES(polda),
           polres = VALUES(polres),
           location = VALUES(location),
           date = VALUES(date),
           start_time = VALUES(start_time),
           closed_at = VALUES(closed_at),
           total_participants = VALUES(total_participants),
           total_views = VALUES(total_views),
           total_quiz_attempts = VALUES(total_quiz_attempts),
           total_quiz_completed = VALUES(total_quiz_completed),
           average_score = VALUES(average_score),
           passing_rate = VALUES(passing_rate),
           notes = VALUES(notes),
           evidence_images = VALUES(evidence_images),
           created_at = VALUES(created_at),
           extra = VALUES(extra)`,
        [
          r.id,
          r.sessionId,
          r.materialId || null,
          r.materialTitle || null,
          r.trainerId || null,
          r.trainerName || null,
          r.activityName || null,
          r.poldaId || null,
          r.polresId || null,
          r.polda || null,
          r.polres || null,
          r.location || null,
          r.date || null,
          r.startTime || null,
          toMySqlDatetime(r.closedAt),
          r.totalParticipants || 0,
          r.totalViews || 0,
          r.totalQuizAttempts || 0,
          r.totalQuizCompleted || 0,
          r.averageScore || 0,
          r.passingRate || 0,
          r.notes || null,
          r.evidenceImages ? JSON.stringify(r.evidenceImages) : null,
          toMySqlDatetime(r.createdAt),
          JSON.stringify(extra),
        ]
      );
    }

    if (reports.length > 0) {
      const ids = reports.map(r => r.id);
      await conn.query('DELETE FROM outreach_reports WHERE id NOT IN (?)', [ids]);
    } else {
      await conn.query('DELETE FROM outreach_reports');
    }

    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function persistSessionParticipants(participants: any[]): Promise<void> {
  const p = getPool();
  const conn = await p.getConnection();
  try {
    await conn.beginTransaction();

    for (const pt of participants) {
      await conn.query(
        `INSERT INTO session_participants (id, session_id, name, place, joined_at)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           session_id = VALUES(session_id),
           name = VALUES(name),
           place = VALUES(place),
           joined_at = VALUES(joined_at)`,
        [pt.id, pt.sessionId, pt.name, pt.place || null, toMySqlDatetime(pt.joinedAt)]
      );
    }

    if (participants.length > 0) {
      const ids = participants.map(pt => pt.id);
      await conn.query('DELETE FROM session_participants WHERE id NOT IN (?)', [ids]);
    } else {
      await conn.query('DELETE FROM session_participants');
    }

    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function persistLearningEvents(events: any[]): Promise<void> {
  const p = getPool();
  const conn = await p.getConnection();
  try {
    await conn.beginTransaction();

    for (const e of events) {
      await conn.query(
        `INSERT INTO learning_events (
           id, user_id, session_id, participant_id, material_id, event_type, details, timestamp
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           user_id = VALUES(user_id),
           session_id = VALUES(session_id),
           participant_id = VALUES(participant_id),
           material_id = VALUES(material_id),
           event_type = VALUES(event_type),
           details = VALUES(details),
           timestamp = VALUES(timestamp)`,
        [
          e.id,
          e.userId || null,
          e.sessionId || null,
          e.participantId || null,
          e.materialId || null,
          e.eventType,
          e.details ? JSON.stringify(e.details) : null,
          toMySqlDatetime(e.timestamp),
        ]
      );
    }

    if (events.length > 0) {
      const ids = events.map(e => e.id);
      await conn.query('DELETE FROM learning_events WHERE id NOT IN (?)', [ids]);
    } else {
      await conn.query('DELETE FROM learning_events');
    }

    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function persistLearningRecords(records: LearningRecordsState): Promise<void> {
  const p = getPool();
  const conn = await p.getConnection();
  try {
    await conn.beginTransaction();

    // 1. user_progress
    await conn.query('DELETE FROM user_progress');
    for (const pr of records.userProgress) {
      await conn.query(
        `INSERT INTO user_progress (
           user_id, material_id, progress_percent, status, completed_lesson_ids, last_accessed_at
         ) VALUES (?, ?, ?, ?, ?, ?)`,
        [
          pr.userId,
          pr.materialId,
          pr.progressPercent || 0,
          pr.status || 'not_started',
          JSON.stringify(pr.completedLessonIds || []),
          toMySqlDatetime(pr.lastAccessedAt),
        ]
      );
    }

    // 2. user_bookmarks
    await conn.query('DELETE FROM user_bookmarks');
    for (const b of records.userBookmarks) {
      await conn.query(
        'INSERT INTO user_bookmarks (user_id, material_id, created_at) VALUES (?, ?, ?)',
        [b.userId, b.materialId, toMySqlDatetime(b.createdAt)]
      );
    }

    // 3. user_history
    await conn.query('DELETE FROM user_history');
    for (const h of records.userHistory) {
      await conn.query(
        'INSERT INTO user_history (user_id, material_id, accessed_at) VALUES (?, ?, ?)',
        [h.userId, h.materialId, toMySqlDatetime(h.accessedAt)]
      );
    }

    // 4. quiz_attempts
    for (const q of records.quizAttempts) {
      const attemptId = q.attemptId || q.id;
      await conn.query(
        `INSERT INTO quiz_attempts (
           attempt_id, user_id, session_id, participant_id, participant_name,
           material_id, score, passed, passing_grade, total_questions,
           correct_answers, answers, completed, started_at, submitted_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           user_id = VALUES(user_id),
           session_id = VALUES(session_id),
           participant_id = VALUES(participant_id),
           participant_name = VALUES(participant_name),
           material_id = VALUES(material_id),
           score = VALUES(score),
           passed = VALUES(passed),
           passing_grade = VALUES(passing_grade),
           total_questions = VALUES(total_questions),
           correct_answers = VALUES(correct_answers),
           answers = VALUES(answers),
           completed = VALUES(completed),
           started_at = VALUES(started_at),
           submitted_at = VALUES(submitted_at)`,
        [
          attemptId,
          q.userId || null,
          q.sessionId || null,
          q.participantId || null,
          q.participantName || null,
          q.materialId,
          q.score !== null && q.score !== undefined ? q.score : null,
          q.passed ? 1 : 0,
          q.passingGrade || 70,
          q.totalQuestions || null,
          q.correctAnswers || null,
          q.answers ? JSON.stringify(q.answers) : null,
          q.completed ? 1 : 0,
          toMySqlDatetime(q.startedAt),
          toMySqlDatetime(q.submittedAt || q.completedAt),
        ]
      );
    }

    // 5. certificates
    for (const c of records.certificates) {
      await conn.query(
        `INSERT INTO certificates (
           certificate_id, certificate_number, user_id, participant_id, session_id,
           recipient_name, institution, material_id, material_title, score,
           completion_type, session_name, trainer_name, trainer_position,
           trainer_unit, polda_id, polres_id, polda, polres, completed_at,
           issued_at, issued_at_iso, is_valid
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           certificate_number = VALUES(certificate_number),
           user_id = VALUES(user_id),
           participant_id = VALUES(participant_id),
           session_id = VALUES(session_id),
           recipient_name = VALUES(recipient_name),
           institution = VALUES(institution),
           material_id = VALUES(material_id),
           material_title = VALUES(material_title),
           score = VALUES(score),
           completion_type = VALUES(completion_type),
           session_name = VALUES(session_name),
           trainer_name = VALUES(trainer_name),
           trainer_position = VALUES(trainer_position),
           trainer_unit = VALUES(trainer_unit),
           polda_id = VALUES(polda_id),
           polres_id = VALUES(polres_id),
           polda = VALUES(polda),
           polres = VALUES(polres),
           completed_at = VALUES(completed_at),
           issued_at = VALUES(issued_at),
           issued_at_iso = VALUES(issued_at_iso),
           is_valid = VALUES(is_valid)`,
        [
          c.certificateId,
          c.certificateNumber,
          c.userId || null,
          c.participantId || null,
          c.sessionId || null,
          c.recipientName,
          c.institution || null,
          c.materialId,
          c.materialTitle || null,
          c.score !== undefined ? c.score : null,
          c.completionType || 'material',
          c.sessionName || null,
          c.trainerName || null,
          c.trainerPosition || null,
          c.trainerUnit || null,
          c.poldaId || null,
          c.polresId || null,
          c.polda || null,
          c.polres || null,
          c.completedAt || null,
          c.issuedAt || null,
          toMySqlDatetime(c.issuedAtIso),
          c.isValid ? 1 : 0,
        ]
      );
    }

    // 6. audit_logs
    if (records.auditLogs && records.auditLogs.length > 0) {
      for (const a of records.auditLogs) {
        if (a.id) {
          await conn.query(
            `INSERT INTO audit_logs (id, actor_id, actor_name, action, target, created_at)
             VALUES (?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE action = VALUES(action)`,
            [a.id, a.actorId || null, a.actorName || null, a.action, a.target || null, toMySqlDatetime(a.createdAt)]
          );
        } else {
          await conn.query(
            `INSERT INTO audit_logs (actor_id, actor_name, action, target, created_at)
             VALUES (?, ?, ?, ?, ?)`,
            [a.actorId || null, a.actorName || null, a.action, a.target || null, toMySqlDatetime(a.createdAt)]
          );
        }
      }
    }

    // 7. notifications
    if (records.notifications && records.notifications.length > 0) {
      for (const n of records.notifications) {
        if (n.id) {
          await conn.query(
            `INSERT INTO notifications (id, user_id, title, message, is_read, created_at)
             VALUES (?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE is_read = VALUES(is_read)`,
            [n.id, n.userId || null, n.title || null, n.message || null, n.isRead ? 1 : 0, toMySqlDatetime(n.createdAt)]
          );
        } else {
          await conn.query(
            `INSERT INTO notifications (user_id, title, message, is_read, created_at)
             VALUES (?, ?, ?, ?, ?)`,
            [n.userId || null, n.title || null, n.message || null, n.isRead ? 1 : 0, toMySqlDatetime(n.createdAt)]
          );
        }
      }
    }

    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

// -----------------------------------------------------------------------------
// AI Chat Queries (Gemini Assistant)
// -----------------------------------------------------------------------------

export interface AiChatSessionRow {
  id: string;
  userId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface AiChatMessageRow {
  id: string;
  sessionId: string;
  userId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: string;
}

export async function getAiChatSessions(userId: string): Promise<AiChatSessionRow[]> {
  const p = getPool();
  const [rows]: any = await p.query(
    'SELECT id, user_id, title, created_at, updated_at FROM ai_chat_sessions WHERE user_id = ? ORDER BY updated_at DESC',
    [userId]
  );
  return rows.map((r: any) => ({
    id: r.id,
    userId: r.user_id,
    title: r.title,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
}

export async function getAiChatSessionById(sessionId: string, userId: string): Promise<AiChatSessionRow | null> {
  const p = getPool();
  const [rows]: any = await p.query(
    'SELECT id, user_id, title, created_at, updated_at FROM ai_chat_sessions WHERE id = ? AND user_id = ? LIMIT 1',
    [sessionId, userId]
  );
  if (!rows || rows.length === 0) return null;
  const r = rows[0];
  return {
    id: r.id,
    userId: r.user_id,
    title: r.title,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export async function createAiChatSession(id: string, userId: string, title: string): Promise<AiChatSessionRow> {
  const p = getPool();
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
  await p.query(
    'INSERT INTO ai_chat_sessions (id, user_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
    [id, userId, title, now, now]
  );
  return { id, userId, title, createdAt: now, updatedAt: now };
}

export async function updateAiChatSessionTitle(sessionId: string, userId: string, title: string): Promise<void> {
  const p = getPool();
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
  await p.query(
    'UPDATE ai_chat_sessions SET title = ?, updated_at = ? WHERE id = ? AND user_id = ?',
    [title, now, sessionId, userId]
  );
}

export async function touchAiChatSession(sessionId: string, userId: string): Promise<void> {
  const p = getPool();
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
  await p.query(
    'UPDATE ai_chat_sessions SET updated_at = ? WHERE id = ? AND user_id = ?',
    [now, sessionId, userId]
  );
}

export async function deleteAiChatSession(sessionId: string, userId: string): Promise<void> {
  const p = getPool();
  await p.query('DELETE FROM ai_chat_messages WHERE session_id = ? AND user_id = ?', [sessionId, userId]);
  await p.query('DELETE FROM ai_chat_sessions WHERE id = ? AND user_id = ?', [sessionId, userId]);
}

export async function getAiChatMessages(sessionId: string, userId: string): Promise<AiChatMessageRow[]> {
  const p = getPool();
  const [rows]: any = await p.query(
    'SELECT id, session_id, user_id, role, content, created_at FROM ai_chat_messages WHERE session_id = ? AND user_id = ? ORDER BY created_at ASC',
    [sessionId, userId]
  );
  return rows.map((r: any) => ({
    id: r.id,
    sessionId: r.session_id,
    userId: r.user_id,
    role: r.role,
    content: r.content,
    createdAt: r.created_at,
  }));
}

export async function saveAiChatMessage(
  id: string,
  sessionId: string,
  userId: string,
  role: 'user' | 'assistant' | 'system',
  content: string
): Promise<AiChatMessageRow> {
  const p = getPool();
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
  await p.query(
    'INSERT INTO ai_chat_messages (id, session_id, user_id, role, content, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    [id, sessionId, userId, role, content, now]
  );
  await touchAiChatSession(sessionId, userId);
  return { id, sessionId, userId, role, content, createdAt: now };
}
