-- =============================================================================
--  SM-LEARNING DIKMAS POLRI — SKEMA BASIS DATA MySQL / MariaDB
-- =============================================================================
--  Target   : MySQL 5.7+ / MariaDB 10.4+ (XAMPP, phpMyAdmin)
--  Charset  : utf8mb4 — nama pejabat dan satuan memakai karakter non-ASCII
--
--  Cara pakai (phpMyAdmin: Import; atau CLI):
--    mysql -u root < schema.sql
--    npm run db:migrate      -- isi data master wilayah + akun + data awal
--
--  Kolom bertipe JSON dipakai HANYA untuk struktur bersarang yang selalu
--  dibaca utuh bersama induknya (silabus modul, butir soal, jawaban kuis,
--  detail event). Semua field yang dipakai untuk memfilter — wilayah, status,
--  tanggal, peran — berupa kolom biasa agar bisa di-index dan di-query.
-- =============================================================================

CREATE DATABASE IF NOT EXISTS `sm_learning`
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `sm_learning`;

SET FOREIGN_KEY_CHECKS = 0;

-- =============================================================================
--  1. MASTER WILAYAH & ORGANISASI KEDINASAN
-- =============================================================================

DROP TABLE IF EXISTS `master_instansi`;
CREATE TABLE `master_instansi` (
  `id`   VARCHAR(50)  NOT NULL,
  `nama` VARCHAR(255) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `master_organisasi`;
CREATE TABLE `master_organisasi` (
  `id`   VARCHAR(50)  NOT NULL,
  `nama` VARCHAR(255) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `master_sub_org`;
CREATE TABLE `master_sub_org` (
  `id`   VARCHAR(50)  NOT NULL,
  `nama` VARCHAR(255) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `master_satker`;
CREATE TABLE `master_satker` (
  `id`   VARCHAR(50)  NOT NULL,
  `nama` VARCHAR(255) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `polda`;
CREATE TABLE `polda` (
  `polda_id`   VARCHAR(2)   NOT NULL COMMENT 'Kode Polda 2 digit, mis. 12',
  `nama`       VARCHAR(150) NOT NULL COMMENT 'Nama resmi, mis. POLDA METRO JAYA',
  `is_wilayah` TINYINT(1)   NOT NULL DEFAULT 1
               COMMENT '1 = Polda kewilayahan (34 Polda). 0 = satuan pusat (PJR, Pusdiklantas) yang tidak dipakai sebagai lingkup eksekutif',
  PRIMARY KEY (`polda_id`),
  KEY `idx_polda_wilayah` (`is_wilayah`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- polres_id berulang antar Polda, jadi kunci utamanya gabungan keduanya.
DROP TABLE IF EXISTS `polres`;
CREATE TABLE `polres` (
  `polda_id`  VARCHAR(2)   NOT NULL,
  `polres_id` VARCHAR(3)   NOT NULL COMMENT 'Kode Polres, unik hanya di dalam satu Polda',
  `nama`      VARCHAR(150) NOT NULL,
  PRIMARY KEY (`polda_id`, `polres_id`),
  KEY `idx_polres_nama` (`nama`),
  CONSTRAINT `fk_polres_polda` FOREIGN KEY (`polda_id`)
    REFERENCES `polda` (`polda_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
--  2. PERAN & AKUN PENGGUNA
-- =============================================================================

DROP TABLE IF EXISTS `roles`;
CREATE TABLE `roles` (
  `id`          VARCHAR(50)  NOT NULL COMMENT 'mis. role-admin, role-trainer, role-executive',
  `name`        VARCHAR(100) NOT NULL,
  `description` TEXT         NULL,
  `permissions` JSON         NOT NULL COMMENT 'Array [{menuId, menuLabel, actions[]}] — matriks RBAC per menu',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Lingkup eksekutif ditentukan oleh executive_level + polda_id/polres_id.
--   nasional : melihat seluruh Indonesia (Kapolri / Kakorlantas)
--   polda    : hanya kegiatan di polda_id miliknya (Kapolda)
--   polres   : hanya kegiatan di polres_id miliknya (Kapolres)
-- Trainer memakai polda_id/polres_id yang sama sebagai penanda wilayah tugas.
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id`              VARCHAR(50)  NOT NULL,
  `username`        VARCHAR(100) NOT NULL,
  `password`        VARCHAR(255) NOT NULL,
  `full_name`       VARCHAR(200) NOT NULL,
  `role_id`         VARCHAR(50)  NOT NULL,
  `is_active`       TINYINT(1)   NOT NULL DEFAULT 1,
  `phone`           VARCHAR(50)  NULL,
  `email`           VARCHAR(150) NULL,
  `photo_url`       LONGTEXT     NULL,
  `nip`             VARCHAR(100) NULL COMMENT 'NRP/NIP personel',
  `instansi`        VARCHAR(200) NULL,
  `organisasi`      VARCHAR(200) NULL,
  `sub_org`         VARCHAR(200) NULL,
  `satker`          VARCHAR(200) NULL,
  `position`        VARCHAR(150) NULL COMMENT 'Jabatan / Pangkat',
  `unit`            VARCHAR(150) NULL COMMENT 'Satuan kerja / Unit',
  `executive_level` ENUM('nasional','polda','polres') NULL
                    COMMENT 'Hanya untuk role-executive. NULL untuk peran lain',
  `polda_id`        VARCHAR(2)   NULL COMMENT 'Wajib bila executive_level = polda/polres',
  `polres_id`       VARCHAR(3)   NULL COMMENT 'Wajib bila executive_level = polres',
  `polda`           VARCHAR(150) NULL COMMENT 'Nama Polda untuk tampilan',
  `polres`          VARCHAR(150) NULL COMMENT 'Nama Polres untuk tampilan',
  `created_at`      DATE         NOT NULL DEFAULT '2026-01-01',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_users_username` (`username`),
  KEY `idx_users_role` (`role_id`),
  KEY `idx_users_scope` (`executive_level`, `polda_id`, `polres_id`),
  CONSTRAINT `fk_users_role` FOREIGN KEY (`role_id`)
    REFERENCES `roles` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
--  3. MATERI PEMBELAJARAN
-- =============================================================================

DROP TABLE IF EXISTS `materials`;
CREATE TABLE `materials` (
  `id`                        VARCHAR(60)  NOT NULL,
  `title`                     VARCHAR(300) NOT NULL,
  `level`                     VARCHAR(20)  NOT NULL COMMENT 'TK/PAUD, SD, SMP, SMA',
  `type`                      VARCHAR(30)  NOT NULL COMMENT 'video, modul, infografis, kuis',
  `type_label`                VARCHAR(60)  NULL,
  `description`               TEXT         NULL,
  `publish_status`            VARCHAR(20)  NOT NULL DEFAULT 'published',
  `public_access`             VARCHAR(20)  NOT NULL DEFAULT 'allowed'
                              COMMENT 'allowed = tampil di portal /umum; restricted = khusus internal',
  `views`                     INT UNSIGNED NOT NULL DEFAULT 0
                              COMMENT 'Diturunkan dari learning_events; jangan diubah manual',
  `downloads`                 INT UNSIGNED NOT NULL DEFAULT 0,
  `author`                    VARCHAR(200) NULL,
  `publish_date`              VARCHAR(60)  NULL,
  `estimated_hours`           DECIMAL(5,2) NULL,
  `certification_available`   TINYINT(1)   NOT NULL DEFAULT 0,
  `modules`                   JSON         NULL COMMENT 'Silabus: [{id,title,lessons[]}]',
  `quiz`                      JSON         NULL COMMENT 'Bank soal: [{id,question,options[],correctIndex,explanation}]',
  `presentation`              JSON         NULL COMMENT 'Konten mode presentasi bila ada',
  `extra`                     JSON         NULL COMMENT 'Field tampilan lain (imageUrl, badgeTag, summary, keyPoints, dll)',
  PRIMARY KEY (`id`),
  KEY `idx_materials_level` (`level`),
  KEY `idx_materials_visibility` (`publish_status`, `public_access`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
--  4. CATATAN BELAJAR PER PENGGUNA
-- =============================================================================

-- Satu baris per (pengguna, materi): progres milik orang, bukan milik materi.
DROP TABLE IF EXISTS `user_progress`;
CREATE TABLE `user_progress` (
  `user_id`              VARCHAR(50)  NOT NULL,
  `material_id`          VARCHAR(60)  NOT NULL,
  `progress_percent`     TINYINT UNSIGNED NOT NULL DEFAULT 0,
  `status`               VARCHAR(20)  NOT NULL DEFAULT 'not_started',
  `completed_lesson_ids` JSON         NULL,
  `last_accessed_at`     DATETIME     NULL,
  PRIMARY KEY (`user_id`, `material_id`),
  KEY `idx_progress_material` (`material_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `user_bookmarks`;
CREATE TABLE `user_bookmarks` (
  `user_id`     VARCHAR(50) NOT NULL,
  `material_id` VARCHAR(60) NOT NULL,
  `created_at`  DATETIME    NULL,
  PRIMARY KEY (`user_id`, `material_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `user_history`;
CREATE TABLE `user_history` (
  `id`          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`     VARCHAR(50) NOT NULL,
  `material_id` VARCHAR(60) NOT NULL,
  `accessed_at` DATETIME    NULL,
  PRIMARY KEY (`id`),
  KEY `idx_history_user` (`user_id`, `accessed_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Percobaan kuis datang dari dua arah: personel yang login (user_id terisi)
-- dan peserta sosialisasi lapangan (participant_id + session_id terisi).
DROP TABLE IF EXISTS `quiz_attempts`;
CREATE TABLE `quiz_attempts` (
  `attempt_id`       VARCHAR(80)  NOT NULL,
  `user_id`          VARCHAR(50)  NULL,
  `session_id`       VARCHAR(60)  NULL,
  `participant_id`   VARCHAR(80)  NULL,
  `participant_name` VARCHAR(200) NULL,
  `material_id`      VARCHAR(60)  NOT NULL,
  `score`            TINYINT UNSIGNED NULL,
  `passed`           TINYINT(1)   NOT NULL DEFAULT 0,
  `passing_grade`    TINYINT UNSIGNED NOT NULL DEFAULT 70,
  `total_questions`  SMALLINT UNSIGNED NULL,
  `correct_answers`  SMALLINT UNSIGNED NULL,
  `answers`          JSON         NULL,
  `completed`        TINYINT(1)   NOT NULL DEFAULT 0,
  `started_at`       DATETIME     NULL,
  `submitted_at`     DATETIME     NULL,
  PRIMARY KEY (`attempt_id`),
  KEY `idx_attempt_session` (`session_id`),
  KEY `idx_attempt_user` (`user_id`),
  KEY `idx_attempt_material` (`material_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Wilayah disalin ke sini saat sertifikat terbit supaya rekap kewilayahan tetap
-- benar meski trainer dimutasi setelahnya.
DROP TABLE IF EXISTS `certificates`;
CREATE TABLE `certificates` (
  `certificate_id`     VARCHAR(80)  NOT NULL,
  `certificate_number` VARCHAR(80)  NOT NULL,
  `user_id`            VARCHAR(50)  NULL,
  `participant_id`     VARCHAR(80)  NULL,
  `session_id`         VARCHAR(60)  NULL,
  `recipient_name`     VARCHAR(200) NOT NULL,
  `institution`        VARCHAR(200) NULL,
  `material_id`        VARCHAR(60)  NOT NULL,
  `material_title`     VARCHAR(300) NULL,
  `score`              TINYINT UNSIGNED NULL,
  `completion_type`    VARCHAR(30)  NOT NULL DEFAULT 'material',
  `session_name`       VARCHAR(300) NULL,
  `trainer_name`       VARCHAR(200) NULL,
  `trainer_position`   VARCHAR(150) NULL,
  `trainer_unit`       VARCHAR(150) NULL,
  `polda_id`           VARCHAR(2)   NULL,
  `polres_id`          VARCHAR(3)   NULL,
  `polda`              VARCHAR(150) NULL,
  `polres`             VARCHAR(150) NULL,
  `completed_at`       VARCHAR(60)  NULL COMMENT 'Tanggal tampilan berbahasa Indonesia',
  `issued_at`          VARCHAR(60)  NULL,
  `issued_at_iso`      DATETIME     NULL,
  `is_valid`           TINYINT(1)   NOT NULL DEFAULT 1,
  PRIMARY KEY (`certificate_id`),
  UNIQUE KEY `uq_cert_number` (`certificate_number`),
  KEY `idx_cert_session` (`session_id`),
  KEY `idx_cert_user` (`user_id`),
  KEY `idx_cert_wilayah` (`polda_id`, `polres_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `audit_logs`;
CREATE TABLE `audit_logs` (
  `id`         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `actor_id`   VARCHAR(50)  NULL,
  `actor_name` VARCHAR(200) NULL,
  `action`     VARCHAR(150) NOT NULL,
  `target`     VARCHAR(300) NULL,
  `created_at` DATETIME     NULL,
  PRIMARY KEY (`id`),
  KEY `idx_audit_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `notifications`;
CREATE TABLE `notifications` (
  `id`         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`    VARCHAR(50)  NULL,
  `title`      VARCHAR(200) NULL,
  `message`    TEXT         NULL,
  `is_read`    TINYINT(1)   NOT NULL DEFAULT 0,
  `created_at` DATETIME     NULL,
  PRIMARY KEY (`id`),
  KEY `idx_notif_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
--  5. KEGIATAN SOSIALISASI LAPANGAN
-- =============================================================================

-- polda_id/polres_id diisi dari wilayah trainer saat sesi dibuka. Kolom inilah
-- yang membatasi apa yang boleh dilihat seorang eksekutif Polda atau Polres —
-- nama wilayah versi teks hanya untuk ditampilkan.
DROP TABLE IF EXISTS `outreach_sessions`;
CREATE TABLE `outreach_sessions` (
  `id`                  VARCHAR(60)  NOT NULL,
  `material_id`         VARCHAR(60)  NOT NULL,
  `material_title`      VARCHAR(300) NULL,
  `trainer_id`          VARCHAR(50)  NOT NULL,
  `trainer_name`        VARCHAR(200) NULL,
  `trainer_position`    VARCHAR(150) NULL,
  `trainer_unit`        VARCHAR(150) NULL,
  `trainer_competency`  JSON         NULL COMMENT 'Bukti trainer sudah lulus materi ini',
  `activity_name`       VARCHAR(300) NULL,
  `polda_id`            VARCHAR(2)   NULL,
  `polres_id`           VARCHAR(3)   NULL,
  `polda`               VARCHAR(150) NULL,
  `polres`              VARCHAR(150) NULL,
  `location`            VARCHAR(300) NULL,
  `date`                DATE         NULL,
  `start_time`          VARCHAR(30)  NULL,
  `status`              VARCHAR(20)  NOT NULL DEFAULT 'active',
  `public_access_code`  VARCHAR(30)  NOT NULL,
  `public_access_url`   VARCHAR(200) NULL,
  `target_participants` SMALLINT UNSIGNED NULL,
  `description`         TEXT         NULL,
  `created_at`          DATETIME     NULL,
  `closed_at`           DATETIME     NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_session_code` (`public_access_code`),
  KEY `idx_session_trainer` (`trainer_id`),
  KEY `idx_session_wilayah` (`polda_id`, `polres_id`),
  KEY `idx_session_status_date` (`status`, `date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `session_participants`;
CREATE TABLE `session_participants` (
  `id`         VARCHAR(80)  NOT NULL,
  `session_id` VARCHAR(60)  NOT NULL,
  `name`       VARCHAR(200) NOT NULL,
  `place`      VARCHAR(200) NULL COMMENT 'Asal sekolah / instansi',
  `joined_at`  DATETIME     NULL,
  PRIMARY KEY (`id`),
  KEY `idx_participant_session` (`session_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `outreach_reports`;
CREATE TABLE `outreach_reports` (
  `id`                  VARCHAR(60)  NOT NULL,
  `session_id`          VARCHAR(60)  NOT NULL,
  `material_id`         VARCHAR(60)  NULL,
  `material_title`      VARCHAR(300) NULL,
  `trainer_id`          VARCHAR(50)  NULL,
  `trainer_name`        VARCHAR(200) NULL,
  `activity_name`       VARCHAR(300) NULL,
  `polda_id`            VARCHAR(2)   NULL,
  `polres_id`           VARCHAR(3)   NULL,
  `polda`               VARCHAR(150) NULL,
  `polres`              VARCHAR(150) NULL,
  `location`            VARCHAR(300) NULL,
  `date`                DATE         NULL,
  `start_time`          VARCHAR(30)  NULL,
  `closed_at`           DATETIME     NULL,
  `total_participants`  SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  `total_views`         INT UNSIGNED NOT NULL DEFAULT 0,
  `total_quiz_attempts` SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  `total_quiz_completed` SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  `average_score`       DECIMAL(5,2) NOT NULL DEFAULT 0,
  `passing_rate`        DECIMAL(5,2) NOT NULL DEFAULT 0,
  `notes`               TEXT         NULL,
  `evidence_images`     JSON         NULL COMMENT 'Foto dokumentasi (data URI / path)',
  `created_at`          DATETIME     NULL,
  `extra`               JSON         NULL COMMENT 'Field tambahan agar data lama tidak hilang saat skema berkembang',
  PRIMARY KEY (`id`),
  KEY `idx_report_session` (`session_id`),
  KEY `idx_report_wilayah` (`polda_id`, `polres_id`),
  KEY `idx_report_date` (`date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Sumber tunggal angka kunjungan. session_id NULL berarti lalu lintas portal
-- publik /umum; terisi berarti bagian dari sesi sosialisasi seorang trainer.
DROP TABLE IF EXISTS `learning_events`;
CREATE TABLE `learning_events` (
  `id`             VARCHAR(80)  NOT NULL,
  `user_id`        VARCHAR(50)  NULL,
  `session_id`     VARCHAR(60)  NULL,
  `participant_id` VARCHAR(80)  NULL,
  `material_id`    VARCHAR(60)  NULL,
  `event_type`     VARCHAR(40)  NOT NULL
                   COMMENT 'material_view, lesson_view, join_session, quiz_start, quiz_completed, material_completed',
  `details`        JSON         NULL,
  `timestamp`      DATETIME     NULL,
  PRIMARY KEY (`id`),
  KEY `idx_event_session` (`session_id`),
  KEY `idx_event_material_type` (`material_id`, `event_type`),
  KEY `idx_event_time` (`timestamp`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
--  6. RIWAYAT & SESI AI CHAT (GEMINI INTEGRATION)
-- =============================================================================

CREATE TABLE IF NOT EXISTS `ai_chat_sessions` (
  `id`         VARCHAR(80)  NOT NULL,
  `user_id`    VARCHAR(50)  NOT NULL,
  `title`      VARCHAR(255) NOT NULL,
  `created_at` DATETIME     NOT NULL,
  `updated_at` DATETIME     NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_chat_user` (`user_id`),
  KEY `idx_chat_updated` (`updated_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `ai_chat_messages` (
  `id`         VARCHAR(80)  NOT NULL,
  `session_id` VARCHAR(80)  NOT NULL,
  `user_id`    VARCHAR(50)  NOT NULL,
  `role`       ENUM('user', 'assistant', 'system') NOT NULL,
  `content`    LONGTEXT     NOT NULL,
  `created_at` DATETIME     NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_chat_session` (`session_id`),
  KEY `idx_chat_msg_user` (`user_id`),
  KEY `idx_chat_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
