/**
 * SM-LEARNING DIKMAS POLRI — DATABASE MIGRATION & SEEDING SCRIPT
 * =============================================================================
 * Jalankan:
 *   npx tsx scripts/migrate.ts
 *
 * Langkah-langkah:
 *   1. Buat database `sm_learning` bila belum ada
 *   2. Eksekusi file `schema.sql` untuk membuat semua tabel
 *   3. Parse CSV `data_polda` & `data_polres` → isi tabel `polda` dan `polres`
 *   4. Migrasi data lama dari `data/*.json`
 *   5. Generate akun sesuai spesifikasi:
 *      - 1 akun superuser (admin)
 *      - 1 akun Kapolri (eksekutif level nasional)
 *      - 34 akun Kapolda (eksekutif level polda, 1 per polda)
 *      - 34 akun Trainer (role-trainer per polda, 1 per polda)
 *      - 2 akun legacy (trainer1, executive) tetap dipertahankan
 *      Total: 72 akun aktif
 *   6. Update file `user-account.txt` dengan daftar lengkap
 */

import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const DB_CONFIG = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'sm_learning',
};

// -----------------------------------------------------------------------------
// Helper CSV Parser Sederhana
// -----------------------------------------------------------------------------

function parseCsv(content: string): string[][] {
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

// -----------------------------------------------------------------------------
// Main Migration
// -----------------------------------------------------------------------------

async function runMigration() {
  console.log('===> [1/6] Menghubungkan ke MySQL server...');
  const rootConn = await mysql.createConnection({
    host: DB_CONFIG.host,
    port: DB_CONFIG.port,
    user: DB_CONFIG.user,
    password: DB_CONFIG.password,
    multipleStatements: true,
  });

  console.log(`===> [2/6] Memastikan database "${DB_CONFIG.database}" ada...`);
  await rootConn.query(
    `CREATE DATABASE IF NOT EXISTS \`${DB_CONFIG.database}\`
     DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  );
  await rootConn.end();

  const conn = await mysql.createConnection({
    host: DB_CONFIG.host,
    port: DB_CONFIG.port,
    user: DB_CONFIG.user,
    password: DB_CONFIG.password,
    database: DB_CONFIG.database,
    multipleStatements: true,
    charset: 'utf8mb4',
  });

  console.log('===> [3/6] Menjalankan schema.sql...');
  const schemaSql = fs.readFileSync(path.join(ROOT_DIR, 'schema.sql'), 'utf-8');
  await conn.query(schemaSql);

  // ---------------------------------------------------------------------------
  // Seed Master Wilayah
  // ---------------------------------------------------------------------------
  console.log('===> [4/6] Seeding master wilayah dari data_polda & data_polres...');

  const poldaCsv = fs.readFileSync(path.join(ROOT_DIR, 'data_polda'), 'utf-8');
  const poldaRows = parseCsv(poldaCsv);
  // Header: rowid, polda_id, polda
  const poldaList: Array<{ id: string; nama: string; isWilayah: number }> = [];

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
  console.log(`     Tersimpan ${poldaList.length} baris Provinsi (${poldaList.filter(p => p.isWilayah === 1).length} kewilayahan).`);

  const polresCsv = fs.readFileSync(path.join(ROOT_DIR, 'data_polres'), 'utf-8');
  const polresRows = parseCsv(polresCsv);
  // Header: rowid, polres_id, polda_id, polres
  let polresCount = 0;
  let skippedCount = 0;

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

    // Lewati baris yatim polda_id '00' (umumnya berlabel DIHILANGKAN / DUPLIKAT)
    if (poldaId === '00') {
      skippedCount++;
      continue;
    }

    // Pastikan polda_id ada di tabel polda
    if (!poldaList.some(p => p.id === poldaId)) {
      skippedCount++;
      continue;
    }

    await conn.query(
      `INSERT INTO polres (polda_id, polres_id, nama) VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE nama = VALUES(nama)`,
      [poldaId, polresId, nama]
    );
    polresCount++;
  }
  console.log(`     Tersimpan ${polresCount} baris Kota/Kabupaten (${skippedCount} baris usang dilewati).`);

  // ---------------------------------------------------------------------------
  // Migrasi Data JSON Lama (Roles, Materials, Records, Outreach)
  // ---------------------------------------------------------------------------
  console.log('===> [5/6] Migrasi data dari file JSON...');

  // 1. Roles
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

  for (const r of DEFAULT_ROLES_PAYLOAD) {
    await conn.query(
      `INSERT INTO roles (id, name, description, permissions) VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description), permissions = VALUES(permissions)`,
      [r.id, r.name, r.description || null, JSON.stringify(r.permissions)]
    );
  }
  console.log(`     Tersimpan ${DEFAULT_ROLES_PAYLOAD.length} roles (termasuk 3 level eksekutif).`);

  // 2. Materials (Hapus materi lama, ganti dengan materi kurikulum resmi terbaru)
  await conn.query('DELETE FROM materials');
  const matPath = path.join(ROOT_DIR, 'data', 'materials.json');
  let oldMaterials: any[] = [];
  if (fs.existsSync(matPath)) {
    oldMaterials = JSON.parse(fs.readFileSync(matPath, 'utf-8'));
  }
  for (const m of oldMaterials) {
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
  console.log(`     Tersimpan ${oldMaterials.length} materi pembelajaran resmi.`);

  // 3. Learning Records (progress, bookmarks, history, quiz_attempts, certificates)
  const recPath = path.join(ROOT_DIR, 'data', 'learning-records.json');
  if (fs.existsSync(recPath)) {
    const rec = JSON.parse(fs.readFileSync(recPath, 'utf-8'));

    for (const pr of rec.userProgress || []) {
      await conn.query(
        `INSERT INTO user_progress (user_id, material_id, progress_percent, status, completed_lesson_ids, last_accessed_at)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE progress_percent = VALUES(progress_percent), status = VALUES(status)`,
        [
          pr.userId,
          pr.materialId,
          pr.progressPercent || 0,
          pr.status || 'not_started',
          JSON.stringify(pr.completedLessonIds || []),
          pr.lastAccessedAt || null,
        ]
      );
    }

    for (const b of rec.userBookmarks || []) {
      await conn.query(
        `INSERT INTO user_bookmarks (user_id, material_id, created_at) VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE created_at = VALUES(created_at)`,
        [b.userId, b.materialId, b.createdAt || null]
      );
    }

    for (const q of rec.quizAttempts || []) {
      const attemptId = q.attemptId || q.id;
      await conn.query(
        `INSERT INTO quiz_attempts (
           attempt_id, user_id, session_id, participant_id, participant_name,
           material_id, score, passed, passing_grade, total_questions,
           correct_answers, answers, completed, started_at, submitted_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE score = VALUES(score)`,
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
          q.startedAt || null,
          q.submittedAt || q.completedAt || null,
        ]
      );
    }

    for (const c of rec.certificates || []) {
      await conn.query(
        `INSERT INTO certificates (
           certificate_id, certificate_number, user_id, participant_id, session_id,
           recipient_name, institution, material_id, material_title, score,
           completion_type, session_name, trainer_name, trainer_position,
           trainer_unit, polda_id, polres_id, polda, polres, completed_at,
           issued_at, issued_at_iso, is_valid
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE certificate_number = VALUES(certificate_number)`,
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
          c.issuedAtIso || null,
          c.isValid ? 1 : 0,
        ]
      );
    }
  }

  // 4. Outreach Sessions
  const sessPath = path.join(ROOT_DIR, 'data', 'outreach-sessions.json');
  if (fs.existsSync(sessPath)) {
    const sessions = JSON.parse(fs.readFileSync(sessPath, 'utf-8'));
    for (const s of sessions) {
      // Cari polda_id yang cocok dengan string nama bila polda_id belum ada
      let pId = s.poldaId || null;
      let prId = s.polresId || null;
      if (!pId && s.polda) {
        const match = poldaList.find(p => p.nama.toLowerCase() === s.polda.toLowerCase());
        if (match) pId = match.id;
      }
      await conn.query(
        `INSERT INTO outreach_sessions (
           id, material_id, material_title, trainer_id, trainer_name,
           trainer_position, trainer_unit, trainer_competency, activity_name,
           polda_id, polres_id, polda, polres, location, date, start_time,
           status, public_access_code, public_access_url, target_participants,
           description, created_at, closed_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE activity_name = VALUES(activity_name)`,
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
          pId,
          prId,
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
          s.createdAt || null,
          s.closedAt || null,
        ]
      );
    }
  }

  // 5. Session Participants
  const partPath = path.join(ROOT_DIR, 'data', 'session-participants.json');
  if (fs.existsSync(partPath)) {
    const parts = JSON.parse(fs.readFileSync(partPath, 'utf-8'));
    for (const pt of parts) {
      await conn.query(
        `INSERT INTO session_participants (id, session_id, name, place, joined_at)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE name = VALUES(name)`,
        [pt.id, pt.sessionId, pt.name, pt.place || null, pt.joinedAt || null]
      );
    }
  }

  // 6. Learning Events
  const evtPath = path.join(ROOT_DIR, 'data', 'learning-events.json');
  if (fs.existsSync(evtPath)) {
    const evts = JSON.parse(fs.readFileSync(evtPath, 'utf-8'));
    for (const e of evts) {
      await conn.query(
        `INSERT INTO learning_events (
           id, user_id, session_id, participant_id, material_id, event_type, details, timestamp
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE event_type = VALUES(event_type)`,
        [
          e.id,
          e.userId || null,
          e.sessionId || null,
          e.participantId || null,
          e.materialId || null,
          e.eventType,
          e.details ? JSON.stringify(e.details) : null,
          e.timestamp || null,
        ]
      );
    }
  }

  // ---------------------------------------------------------------------------
  // Generate Akun (Kapolri, 34 Kapolda, 557 Kapolres, 34 Trainer, Superuser, Legacy)
  // ---------------------------------------------------------------------------
  console.log('===> [6/6] Men-generate akun pengguna (Nasional, Polda, Polres, Trainer)...');

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
    keterangan: 'Akses penuh ke seluruh menu dan data',
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
    keterangan: 'Eksekutif 3 (Nasional) — melihat rekapitulasi seluruh Indonesia (34 Polda)',
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
      keterangan: `Eksekutif 2 (Polda) — melihat data wilayah ${p.nama}`,
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
      keterangan: `Eksekutif 1 (Polres) — melihat data wilayah ${namaPolres}`,
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
      keterangan: `Trainer Lapangan — membuka sesi di wilayah ${p.nama}`,
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
    keterangan: 'Trainer default (Metro Jaya)',
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
    keterangan: 'Eksekutif default (Polda Metro Jaya)',
  });

  // Tulis semua ke tabel users (gunakan INSERT IGNORE agar akun manual tidak tertimpa)
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
  console.log(`     Tersimpan ${accountRows.length} akun pengguna ke tabel users.`);

  // ---------------------------------------------------------------------------
  // Generate user-account.txt Baru
  // ---------------------------------------------------------------------------
  const userAccountTxt = buildUserAccountDoc(accountRows, regionalPoldas);
  fs.writeFileSync(path.join(ROOT_DIR, 'user-account.txt'), userAccountTxt, 'utf-8');
  console.log('     File user-account.txt berhasil diperbarui.');

  await conn.end();
  console.log('===> Migrasi & Seeding Selesai dengan Sukses!');
}

function buildUserAccountDoc(accounts: any[], poldas: Array<{ id: string; nama: string }>): string {
  const line = '='.repeat(80);
  const subline = '-'.repeat(80);

  let out = '';
  out += `${line}\n`;
  out += `  DAFTAR AKUN PENGGUNA RESMI — SM-LEARNING DIKMAS POLRI\n`;
  out += `  Basis Data: MySQL / MariaDB (sm_learning)\n`;
  out += `  Diperbarui : ${new Date().toISOString().slice(0, 10)}\n`;
  out += `${line}\n\n`;

  out += `CATATAN KEAMANAN & LINGKUP AKSES:\n`;
  out += `1. Password bawaan seluruh akun adalah: 123456\n`;
  out += `2. Lingkup Akses Eksekutif (Dashboard):\n`;
  out += `   - Eksekutif 3 (Nasional / Kapolri) : Melihat rekapitulasi seluruh 34 Polda se-Indonesia.\n`;
  out += `   - Eksekutif 2 (Polda / Kapolda)    : Terkunci hanya dapat melihat data Polda masing-masing.\n`;
  out += `   - Eksekutif 1 (Polres / Kapolres)  : Terkunci hanya dapat melihat data Polres masing-masing.\n`;
  out += `3. Trainer : Terikat ke wilayah Polda penugasannya untuk membuka sesi & lapor kegiatan.\n\n`;

  out += `${line}\n`;
  out += `1. AKUN ADMINISTRATOR & EKSEKUTIF TINGKAT NASIONAL (EKSEKUTIF 3)\n`;
  out += `${line}\n`;
  out += `No | Username   | Password | Role              | Level    | Nama / Satuan Kerja\n`;
  out += `${subline}\n`;
  out += ` 1 | superuser  | 123456   | role-admin        | -        | AKBP Hendra Wijaya (Superuser / Admin)\n`;
  out += ` 2 | kapolri    | 123456   | role-executive-3  | nasional | Jenderal Polisi Drs. Listyo Sigit Prabowo (Kapolri)\n`;
  out += ` 3 | trainer1   | 123456   | role-trainer      | -        | Kompol Budi Santoso (Trainer Polda Metro Jaya)\n`;
  out += ` 4 | executive  | 123456   | role-executive-2  | polda    | Irjen Pol. Drs. Ahmad Fauzi (Kapolda Metro Jaya)\n\n`;

  out += `${line}\n`;
  out += `2. DAFTAR 34 AKUN KAPOLDA (EKSEKUTIF 2 / LEVEL POLDA)\n`;
  out += `   Format Login: username = kapolda_<nama_polda> (mis. kapolda_aceh, kapolda_metro_jaya)\n`;
  out += `${line}\n`;
  out += `No | Username                   | Password | Role             | Wilayah\n`;
  out += `${subline}\n`;

  const kapoldaAccounts = accounts.filter(a => a.roleId === 'role-executive-2' && a.username !== 'executive');
  let idx = 1;
  for (const a of kapoldaAccounts) {
    const num = String(idx).padStart(2, ' ');
    const uname = String(a.username).padEnd(26, ' ');
    out += `${num} | ${uname} | 123456   | role-executive-2 | ${a.polda}\n`;
    idx++;
  }
  out += `\n`;

  out += `${line}\n`;
  out += `3. DAFTAR AKUN KAPOLRES (EKSEKUTIF 1 / LEVEL POLRES)\n`;
  out += `   Format Login: username = kapolres_<nama_polres> (mis. kapolres_aceh_barat)\n`;
  out += `${line}\n`;
  out += `No  | Username                      | Password | Role             | Wilayah Polres (Polda)\n`;
  out += `${subline}\n`;

  const kapolresAccounts = accounts.filter(a => a.roleId === 'role-executive-1');
  idx = 1;
  for (const a of kapolresAccounts) {
    const num = String(idx).padStart(3, ' ');
    const uname = String(a.username).padEnd(29, ' ');
    out += `${num} | ${uname} | 123456   | role-executive-1 | ${a.polres} (${a.polda})\n`;
    idx++;
  }
  out += `\n`;

  out += `${line}\n`;
  out += `4. DAFTAR 34 AKUN TRAINER (INSTRUKTUR DIKMAS PER POLDA)\n`;
  out += `   Format Login: username = trainer_<nama_polda> (mis. trainer_aceh, trainer_metro_jaya)\n`;
  out += `${line}\n`;
  out += `No | Username                   | Password | Role         | Wilayah Penugasan\n`;
  out += `${subline}\n`;

  const trainerAccounts = accounts.filter(a => a.roleId === 'role-trainer' && a.username !== 'trainer1');
  idx = 1;
  for (const a of trainerAccounts) {
    const num = String(idx).padStart(2, ' ');
    const uname = String(a.username).padEnd(26, ' ');
    out += `${num} | ${uname} | 123456   | role-trainer | ${a.polda}\n`;
    idx++;
  }
  out += `\n`;

  out += `${line}\n`;
  out += `5. RINGKASAN JUMLAH AKUN\n`;
  out += `${line}\n`;
  out += `  - Superuser / Admin     : 1 akun\n`;
  out += `  - Eksekutif 3 (Nasional): 1 akun (kapolri)\n`;
  out += `  - Eksekutif 2 (Polda)   : ${kapoldaAccounts.length} akun + 1 legacy (executive)\n`;
  out += `  - Eksekutif 1 (Polres)  : ${kapolresAccounts.length} akun\n`;
  out += `  - Trainer Instruktur    : ${trainerAccounts.length} akun + 1 legacy (trainer1)\n`;
  out += `  - TOTAL                 : ${accounts.length} akun aktif terdaftar di MySQL\n`;
  out += `${line}\n`;

  return out;
}

runMigration().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
