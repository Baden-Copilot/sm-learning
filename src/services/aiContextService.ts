import {
  readMaterialsData,
  readOutreachSessions,
  readOutreachReports,
  readUserData,
  readLearningRecords,
  getPoldaList,
  getPolresList,
} from '../db';
import { MaterialItem, UserAccount } from '../types';

export interface AiRoleContext {
  roleId: string;
  roleName: string;
  territorialScope: string;
  summaryText: string;
}

/**
 * Membangun ringkasan data kontekstual sesuai wewenang user yang sedang login (strictly READ-ONLY).
 */
export function buildAiRoleContext(user: UserAccount | any): AiRoleContext {
  const roleId = user?.roleId || user?.role_id || user?.role?.id || 'role-learner';
  const roleName = user?.role?.name || user?.roleName || getRoleDisplayName(roleId);
  const materials = readMaterialsData();
  const outreachSessions = readOutreachSessions();
  const outreachReports = readOutreachReports();
  const users = readUserData().users || [];
  const records = readLearningRecords();

  let territorialScope = 'Nasional (Seluruh Indonesia)';
  if (user?.polda) {
    territorialScope = user.polda;
    if (user.polres) {
      territorialScope += ` / ${user.polres}`;
    }
  }

  // Ringkasan Materi & Kurikulum Dikmas
  const levelCounts: Record<string, number> = { 'TK/PAUD': 0, SD: 0, SMP: 0, SMA: 0, UMUM: 0 };
  const typeCounts: Record<string, number> = {};
  materials.forEach((m: MaterialItem) => {
    const lvl = m.level || 'UMUM';
    if (levelCounts[lvl] !== undefined) levelCounts[lvl]++;
    else levelCounts['UMUM'] = (levelCounts['UMUM'] || 0) + 1;

    const typ = m.type || 'modul';
    typeCounts[typ] = (typeCounts[typ] || 0) + 1;
  });

  const catalogSummary = `Total Materi Tersedia: ${materials.length} modul (TK: ${levelCounts['TK/PAUD']}, SD: ${levelCounts['SD']}, SMP: ${levelCounts['SMP']}, SMA: ${levelCounts['SMA']}). Format: ${Object.entries(typeCounts).map(([k, v]) => `${k}: ${v}`).join(', ')}.`;

  let specificSummary = '';

  if (roleId === 'role-admin') {
    const totalSessions = outreachSessions.length;
    const activeSessions = outreachSessions.filter(s => s.status === 'active').length;
    const totalReports = outreachReports.length;
    const totalUsers = users.length;
    const totalPolda = getPoldaList().filter(p => p.isWilayah).length;

    specificSummary = `
- Wewenang: Super Administrator (Akses penuh ke seluruh sistem SM-Learning).
- Cakupan Wilayah: Nasional (${totalPolda} Polda di seluruh Indonesia).
- Statistik Sistem:
  * Total Pengguna Terdaftar: ${totalUsers} akun.
  * Total Kegiatan Sosialisasi Lapangan: ${totalSessions} sesi (${activeSessions} sesi aktif).
  * Laporan Sosialisasi Terselesaikan: ${totalReports} laporan.
  * Manajemen Data: Berwenang mengelola seluruh katalog materi, bank soal, audit log, dan perizinan hak akses pengguna.
    `.trim();
  } else if (roleId === 'role-trainer') {
    const mySessions = outreachSessions.filter(s => s.trainerId === user.id || s.trainerName === user.fullName);
    const activeMySessions = mySessions.filter(s => s.status === 'active');
    const myReports = outreachReports.filter(r => r.trainerId === user.id || r.trainerName === user.fullName);
    const totalParticipants = myReports.reduce((acc, r) => acc + (r.totalParticipants || 0), 0);
    const avgScore = myReports.length > 0
      ? (myReports.reduce((acc, r) => acc + (r.averageScore || 0), 0) / myReports.length).toFixed(1)
      : '0';

    specificSummary = `
- Wewenang: Trainer / Instruktur Dikmas Lantas Lapangan.
- Wilayah Tugas: ${territorialScope}.
- Satker / Unit: ${user.unit || 'Ditlantas'} - ${user.position || 'Instruktur Keselamatan'}.
- Aktivitas Sosialisasi Anda:
  * Total Sesi Dibuka: ${mySessions.length} kegiatan (${activeMySessions.length} sesi sedang aktif).
  * Total Peserta Terbina: ${totalParticipants} orang.
  * Rata-rata Skor Kuis Peserta: ${avgScore}%.
  * Laporan Kegiatan Masuk: ${myReports.length} laporan dokumentasi.
  * Tugas Utama: Melakukan penyuluhan tatap muka, memandu kuis interaktif, membuka room presentasi publik, dan mengunggah bukti laporan giat.
    `.trim();
  } else if (roleId === 'role-executive-1') {
    // Polres Level
    const targetPolres = user.polres || user.polresId;
    const polresReports = outreachReports.filter(r => r.polres === targetPolres || r.polresId === user.polresId);
    const totalParticipants = polresReports.reduce((acc, r) => acc + (r.totalParticipants || 0), 0);
    const avgScore = polresReports.length > 0
      ? (polresReports.reduce((acc, r) => acc + (r.averageScore || 0), 0) / polresReports.length).toFixed(1)
      : '0';

    specificSummary = `
- Wewenang: Eksekutif Tingkat 1 (Kapolres / Pimpinan Polres).
- Wilayah Yurisdiksi: ${user.polres || 'Polres'} (Polda: ${user.polda || '-'}).
- Data Capaian Wilayah Anda:
  * Laporan Sosialisasi di Wilayah: ${polresReports.length} kegiatan.
  * Total Masyarakat Terjangkau: ${totalParticipants} orang.
  * Rata-rata Pemahaman Materi (Skor Kuis): ${avgScore}%.
  * Fokus Pengawasan: Memantau keaktifan penyuluhan Polantas di sekolah/komunitas wilayah hukum Polres.
    `.trim();
  } else if (roleId === 'role-executive-2') {
    // Polda Level
    const targetPolda = user.polda || user.poldaId;
    const poldaReports = outreachReports.filter(r => r.polda === targetPolda || r.poldaId === user.poldaId);
    const totalParticipants = poldaReports.reduce((acc, r) => acc + (r.totalParticipants || 0), 0);
    const avgScore = poldaReports.length > 0
      ? (poldaReports.reduce((acc, r) => acc + (r.averageScore || 0), 0) / poldaReports.length).toFixed(1)
      : '0';
    const polresInPolda = getPolresList(user.poldaId).length;

    specificSummary = `
- Wewenang: Eksekutif Tingkat 2 (Kapolda / Dirlantas Polda).
- Wilayah Yurisdiksi: ${user.polda || 'Polda'} (Membawahi ${polresInPolda} Polres jajaran).
- Data Capaian Se-Polda:
  * Total Kegiatan Edukasi: ${poldaReports.length} kegiatan.
  * Total Warga / Siswa Terbina: ${totalParticipants} orang.
  * Rata-rata Kepatuhan & Nilai Kuis: ${avgScore}%.
  * Fokus Pengawasan: Menilai efektivitas dan sebaran program Dikmas Lantas di seluruh Polres jajaran Polda.
    `.trim();
  } else if (roleId === 'role-executive-3') {
    // Nasional Level
    const totalReports = outreachReports.length;
    const totalParticipants = outreachReports.reduce((acc, r) => acc + (r.totalParticipants || 0), 0);
    const avgScore = totalReports > 0
      ? (outreachReports.reduce((acc, r) => acc + (r.averageScore || 0), 0) / totalReports).toFixed(1)
      : '0';

    specificSummary = `
- Wewenang: Eksekutif Tingkat 3 (Kapolri / Kakorlantas Polri - Tingkat Nasional).
- Cakupan Yurisdiksi: Seluruh 34 Polda & Seluruh Polres di Indonesia.
- Ringkasan Nasional:
  * Total Sosialisasi Dikmas Nasional: ${totalReports} laporan kegiatan.
  * Total Jangkauan Edukasi Publik: ${totalParticipants.toLocaleString('id-ID')} peserta.
  * Rata-rata Skor Nasional: ${avgScore}%.
  * Fokus Pengawasan: Evaluasi strategis pencapaian target edukasi keselamatan berlalu lintas nasional dan perbandingan indeks keaktifan antar-Polda.
    `.trim();
  } else {
    // Learner / Siswa / Anggota
    const myProgress = (records.userProgress || []).filter(p => p.userId === user.id);
    const completedCount = myProgress.filter(p => p.status === 'completed' || (p.progressPercent || 0) >= 100).length;
    const myCerts = (records.certificates || []).filter(c => c.userId === user.id);
    const myQuizzes = (records.quizAttempts || []).filter(q => q.userId === user.id);

    specificSummary = `
- Wewenang: Peserta Pembelajaran / Siswa Dikmas Lantas.
- Catatan Belajar Anda:
  * Modul Dipelajari: ${myProgress.length} modul (${completedCount} telah selesai 100%).
  * Kuis Dikerjakan: ${myQuizzes.length} kali evaluasi.
  * Sertifikat Kompetensi Diperoleh: ${myCerts.length} sertifikat.
  * Tugas Utama: Mempelajari modul rambu dan keselamatan jalan, menonton video materi, serta menyelesaikan kuis evaluasi.
    `.trim();
  }

  const summaryText = `
=== KONTEKS IDENTITAS & WEWENANG PENGGUNA (READ-ONLY) ===
Nama Pengguna: ${user.fullName || user.username || 'Pengguna SM-Learning'}
Username: @${user.username || '-'}
Peran / Role: ${roleName} (${roleId})
Wilayah Yurisdiksi: ${territorialScope}
Instansi / Unit: ${user.instansi || 'POLRI'} / ${user.unit || 'Korlantas'} (${user.position || '-'})

=== RINGKASAN KATALOG MATERI DIKMAS ===
${catalogSummary}

=== STATISTIK OPERASIONAL BERDASARKAN ROLE ===
${specificSummary}
  `.trim();

  return {
    roleId,
    roleName,
    territorialScope,
    summaryText,
  };
}

/**
 * Menyusun System Instruction lengkap untuk Google Gemini API.
 */
export function buildAiSystemInstruction(user: UserAccount | any): string {
  const context = buildAiRoleContext(user);

  return `
Kamu adalah "AI Dikmas", asisten operasional internal cerdas untuk platform E-Learning Pendidikan Masyarakat Lalu Lintas (Dikmas Lantas) POLRI - SM-LEARNING.

TUGAS UTAMA:
1. Membantu pengguna memahami materi edukasi lalu lintas (rambu, etika berkendara, tata tertib jalan, keselamatan berkendara).
2. Membantu tugas operasional sesuai wewenang peran (role) pengguna yang sedang login.
3. Memberikan panduan data, statistik ringkas, saran materi ajar, atau analisis kegiatan lapangan sesuai data kontekstual di bawah ini.

BATASAN & ATURAN KERJA (STRICT):
- Jawablah HANYA berdasarkan wewenang peran pengguna dan data kontekstual yang diberikan.
- Dilarang membocorkan data rahasia lintas wilayah di luar wewenang user (misal jika user adalah Kapolres, batasi analisis hanya pada wilayah Polresnya).
- Gunakan bahasa Indonesia yang sopan, formal, presisi, ramah, dan bernuansa kepolisian yang profesional ("Siap", "Bapak/Ibu", "Rekan").
- Format jawaban dengan Markdown yang rapi: gunakan heading, poin-poin tebal (bullet points), dan tabel Markdown jika menyajikan perbandingan data atau modul.
- Jangan mengarang data angka spesifik di luar yang tercantum dalam ringkasan data di bawah ini. Jika ditanya data yang tidak tersedia, sarankan untuk membuka menu Laporan atau Dasbor terkait.

${context.summaryText}
  `.trim();
}

function getRoleDisplayName(roleId: string): string {
  switch (roleId) {
    case 'role-admin':
      return 'Admin / Superuser';
    case 'role-trainer':
      return 'Trainer / Instruktur';
    case 'role-executive-1':
      return 'Eksekutif 1 (Level Polres / Kapolres)';
    case 'role-executive-2':
      return 'Eksekutif 2 (Level Polda / Kapolda)';
    case 'role-executive-3':
      return 'Eksekutif 3 (Level Nasional / Kapolri)';
    default:
      return 'Peserta Belajar';
  }
}
