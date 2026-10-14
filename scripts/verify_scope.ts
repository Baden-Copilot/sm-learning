const BASE_URL = process.env.TEST_URL || 'http://localhost:4003';

interface TestCaseResult {
  role: string;
  name: string;
  test: string;
  passed: boolean;
  details?: string;
}

const results: TestCaseResult[] = [];

function assert(condition: boolean, role: string, name: string, test: string, details?: string) {
  if (condition) {
    results.push({ role, name, test, passed: true, details });
    console.log(`  [PASS] [${role}] ${test}`);
  } else {
    results.push({ role, name, test, passed: false, details });
    console.error(`  [FAIL] [${role}] ${test} - ${details || ''}`);
  }
}

async function api(path: string, userId?: string, roleId?: string, method = 'GET', body?: any) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (userId) headers['x-user-id'] = userId;
  if (roleId) headers['x-role-id'] = roleId;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const contentType = res.headers.get('content-type') || '';
  let data: any = null;
  if (contentType.includes('application/json')) {
    data = await res.json();
  } else {
    data = await res.text();
  }

  return { status: res.status, ok: res.ok, data };
}

async function runVerification() {
  console.log('========================================================================');
  console.log('  STARTING VERIFIKASI CENTRALIZED SCOPE ENFORCEMENT');
  console.log('  Target URL:', BASE_URL);
  console.log('========================================================================\n');

  // Test Users
  const users = {
    admin: { id: 'user-1', roleId: 'role-admin', name: 'Super User / Admin' },
    eksekutif1: { id: 'user-kapolri', roleId: 'role-executive-1', name: 'Eksekutif 1 (Nasional)' },
    eksekutif2Metro: { id: 'user-3', roleId: 'role-executive-2', name: 'Eksekutif 2 (Metro Jaya)' },
    eksekutif2Aceh: { id: 'user-kapolda-01', roleId: 'role-executive-2', name: 'Eksekutif 2 (Aceh)' },
    eksekutif3Ditlantas: { id: 'user-kapolres-01-01', roleId: 'role-executive-3', name: 'Eksekutif 3 (Aceh Ditlantas)' },
    eksekutif3Lhokseumawe: { id: 'user-kapolres-01-02', roleId: 'role-executive-3', name: 'Eksekutif 3 (Aceh Lhokseumawe)' },
    trainerAceh: { id: 'user-trainer-01', roleId: 'role-trainer', name: 'Trainer (Aceh Ditlantas)' }
  };

  // 1. Buat Test Sessions via API Admin
  console.log('--- 1. MENYIAPKAN DATA TESTING MULTI-WILAYAH VIA HTTP API ---');
  const testSessions = [
    {
      id: 'TEST-SES-METRO-01',
      materialId: 'mat-sd-01',
      activityName: 'Edukasi Bekasi 1',
      trainerId: 'user-1788887829949',
      trainerName: 'Trainer Bekasi',
      polda: 'METRO JAYA',
      polres: 'BEKASI',
      location: 'SMPN 1 Bekasi',
      date: '2026-10-15',
      startTime: '08:00',
      publicAccessCode: 'TEST-BK01',
      targetParticipants: 40,
    },
    {
      id: 'TEST-SES-METRO-02',
      materialId: 'mat-smp-01',
      activityName: 'Edukasi Jakpus 2',
      trainerId: 'user-3',
      trainerName: 'Executive Metro',
      polda: 'METRO JAYA',
      polres: 'JAKARTA PUSAT',
      location: 'SMAN 1 Jakarta',
      date: '2026-10-16',
      startTime: '09:00',
      publicAccessCode: 'TEST-JP02',
      targetParticipants: 60,
    },
    {
      id: 'TEST-SES-ACEH-01',
      materialId: 'mat-sd-01',
      activityName: 'Penyuluhan Ditlantas Aceh',
      trainerId: 'user-trainer-01',
      trainerName: 'Trainer Aceh Ditlantas',
      polda: 'ACEH',
      polres: 'DITLANTAS',
      location: 'Ditlantas Aceh Hall',
      date: '2026-10-17',
      startTime: '10:00',
      publicAccessCode: 'TEST-AC01',
      targetParticipants: 50,
    },
    {
      id: 'TEST-SES-ACEH-02',
      materialId: 'mat-sma-01',
      activityName: 'Penyuluhan Polres Lhokseumawe',
      trainerId: 'user-trainer-01',
      trainerName: 'Trainer Aceh Ditlantas',
      polda: 'ACEH',
      polres: 'LHOKSEUMAWE',
      location: 'Polres Lhokseumawe',
      date: '2026-10-18',
      startTime: '10:00',
      publicAccessCode: 'TEST-AC02',
      targetParticipants: 35,
    },
    {
      id: 'TEST-SES-JABAR-01',
      materialId: 'mat-smp-01',
      activityName: 'Penyuluhan Bandung',
      trainerId: 'user-trainer-02',
      trainerName: 'Trainer Jabar',
      polda: 'JAWA BARAT',
      polres: 'BANDUNG',
      location: 'Gedung Sate Bandung',
      date: '2026-10-19',
      startTime: '10:00',
      publicAccessCode: 'TEST-JB01',
      targetParticipants: 70,
    }
  ];

  // Clean existing test sessions if any
  for (const s of testSessions) {
    await api(`/api/outreach/sessions/${s.id}`, users.admin.id, users.admin.roleId, 'DELETE');
  }

  // Create 5 test sessions
  for (const s of testSessions) {
    const res = await api('/api/outreach/sessions', users.admin.id, users.admin.roleId, 'POST', s);
    if (!res.ok) {
      console.error(`Gagal membuat sesi ${s.id}:`, res.data);
    }
  }
  console.log('5 Sesi testing berhasil dibuat melalui endpoint resmi.\n');

  // =========================================================================
  // 1. SUPER USER / ADMIN
  // =========================================================================
  console.log('--- UJI COBA 1: SUPER USER / ADMIN ---');
  {
    const u = users.admin;
    // a. Wilayah Dropdown
    const poldaRes = await api('/api/wilayah/polda', u.id, u.roleId);
    assert(poldaRes.data.data.length >= 34, u.roleId, u.name, 'Admin melihat semua Polda (>= 34)');

    const polresRes = await api('/api/wilayah/polres', u.id, u.roleId);
    assert(polresRes.data.data.length > 500, u.roleId, u.name, 'Admin melihat semua Polres (> 500)');

    // b. Akun Pengguna
    const userRes = await api('/api/user-access/data', u.id, u.roleId);
    assert(userRes.data.data.users.length === 630, u.roleId, u.name, 'Admin melihat seluruh 630 akun user');

    // c. Training Sessions
    const sessRes = await api('/api/outreach/sessions', u.id, u.roleId);
    assert(sessRes.data.data.length >= 5, u.roleId, u.name, `Admin melihat seluruh sesi (${sessRes.data.data.length} sesi)`);

    // d. Stats
    const statsRes = await api('/api/stats', u.id, u.roleId);
    assert(statsRes.data.data.totalSessions === sessRes.data.data.length, u.roleId, u.name, 'Admin totalSessions di /api/stats sinkron dengan list');

    // e. Executive Analytics
    const anaRes = await api('/api/executive/analytics', u.id, u.roleId);
    assert(anaRes.data.data.totalSessions === sessRes.data.data.length, u.roleId, u.name, 'Admin totalSessions di /api/executive/analytics sinkron dengan list');

    // f. Access any session by ID
    const sAceh = await api('/api/outreach/sessions/TEST-SES-ACEH-01', u.id, u.roleId);
    assert(sAceh.status === 200, u.roleId, u.name, 'Admin dapat mengakses detail sesi Aceh');
    const sMetro = await api('/api/outreach/sessions/TEST-SES-METRO-01', u.id, u.roleId);
    assert(sMetro.status === 200, u.roleId, u.name, 'Admin dapat mengakses detail sesi Metro');
  }

  // =========================================================================
  // 2. EKSEKUTIF 1 (NASIONAL)
  // =========================================================================
  console.log('\n--- UJI COBA 2: EKSEKUTIF 1 (NASIONAL) ---');
  {
    const u = users.eksekutif1;
    // a. Wilayah Dropdown
    const poldaRes = await api('/api/wilayah/polda', u.id, u.roleId);
    assert(poldaRes.data.data.length >= 34, u.roleId, u.name, 'Eksekutif 1 melihat semua Polda');

    // b. Akun Pengguna: Boleh melihat Eksekutif 2, Eksekutif 3, dan Trainer nasional
    // Tidak boleh melihat Super User / Admin atau sesama Eksekutif 1 lain
    const userRes = await api('/api/user-access/data', u.id, u.roleId);
    const visibleUsers = userRes.data.data.users;
    const hasAdmin = visibleUsers.some((x: any) => x.roleId === 'role-admin');
    const hasEx1Other = visibleUsers.some((x: any) => x.roleId === 'role-executive-1' && x.id !== u.id);
    const hasEx2 = visibleUsers.some((x: any) => x.roleId === 'role-executive-2');
    const hasEx3 = visibleUsers.some((x: any) => x.roleId === 'role-executive-3');
    assert(!hasAdmin && !hasEx1Other, u.roleId, u.name, 'Eksekutif 1 TIDAK dapat melihat akun Super User / Admin atau Eksekutif 1 lain');
    assert(hasEx2 && hasEx3, u.roleId, u.name, 'Eksekutif 1 melihat akun Eksekutif 2 & Eksekutif 3 nasional');

    // c. Training Sessions: Semua sesi nasional
    const sessRes = await api('/api/outreach/sessions', u.id, u.roleId);
    assert(sessRes.data.data.length >= 5, u.roleId, u.name, `Eksekutif 1 melihat seluruh data training nasional (${sessRes.data.data.length} sesi)`);

    // d. Stats & Analytics
    const statsRes = await api('/api/stats', u.id, u.roleId);
    assert(statsRes.data.data.totalSessions === sessRes.data.data.length, u.roleId, u.name, 'Eksekutif 1 totalSessions di /api/stats sinkron dengan list');
    const anaRes = await api('/api/executive/analytics', u.id, u.roleId);
    assert(anaRes.data.data.totalSessions === sessRes.data.data.length, u.roleId, u.name, 'Eksekutif 1 totalSessions di analytics sinkron dengan list');

    // e. Access session by ID
    const sAceh = await api('/api/outreach/sessions/TEST-SES-ACEH-01', u.id, u.roleId);
    assert(sAceh.status === 200, u.roleId, u.name, 'Eksekutif 1 dapat mengakses detail sesi Aceh');
  }

  // =========================================================================
  // 3. EKSEKUTIF 2 - METRO JAYA
  // =========================================================================
  console.log('\n--- UJI COBA 3: EKSEKUTIF 2 (METRO JAYA) ---');
  {
    const u = users.eksekutif2Metro;
    // a. Wilayah Dropdown
    const poldaRes = await api('/api/wilayah/polda', u.id, u.roleId);
    assert(poldaRes.data.data.length === 1 && poldaRes.data.data[0].nama === 'METRO JAYA', u.roleId, u.name, 'Eksekutif 2 Metro hanya menerima Polda METRO JAYA');

    const polresRes = await api('/api/wilayah/polres', u.id, u.roleId);
    const nonMetroPolres = polresRes.data.data.filter((x: any) => x.poldaId !== '12'); // Polda Metro Jaya id: 12
    assert(nonMetroPolres.length === 0, u.roleId, u.name, 'Eksekutif 2 Metro hanya menerima polres di wilayah Metro Jaya');

    // b. Akun Pengguna: Hanya Eksekutif 3 & Trainer di Metro Jaya, plus diri sendiri
    const userRes = await api('/api/user-access/data', u.id, u.roleId);
    const visibleUsers = userRes.data.data.users;
    const hasAdmin = visibleUsers.some((x: any) => x.roleId === 'role-admin');
    const hasEx1 = visibleUsers.some((x: any) => x.roleId === 'role-executive-1');
    const hasEx2Other = visibleUsers.some((x: any) => x.roleId === 'role-executive-2' && x.id !== u.id);
    const hasAcehUser = visibleUsers.some((x: any) => x.polda === 'ACEH');
    assert(!hasAdmin && !hasEx1 && !hasEx2Other, u.roleId, u.name, 'Eksekutif 2 Metro TIDAK melihat Admin, Ex1, atau Ex2 lain');
    assert(!hasAcehUser, u.roleId, u.name, 'Eksekutif 2 Metro TIDAK melihat user dari Polda Aceh');

    // c. Sessions: Hanya sesi di METRO JAYA (2 sesi)
    const sessRes = await api('/api/outreach/sessions', u.id, u.roleId);
    const sessions = sessRes.data.data;
    const allMetro = sessions.every((s: any) => s.polda === 'METRO JAYA');
    assert(sessions.length === 2 && allMetro, u.roleId, u.name, 'Eksekutif 2 Metro hanya melihat 2 sesi di wilayah Metro Jaya');

    // d. Stats & Analytics = 2
    const statsRes = await api('/api/stats', u.id, u.roleId);
    assert(statsRes.data.data.totalSessions === 2, u.roleId, u.name, 'Eksekutif 2 Metro totalSessions = 2 (sinkron baris list)');

    const anaRes = await api('/api/executive/analytics', u.id, u.roleId);
    assert(anaRes.data.data.totalSessions === 2, u.roleId, u.name, 'Eksekutif 2 Metro analytics totalSessions = 2');

    // e. Detail by ID: Sesi Metro -> 200, Sesi Aceh -> 403 Forbidden!
    const sMetro = await api('/api/outreach/sessions/TEST-SES-METRO-01', u.id, u.roleId);
    assert(sMetro.status === 200, u.roleId, u.name, 'Eksekutif 2 Metro dapat akses sesi Metro Jaya');

    const sAceh = await api('/api/outreach/sessions/TEST-SES-ACEH-01', u.id, u.roleId);
    assert(sAceh.status === 403, u.roleId, u.name, 'Eksekutif 2 Metro DITOLAK (403) saat akses detail sesi Aceh');

    // f. Batch Print & Activity Detail di luar wilayah -> 403 Forbidden!
    const bpAceh = await api('/api/outreach/sessions/TEST-SES-ACEH-01/certificates/batch-print', u.id, u.roleId);
    assert(bpAceh.status === 403, u.roleId, u.name, 'Eksekutif 2 Metro DITOLAK (403) batch print sesi Aceh');

    const adAceh = await api('/api/outreach/activity-detail/TEST-SES-ACEH-01', u.id, u.roleId);
    assert(adAceh.status === 403, u.roleId, u.name, 'Eksekutif 2 Metro DITOLAK (403) activity detail sesi Aceh');

    // g. Query manipulation: coba minta ?polda=ACEH -> harus kosong/tidak memperluas
    const manipRes = await api('/api/outreach/sessions?polda=ACEH', u.id, u.roleId);
    assert(manipRes.data.data.length === 0, u.roleId, u.name, 'Manipulasi query ?polda=ACEH tidak memperluas hasil (0 data)');
  }

  // =========================================================================
  // 4. EKSEKUTIF 2 - ACEH
  // =========================================================================
  console.log('\n--- UJI COBA 4: EKSEKUTIF 2 (ACEH) ---');
  {
    const u = users.eksekutif2Aceh;
    // a. Wilayah Dropdown
    const poldaRes = await api('/api/wilayah/polda', u.id, u.roleId);
    assert(poldaRes.data.data.length === 1 && poldaRes.data.data[0].nama === 'ACEH', u.roleId, u.name, 'Eksekutif 2 Aceh hanya menerima Polda ACEH');

    // b. Sessions: Hanya sesi di ACEH (2 sesi)
    const sessRes = await api('/api/outreach/sessions', u.id, u.roleId);
    const sessions = sessRes.data.data;
    const allAceh = sessions.every((s: any) => s.polda === 'ACEH');
    assert(sessions.length === 2 && allAceh, u.roleId, u.name, 'Eksekutif 2 Aceh hanya melihat 2 sesi di wilayah Aceh');

    // c. Detail by ID: Sesi Aceh -> 200, Sesi Metro -> 403!
    const sAceh = await api('/api/outreach/sessions/TEST-SES-ACEH-01', u.id, u.roleId);
    assert(sAceh.status === 200, u.roleId, u.name, 'Eksekutif 2 Aceh dapat akses sesi Aceh');

    const sMetro = await api('/api/outreach/sessions/TEST-SES-METRO-01', u.id, u.roleId);
    assert(sMetro.status === 403, u.roleId, u.name, 'Eksekutif 2 Aceh DITOLAK (403) saat akses sesi Metro');
  }

  // =========================================================================
  // 5. EKSEKUTIF 3 - ACEH DITLANTAS
  // =========================================================================
  console.log('\n--- UJI COBA 5: EKSEKUTIF 3 (ACEH DITLANTAS) ---');
  {
    const u = users.eksekutif3Ditlantas;
    // a. Wilayah Dropdown
    const polresRes = await api('/api/wilayah/polres', u.id, u.roleId);
    assert(polresRes.data.data.length === 1 && polresRes.data.data[0].nama === 'DITLANTAS' && polresRes.data.data[0].poldaId === '01', u.roleId, u.name, 'Eksekutif 3 Ditlantas hanya melihat Polres DITLANTAS di Polda Aceh');

    // b. Akun Pengguna: Hanya akun Trainer di wilayahnya dan dirinya sendiri, TIDAK BISA melihat Eksekutif lain
    const userRes = await api('/api/user-access/data', u.id, u.roleId);
    const visibleUsers = userRes.data.data.users;
    const hasOtherExec = visibleUsers.some((x: any) => x.roleId.startsWith('role-executive') && x.id !== u.id);
    const allInScope = visibleUsers.every((x: any) => x.polda === 'ACEH' && (!x.polres || x.polres === 'DITLANTAS'));
    assert(!hasOtherExec, u.roleId, u.name, 'Eksekutif 3 TIDAK BISA melihat akun Eksekutif mana pun (selain dirinya)');
    assert(allInScope, u.roleId, u.name, 'Seluruh akun yang tampil berada di lingkup Aceh Ditlantas');

    // c. Sessions: Hanya sesi di ACEH DITLANTAS (1 sesi)
    const sessRes = await api('/api/outreach/sessions', u.id, u.roleId);
    const sessions = sessRes.data.data;
    assert(sessions.length === 1 && sessions[0].id === 'TEST-SES-ACEH-01', u.roleId, u.name, 'Eksekutif 3 Ditlantas hanya melihat 1 sesi Ditlantas');

    // d. Detail by ID: Sesi Ditlantas -> 200, Sesi Lhokseumawe -> 403!
    const sDitlantas = await api('/api/outreach/sessions/TEST-SES-ACEH-01', u.id, u.roleId);
    assert(sDitlantas.status === 200, u.roleId, u.name, 'Eksekutif 3 Ditlantas dapat akses sesi Ditlantas');

    const sLhokseumawe = await api('/api/outreach/sessions/TEST-SES-ACEH-02', u.id, u.roleId);
    assert(sLhokseumawe.status === 403, u.roleId, u.name, 'Eksekutif 3 Ditlantas DITOLAK (403) akses sesi Lhokseumawe');

    // e. Query manipulation: coba minta ?polres=LHOKSEUMAWE -> 0 data
    const manipRes = await api('/api/outreach/sessions?polres=LHOKSEUMAWE', u.id, u.roleId);
    assert(manipRes.data.data.length === 0, u.roleId, u.name, 'Manipulasi query polres tidak memperluas hasil (0 data)');
  }

  // =========================================================================
  // 6. EKSEKUTIF 3 - ACEH LHOKSEUMAWE
  // =========================================================================
  console.log('\n--- UJI COBA 6: EKSEKUTIF 3 (ACEH LHOKSEUMAWE) ---');
  {
    const u = users.eksekutif3Lhokseumawe;
    // a. Sessions: Hanya sesi LHOKSEUMAWE (1 sesi)
    const sessRes = await api('/api/outreach/sessions', u.id, u.roleId);
    const sessions = sessRes.data.data;
    assert(sessions.length === 1 && sessions[0].id === 'TEST-SES-ACEH-02', u.roleId, u.name, 'Eksekutif 3 Lhokseumawe hanya melihat 1 sesi Lhokseumawe');

    // b. Detail by ID: Sesi Lhokseumawe -> 200, Sesi Ditlantas -> 403!
    const sLhokseumawe = await api('/api/outreach/sessions/TEST-SES-ACEH-02', u.id, u.roleId);
    assert(sLhokseumawe.status === 200, u.roleId, u.name, 'Eksekutif 3 Lhokseumawe dapat akses sesi Lhokseumawe');

    const sDitlantas = await api('/api/outreach/sessions/TEST-SES-ACEH-01', u.id, u.roleId);
    assert(sDitlantas.status === 403, u.roleId, u.name, 'Eksekutif 3 Lhokseumawe DITOLAK (403) akses sesi Ditlantas');
  }

  // =========================================================================
  // 7. TRAINER (ACEH)
  // =========================================================================
  console.log('\n--- UJI COBA 7: TRAINER (ACEH) ---');
  {
    const u = users.trainerAceh;
    // a. Route Guard: Trainer TIDAK diizinkan akses menu User Akses & RBAC (403 Forbidden)
    const userRes = await api('/api/user-access/data', u.id, u.roleId);
    assert(userRes.status === 403, u.roleId, u.name, 'Trainer DIBLOKIR (403 Route Guard) akses menu User Akses & RBAC');

    // b. Training Sessions: Hanya sesi yang diselenggarakan olehnya / wilayahnya
    const sessRes = await api('/api/outreach/sessions', u.id, u.roleId);
    const sessions = sessRes.data.data;
    const allTrainer = sessions.every((s: any) => s.trainerId === u.id || s.polda === 'ACEH');
    assert(sessions.length > 0 && allTrainer, u.roleId, u.name, 'Trainer hanya melihat kegiatan dalam wilayah/miliknya');

    // c. Mencoba membuat sesi di wilayah lain (METRO JAYA) -> Ditolak 403!
    const createCrossRes = await api('/api/outreach/sessions', u.id, u.roleId, 'POST', {
      materialId: 'mat-sd-01',
      activityName: 'Sesi Liar Lintas Wilayah',
      polda: 'METRO JAYA',
      polres: 'JAKARTA PUSAT',
      location: 'Monas',
      date: '2026-10-20',
      startTime: '08:00',
    });
    assert(createCrossRes.status === 403, u.roleId, u.name, 'Trainer DITOLAK (403) membuat kegiatan di luar wilayahnya');

    // d. Membuat sesi di wilayahnya (ACEH) -> Berhasil 200!
    const createOkRes = await api('/api/outreach/sessions', u.id, u.roleId, 'POST', {
      materialId: 'mat-sd-01',
      activityName: 'Sesi Legal Sesuai Wilayah',
      polda: 'ACEH',
      polres: 'DITLANTAS',
      location: 'Kantor Ditlantas Aceh',
      date: '2026-10-20',
      startTime: '08:00',
    });
    assert(createOkRes.status === 200, u.roleId, u.name, 'Trainer BERHASIL (200) membuat kegiatan di wilayahnya sendiri');

    // Bersihkan sesi trainer legal yang baru dibuat
    if (createOkRes.data?.data?.id) {
      await api(`/api/outreach/sessions/${createOkRes.data.data.id}`, users.admin.id, users.admin.roleId, 'DELETE');
    }
  }

  // =========================================================================
  // 8. HIERARKI PEMBUATAN / PENGHAPUSAN AKUN
  // =========================================================================
  console.log('\n--- UJI COBA 8: VALIDASI PEMBATASAN MANAJEMEN AKUN ---');
  {
    // Eksekutif 2 (Metro Jaya) mencoba membuat akun Eksekutif 3 atau Admin -> 403 Forbidden!
    const createIllegalRoleRes = await api('/api/user-access/user', users.eksekutif2Metro.id, users.eksekutif2Metro.roleId, 'POST', {
      username: 'illegal_admin_attempt',
      fullName: 'Percobaan Ilegal',
      roleId: 'role-admin',
      polda: 'METRO JAYA'
    });
    assert(createIllegalRoleRes.status === 403, users.eksekutif2Metro.roleId, users.eksekutif2Metro.name, 'Eksekutif 2 DITOLAK (403) membuat akun role Admin');

    // Eksekutif 2 (Metro Jaya) mencoba membuat akun di luar wilayahnya (Polda Aceh) -> 403 Forbidden!
    const createIllegalWilayahRes = await api('/api/user-access/user', users.eksekutif2Metro.id, users.eksekutif2Metro.roleId, 'POST', {
      username: 'illegal_wilayah_attempt',
      fullName: 'Percobaan Wilayah Lain',
      roleId: 'role-trainer',
      polda: 'ACEH'
    });
    assert(createIllegalWilayahRes.status === 403, users.eksekutif2Metro.roleId, users.eksekutif2Metro.name, 'Eksekutif 2 DITOLAK (403) membuat akun di luar wilayah Polda-nya');

    // Super User membuat akun -> Berhasil 200
    const createAdminOkRes = await api('/api/user-access/user', users.admin.id, users.admin.roleId, 'POST', {
      username: 'test_created_by_admin',
      fullName: 'Akun Uji Coba Admin',
      roleId: 'role-trainer',
      polda: 'BALI'
    });
    assert(createAdminOkRes.status === 200, users.admin.roleId, users.admin.name, 'Super User / Admin BERHASIL (200) membuat akun wilayah mana pun');

    // Hapus akun yang baru dibuat oleh admin
    if (createAdminOkRes.data?.data?.id) {
      await api(`/api/user-access/user/${createAdminOkRes.data.data.id}`, users.admin.id, users.admin.roleId, 'DELETE');
    }
  }

  // Cleanup: Hapus test sessions
  console.log('\n--- CLEANUP DATA TESTING ---');
  for (const s of testSessions) {
    await api(`/api/outreach/sessions/${s.id}`, users.admin.id, users.admin.roleId, 'DELETE');
  }
  console.log('Seluruh sesi testing berhasil dibersihkan.');

  console.log('\n========================================================================');
  const total = results.length;
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  console.log(`  HASIL AKHIR VERIFIKASI: ${passed}/${total} LULUS (${failed} GAGAL)`);
  console.log('========================================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runVerification().catch(err => {
  console.error('Fatal error during verification:', err);
  process.exit(1);
});
