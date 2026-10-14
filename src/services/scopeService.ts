/**
 * SM-LEARNING DIKMAS POLRI — Centralized Scope & Territorial Enforcement Service
 * ==============================================================================
 * Mengimplementasikan aturan scope keamanan data multi-tingkat berbasis peran:
 * 1. Super User / Admin: Akses penuh tanpa filter wilayah (level: "all").
 * 2. Eksekutif 3 (Nasional): Semua wilayah (data training, list trainer, akun Eksekutif 1 & 2).
 * 3. Eksekutif 2 (Polda): Seluruh polres di polda-nya (data training, list trainer, akun Eksekutif 1 & Trainer di polda tsb).
 * 4. Eksekutif 1 (Polres): Hanya polres-nya (data training, list trainer, trainer di polres tsb).
 * 5. Trainer: Hanya wilayah & kegiatannya sendiri.
 */

export interface UserScope {
  level: 'all' | 'nasional' | 'polda' | 'polres' | 'trainer';
  isAll: boolean;
  userId: string;
  roleId: string;
  polda: string | null;
  poldaId: string | null;
  polres: string | null;
  polresId: string | null;
}

/**
 * Normalisasi string nama wilayah (menghapus prefix POLDA/POLRES dan spasi berlebih)
 */
export function normalizeRegionName(name?: string | null): string {
  if (!name) return '';
  return String(name)
    .trim()
    .toUpperCase()
    .replace(/^(POLDA|POLRES|POLRESTABES|POLRESTA)\s+/i, '')
    .trim();
}

/**
 * Cek apakah Polda A cocok dengan Polda B
 */
export function isPoldaMatch(
  poldaA?: string | null,
  poldaB?: string | null,
  poldaIdA?: string | null,
  poldaIdB?: string | null
): boolean {
  if (poldaIdA && poldaIdB && String(poldaIdA).trim() === String(poldaIdB).trim()) return true;
  const normA = normalizeRegionName(poldaA);
  const normB = normalizeRegionName(poldaB);
  if (!normA || !normB) return false;
  return normA === normB || normA.includes(normB) || normB.includes(normA);
}

/**
 * Cek apakah Polres A cocok dengan Polres B
 */
export function isPolresMatch(
  polresA?: string | null,
  polresB?: string | null,
  polresIdA?: string | null,
  polresIdB?: string | null
): boolean {
  if (polresIdA && polresIdB && String(polresIdA).trim() === String(polresIdB).trim()) return true;
  const normA = normalizeRegionName(polresA);
  const normB = normalizeRegionName(polresB);
  if (!normA || !normB) return false;
  return normA === normB || normA.includes(normB) || normB.includes(normA);
}

const POLDA_NAME_TO_ID: Record<string, string> = {
  'ACEH': '01',
  'SUMATERA UTARA': '02',
  'RIAU': '03',
  'KEPULAUAN RIAU': '04',
  'SUMATERA BARAT': '05',
  'JAMBI': '06',
  'SUMATERA SELATAN': '07',
  'BENGKULU': '08',
  'LAMPUNG': '09',
  'KEPULAUAN BANGKA BELITUNG': '10',
  'BANTEN': '11',
  'METRO JAYA': '12',
  'JAWA BARAT': '13',
  'JAWA TENGAH': '14',
  'DI YOGYAKARTA': '15',
  'JAWA TIMUR': '16',
  'BALI': '17',
  'NUSA TENGGARA BARAT': '18',
  'NUSA TENGGARA TIMUR': '19',
  'KALIMANTAN BARAT': '20',
  'KALIMANTAN SELATAN': '21',
  'KALIMANTAN TENGAH': '22',
  'KALIMANTAN TIMUR': '23',
  'SULAWESI SELATAN': '24',
  'SULAWESI TENGAH': '25',
  'SULAWESI TENGGARA': '26',
  'SULAWESI UTARA': '27',
  'GORONTALO': '28',
  'MALUKU': '29',
  'MALUKU UTARA': '30',
  'PAPUA': '31',
  'SULAWESI BARAT': '32',
  'KALIMANTAN UTARA': '33',
  'PAPUA BARAT': '34',
  'PJR INDUK KORLANTAS': '90',
  'PUSDIKLANTAS': '99'
};

export function getPoldaIdByName(name?: string | null): string | null {
  if (!name) return null;
  const n = normalizeRegionName(name);
  return POLDA_NAME_TO_ID[n] || null;
}

/**
 * Ekstrak scope resmi dari objek user akun yang terverifikasi (bukan dari query/body).
 * Super User / Admin selalu menghasilkan level: 'all' dan isAll: true.
 */
export function getScope(user: any): UserScope {
  if (!user) {
    return {
      level: 'trainer',
      isAll: false,
      userId: '',
      roleId: 'role-none',
      polda: null,
      poldaId: null,
      polres: null,
      polresId: null
    };
  }

  const roleId = String(user.roleId || '').trim();
  const execLevel = String(user.executiveLevel || '').trim().toLowerCase();
  const resolvedPoldaId = user.poldaId || getPoldaIdByName(user.polda);

  // 1. Super User / Admin
  if (roleId === 'role-admin') {
    return {
      level: 'all',
      isAll: true,
      userId: user.id,
      roleId,
      polda: null,
      poldaId: null,
      polres: null,
      polresId: null
    };
  }

  // 2. Eksekutif 3 (Nasional / Kapolri)
  if (roleId === 'role-executive-3' || (roleId === 'role-executive' && execLevel === 'nasional')) {
    return {
      level: 'nasional',
      isAll: false,
      userId: user.id,
      roleId,
      polda: null,
      poldaId: null,
      polres: null,
      polresId: null
    };
  }

  // 3. Eksekutif 2 (Polda / Kapolda)
  if (roleId === 'role-executive-2' || (roleId === 'role-executive' && execLevel === 'polda')) {
    return {
      level: 'polda',
      isAll: false,
      userId: user.id,
      roleId,
      polda: user.polda || null,
      poldaId: resolvedPoldaId,
      polres: null,
      polresId: null
    };
  }

  // 4. Eksekutif 1 (Polres / Kapolres)
  if (roleId === 'role-executive-1' || (roleId === 'role-executive' && execLevel === 'polres')) {
    return {
      level: 'polres',
      isAll: false,
      userId: user.id,
      roleId,
      polda: user.polda || null,
      poldaId: resolvedPoldaId,
      polres: user.polres || null,
      polresId: user.polresId || null
    };
  }

  // 5. Trainer / Instruktur
  return {
    level: 'trainer',
    isAll: false,
    userId: user.id,
    roleId: roleId || 'role-trainer',
    polda: user.polda || null,
    poldaId: resolvedPoldaId,
    polres: user.polres || null,
    polresId: user.polresId || null
  };
}

/**
 * Filter client query (?polda=&polres=) yang hanya boleh mempersempit di dalam scope,
 * tidak boleh memperluas data di luar wilayah pengguna.
 */
export function getEffectiveTerritoryFilter(
  scope: UserScope,
  clientQuery: { polda?: any; polres?: any; trainerId?: any }
): {
  polda?: string;
  polres?: string;
  trainerId?: string;
} {
  const qPolda = clientQuery.polda && String(clientQuery.polda) !== 'ALL' ? String(clientQuery.polda).trim() : undefined;
  const qPolres = clientQuery.polres && String(clientQuery.polres) !== 'ALL' ? String(clientQuery.polres).trim() : undefined;
  const qTrainerId = clientQuery.trainerId && String(clientQuery.trainerId) !== 'ALL' ? String(clientQuery.trainerId).trim() : undefined;

  // Admin & Eksekutif 3 bebas memakai filter untuk mempersempit
  if (scope.isAll || scope.level === 'nasional') {
    return {
      polda: qPolda,
      polres: qPolres,
      trainerId: qTrainerId
    };
  }

  // Eksekutif 2 terkunci ke Polda-nya, tapi boleh mempersempit Polres
  if (scope.level === 'polda') {
    let effectivePolda = scope.polda || undefined;
    if (qPolda && scope.polda && !isPoldaMatch(qPolda, scope.polda, undefined, scope.poldaId)) {
      effectivePolda = '__MISMATCH__';
    }
    return {
      polda: effectivePolda,
      polres: qPolres,
      trainerId: qTrainerId
    };
  }

  // Eksekutif 1 terkunci ke Polda dan Polres-nya
  if (scope.level === 'polres') {
    let effectivePolda = scope.polda || undefined;
    let effectivePolres = scope.polres || undefined;
    if (qPolda && scope.polda && !isPoldaMatch(qPolda, scope.polda, undefined, scope.poldaId)) {
      effectivePolda = '__MISMATCH__';
    }
    if (qPolres && scope.polres && !isPolresMatch(qPolres, scope.polres, undefined, scope.polresId)) {
      effectivePolres = '__MISMATCH__';
    }
    return {
      polda: effectivePolda,
      polres: effectivePolres,
      trainerId: qTrainerId
    };
  }

  // Trainer terkunci ke kegiatannya sendiri atau wilayahnya
  let effectivePolda = scope.polda || undefined;
  let effectivePolres = scope.polres || undefined;
  if (qPolda && scope.polda && !isPoldaMatch(qPolda, scope.polda, undefined, scope.poldaId)) {
    effectivePolda = '__MISMATCH__';
  }
  if (qPolres && scope.polres && !isPolresMatch(qPolres, scope.polres, undefined, scope.polresId)) {
    effectivePolres = '__MISMATCH__';
  }
  return {
    polda: effectivePolda,
    polres: effectivePolres,
    trainerId: scope.userId
  };
}

/**
 * Memeriksa apakah satu record (kegiatan / laporan) berada dalam cakupan scope pengguna.
 */
export function isRecordInScope(
  record: { polda?: string | null; polres?: string | null; poldaId?: string | null; polresId?: string | null; trainerId?: string | null },
  scope: UserScope
): boolean {
  if (scope.isAll || scope.level === 'nasional') {
    return true;
  }

  if (scope.level === 'polda') {
    return isPoldaMatch(record.polda, scope.polda, record.poldaId, scope.poldaId);
  }

  if (scope.level === 'polres') {
    const matchPolda = isPoldaMatch(record.polda, scope.polda, record.poldaId, scope.poldaId);
    const matchPolres = isPolresMatch(record.polres, scope.polres, record.polresId, scope.polresId);
    return matchPolda && matchPolres;
  }

  if (scope.level === 'trainer') {
    if (record.trainerId && record.trainerId === scope.userId) return true;
    const matchPolda = isPoldaMatch(record.polda, scope.polda, record.poldaId, scope.poldaId);
    const matchPolres = scope.polres ? isPolresMatch(record.polres, scope.polres, record.polresId, scope.polresId) : true;
    return matchPolda && matchPolres;
  }

  return false;
}

/**
 * Menerapkan scope terpusat ke daftar sesi training / laporan kegiatan
 */
export function applyScopeToSessions<T extends { polda?: any; polres?: any; poldaId?: any; polresId?: any; trainerId?: any }>(
  items: T[],
  scope: UserScope,
  clientFilter?: { polda?: any; polres?: any; trainerId?: any }
): T[] {
  let result = items;

  // 1. Enforce Role Scope
  if (!scope.isAll && scope.level !== 'nasional') {
    result = result.filter(item => isRecordInScope(item, scope));
  }

  // 2. Client narrowing filter
  if (clientFilter) {
    const eff = getEffectiveTerritoryFilter(scope, clientFilter);
    if (eff.polda) {
      if (eff.polda === '__MISMATCH__') {
        return [];
      }
      if (scope.isAll || scope.level === 'nasional') {
        result = result.filter(item => isPoldaMatch(item.polda, eff.polda, item.poldaId));
      }
    }
    if (eff.polres) {
      if (eff.polres === '__MISMATCH__') {
        return [];
      }
      if (scope.isAll || scope.level === 'nasional' || scope.level === 'polda') {
        result = result.filter(item => isPolresMatch(item.polres, eff.polres, item.polresId));
      }
    }
    if (eff.trainerId && (scope.isAll || scope.level === 'nasional' || scope.level === 'polda' || scope.level === 'polres')) {
      result = result.filter(item => item.trainerId === eff.trainerId);
    }
  }

  return result;
}

/**
 * Filter daftar akun pengguna (Users) berdasarkan aturan matriks hierarki scope:
 * - Super User / Admin: Semua akun
 * - Eksekutif 3: Semua akun Eksekutif 1 & 2 (dan Trainer), plus akun dirinya
 * - Eksekutif 2: Akun Eksekutif 1 di polda tsb, akun Trainer di polda tsb, plus akun dirinya
 * - Eksekutif 1: Akun Trainer di polres tsb, plus akun dirinya
 * - Trainer: Hanya akun dirinya sendiri
 */
export function filterUsersByScope(users: any[], scope: UserScope): any[] {
  if (scope.isAll) {
    return users;
  }

  return users.filter(u => {
    // Akun diri sendiri selalu boleh tampil
    if (u.id === scope.userId) return true;

    if (scope.level === 'nasional') {
      // Eksekutif 3: melihat semua akun Eksekutif 1, 2, dan Trainer
      return (
        u.roleId === 'role-executive-1' ||
        u.roleId === 'role-executive-2' ||
        u.roleId === 'role-trainer'
      );
    }

    if (scope.level === 'polda') {
      // Eksekutif 2: melihat akun Eksekutif 1 dan Trainer di Polda-nya
      const matchPolda = isPoldaMatch(u.polda, scope.polda, u.poldaId, scope.poldaId);
      if (!matchPolda) return false;
      return u.roleId === 'role-executive-1' || u.roleId === 'role-trainer';
    }

    if (scope.level === 'polres') {
      // Eksekutif 1: melihat akun Trainer di Polres-nya saja
      const matchPolda = isPoldaMatch(u.polda, scope.polda, u.poldaId, scope.poldaId);
      const matchPolres = isPolresMatch(u.polres, scope.polres, u.polresId, scope.polresId);
      if (!matchPolda || !matchPolres) return false;
      return u.roleId === 'role-trainer';
    }

    if (scope.level === 'trainer') {
      return false;
    }

    return false;
  });
}

/**
 * Validasi otorisasi untuk Create / Update / Delete akun pengguna:
 * - Tidak bisa membuat/mengubah akun di luar wilayah
 * - Tidak bisa membuat/mengubah role di atas atau setara dirinya
 */
export function canManageUserAccount(
  creatorScope: UserScope,
  targetUserData: { roleId?: string; polda?: string; polres?: string },
  existingUser?: any
): { allowed: boolean; reason?: string } {
  if (creatorScope.isAll) {
    return { allowed: true };
  }

  // Trainer dilarang mengelola user sama sekali
  if (creatorScope.level === 'trainer') {
    return { allowed: false, reason: 'Peran Trainer tidak memiliki hak akses mengelola akun pengguna.' };
  }

  const targetRoleId = String(targetUserData.roleId || existingUser?.roleId || '').trim();

  // Eksekutif 3
  if (creatorScope.level === 'nasional') {
    if (targetRoleId === 'role-admin' || targetRoleId === 'role-executive-3') {
      return { allowed: false, reason: 'Eksekutif 3 tidak dapat membuat atau mengubah akun Admin atau Eksekutif 3.' };
    }
    return { allowed: true };
  }

  // Eksekutif 2 (Polda)
  if (creatorScope.level === 'polda') {
    if (targetRoleId !== 'role-executive-1' && targetRoleId !== 'role-trainer') {
      return { allowed: false, reason: 'Eksekutif 2 hanya dapat mengelola akun Eksekutif 1 atau Trainer.' };
    }
    const targetPolda = targetUserData.polda || existingUser?.polda;
    if (!isPoldaMatch(targetPolda, creatorScope.polda, undefined, creatorScope.poldaId)) {
      return { allowed: false, reason: `Eksekutif 2 hanya dapat mengelola akun di wilayah Polda ${creatorScope.polda}.` };
    }
    return { allowed: true };
  }

  // Eksekutif 1 (Polres)
  if (creatorScope.level === 'polres') {
    if (targetRoleId !== 'role-trainer') {
      return { allowed: false, reason: 'Eksekutif 1 hanya dapat mengelola akun Trainer di wilayahnya.' };
    }
    const targetPolda = targetUserData.polda || existingUser?.polda;
    const targetPolres = targetUserData.polres || existingUser?.polres;
    if (
      !isPoldaMatch(targetPolda, creatorScope.polda, undefined, creatorScope.poldaId) ||
      !isPolresMatch(targetPolres, creatorScope.polres, undefined, creatorScope.polresId)
    ) {
      return { allowed: false, reason: `Eksekutif 1 hanya dapat mengelola akun di wilayah Polres ${creatorScope.polres}.` };
    }
    return { allowed: true };
  }

  return { allowed: false, reason: 'Akses ditolak.' };
}

/**
 * Filter opsi dropdown wilayah Polda berdasarkan scope
 */
export function filterPoldaListByScope(poldaList: any[], scope: UserScope): any[] {
  if (scope.isAll || scope.level === 'nasional') {
    return poldaList;
  }
  return poldaList.filter(p => isPoldaMatch(p.nama, scope.polda, p.poldaId, scope.poldaId));
}

/**
 * Filter opsi dropdown wilayah Polres berdasarkan scope
 */
export function filterPolresListByScope(
  polresList: any[],
  scope: UserScope,
  requestedPoldaId?: string
): any[] {
  if (scope.isAll || scope.level === 'nasional') {
    if (!requestedPoldaId) return polresList;
    return polresList.filter(p => String(p.poldaId) === String(requestedPoldaId));
  }

  const scopePoldaId = scope.poldaId || getPoldaIdByName(scope.polda);

  if (scope.level === 'polda') {
    // Mengembalikan seluruh polres di Polda miliknya
    return polresList.filter(p => {
      if (scopePoldaId && p.poldaId) return String(p.poldaId) === String(scopePoldaId);
      return true;
    });
  }

  // Eksekutif 1 & Trainer hanya polres miliknya di polda miliknya
  return polresList.filter(p => {
    if (scopePoldaId && p.poldaId && String(p.poldaId) !== String(scopePoldaId)) {
      return false;
    }
    return isPolresMatch(p.nama, scope.polres, p.polresId, scope.polresId);
  });
}
