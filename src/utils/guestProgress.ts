/**
 * Guest (public portal) learning progress, persisted in the visitor's own browser.
 *
 * Public visitors at /umum have no account, so there is no server-side record to
 * attach progress to. We keep it in localStorage instead: it survives tab closes
 * and reloads, stays on the visitor's device, and is never sent anywhere.
 */

const STORAGE_KEY = 'polri-guest-progress-v1';

/**
 * Fired on this tab whenever the stored progress changes. The portal grid and the
 * reader are siblings, so the grid cannot see the reader's writes without a signal.
 * (The native `storage` event only fires in *other* tabs, so it is not enough.)
 */
export const GUEST_PROGRESS_EVENT = 'polri-guest-progress-changed';

function notifyGuestProgressChanged() {
  try {
    window.dispatchEvent(new Event(GUEST_PROGRESS_EVENT));
  } catch {
    // no-op (non-browser environment)
  }
}

export interface GuestMaterialProgress {
  materialId: string;
  completedLessonIds: string[];
  totalLessons: number;
  progressPercent: number;
  isCompleted: boolean;
  lastAccessedAt: string;
  completedAt?: string | null;
}

type GuestProgressMap = Record<string, GuestMaterialProgress>;

/** Read the whole map. Returns {} when storage is unavailable or corrupt. */
export function readGuestProgress(): GuestProgressMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

/** Progress for one material, or null if the visitor has never opened it. */
export function readGuestMaterialProgress(materialId: string): GuestMaterialProgress | null {
  return readGuestProgress()[materialId] || null;
}

/**
 * Merge newly-viewed lessons into the stored record and recompute completion.
 * Lesson ids are unioned, so progress never moves backwards on a revisit.
 */
export function saveGuestLessonProgress(opts: {
  materialId: string;
  completedLessonIds: string[];
  totalLessons: number;
}): GuestMaterialProgress | null {
  const { materialId, completedLessonIds, totalLessons } = opts;
  if (!materialId) return null;

  try {
    const all = readGuestProgress();
    const prev = all[materialId];

    const merged = Array.from(new Set([...(prev?.completedLessonIds || []), ...completedLessonIds]));
    const total = Math.max(totalLessons || 0, prev?.totalLessons || 0, merged.length);
    const progressPercent = total > 0 ? Math.min(100, Math.round((merged.length / total) * 100)) : 0;
    const isCompleted = total > 0 && merged.length >= total;
    const nowIso = new Date().toISOString();

    const next: GuestMaterialProgress = {
      materialId,
      completedLessonIds: merged,
      totalLessons: total,
      progressPercent,
      isCompleted,
      lastAccessedAt: nowIso,
      // Keep the original completion timestamp once earned
      completedAt: isCompleted ? (prev?.completedAt || nowIso) : null
    };

    all[materialId] = next;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    notifyGuestProgressChanged();
    return next;
  } catch {
    // Private mode / storage disabled: progress simply is not remembered
    return null;
  }
}

/** Forget one material's progress (the "Ulangi dari awal" action). */
export function clearGuestMaterialProgress(materialId: string): void {
  try {
    const all = readGuestProgress();
    delete all[materialId];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    notifyGuestProgressChanged();
  } catch {
    // no-op
  }
}

/** Forget everything this visitor has read. */
export function clearAllGuestProgress(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    notifyGuestProgressChanged();
  } catch {
    // no-op
  }
}

/** Headline counts for the portal summary strip. */
export function getGuestProgressSummary(): { completedCount: number; inProgressCount: number } {
  const all = Object.values(readGuestProgress());
  return {
    completedCount: all.filter(p => p.isCompleted).length,
    inProgressCount: all.filter(p => !p.isCompleted && p.progressPercent > 0).length
  };
}
