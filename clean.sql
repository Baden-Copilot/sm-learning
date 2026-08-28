-- =============================================================================
--  SM-LEARNING DIKMAS POLRI — BERSIHKAN DATA TRANSAKSI & RIWAYAT
-- =============================================================================
--  Menghapus semua data aktivitas/transaksi.
--  TETAP DIPERTAHANKAN:
--    - users & roles (akun login & hak akses)
--    - polda & polres (master data wilayah)
--    - materials (modul, materi, silabus, kuis materi)
-- =============================================================================

USE `sm_learning`;

SET FOREIGN_KEY_CHECKS = 0;

TRUNCATE TABLE `outreach_sessions`;
TRUNCATE TABLE `outreach_reports`;
TRUNCATE TABLE `session_participants`;
TRUNCATE TABLE `learning_events`;
TRUNCATE TABLE `user_progress`;
TRUNCATE TABLE `user_bookmarks`;
TRUNCATE TABLE `user_history`;
TRUNCATE TABLE `quiz_attempts`;
TRUNCATE TABLE `certificates`;
TRUNCATE TABLE `audit_logs`;
TRUNCATE TABLE `notifications`;

-- Reset counter views & downloads di tabel materi ke 0
UPDATE `materials` SET `views` = 0, `downloads` = 0;

SET FOREIGN_KEY_CHECKS = 1;
