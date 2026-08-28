export type EducationLevel = 'ALL' | 'TK/PAUD' | 'SD' | 'SMP' | 'SMA';

export type MaterialType = 'all' | 'video' | 'infografis' | 'modul' | 'kuis' | 'artikel';

export type LearningStatus = 'not_started' | 'in_progress' | 'completed';

export interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface CourseLesson {
  id: string;
  title: string;
  duration?: string;
  type: 'video' | 'reading' | 'quiz' | 'infografis';
  videoUrl?: string;
  content?: string;
  isCompleted?: boolean;
}

export interface CourseModule {
  id: string;
  title: string;
  lessons: CourseLesson[];
}

export type PublishStatus = 'draft' | 'published' | 'archived';

export interface MaterialItem {
  id: string;
  title: string;
  level: 'TK/PAUD' | 'SD' | 'SMP' | 'SMA';
  type: MaterialType;
  typeLabel: string;
  badgeTag?: string;
  description: string;
  imageUrl: string;
  imageAlt: string;
  metadataText: string;
  views: number;
  downloads?: number;
  readTime?: string;
  duration?: string;
  questionsCount?: number;
  pageCount?: number;
  isNew?: boolean;
  featured?: boolean;
  size?: 'featured' | 'standard' | 'compact';
  bookmarked?: boolean;
  author?: string;
  publishDate?: string;
  summary?: string;
  keyPoints?: string[];
  quiz?: QuizQuestion[];
  videoUrl?: string;
  downloadSize?: string;
  // Lifecycle status
  publishStatus?: PublishStatus;
  publicAccess?: 'allowed' | 'restricted';
  // Struktur kurikulum multi-modul & status progress
  modules?: CourseModule[];
  progressPercent?: number;
  status?: LearningStatus;
  estimatedHours?: number;
  certificationAvailable?: boolean;
  passingScore?: number;
}

export interface UserProgressItem {
  materialId: string;
  completedLessonIds: string[];
  progressPercent: number;
  status: LearningStatus;
  lastAccessedAt: string;
  quizScore?: number;
}

export interface UserProfile {
  name: string;
  role: string;
  department: string;
  avatarUrl: string;
  nip: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  type: 'info' | 'alert' | 'success';
}

export interface FilterState {
  level: EducationLevel;
  type: MaterialType;
  searchQuery: string;
  sortBy: 'latest' | 'popular' | 'downloads' | 'az';
}

// === User Access Management & RBAC ===

export type PermissionAction = 'view' | 'add' | 'edit' | 'delete';

export interface MenuPermission {
  menuId: string;
  menuLabel: string;
  actions: PermissionAction[];
}

export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: MenuPermission[];
}

export interface UserAccount {
  id: string;
  username: string;
  password: string;
  fullName: string;
  roleId: string;
  isActive: boolean;
  createdAt: string;
  // Informasi Kedinasan (Trainer Organization Profile)
  position?: string;       // Jabatan (e.g., "Kanit Dikyasa")
  unit?: string;           // Satuan / Unit Kerja (e.g., "Satlantas")
  polda?: string;          // Polda (e.g., "Polda Metro Jaya")
  polres?: string;         // Polres (e.g., "Polres Metro Jakarta Selatan")
}

// Daftar menu lengkap (kompatibel penuh dengan User Akses yang ada)
export const AVAILABLE_MENUS: { id: string; label: string }[] = [
  { id: 'beranda', label: 'Beranda' },
  { id: 'learning', label: 'Learning' },
  { id: 'my-learning', label: 'My Learning' },
  { id: 'progress', label: 'Capaian & Sertifikat' },
  { id: 'trainer-outreach', label: 'Kegiatan Lapangan (Trainer)' },
  { id: 'content-management', label: 'Manajemen Konten' },
  { id: 'executive', label: 'Eksekutif Dashboard' },
  { id: 'reports', label: 'Laporan & Ekspor' },
  { id: 'user-akses', label: 'User Akses' },
  // Backward compatibility aliases
  { id: 'katalog', label: 'Katalog Materi' },
  { id: 'jenjang', label: 'Jenjang Pendidikan' },
  { id: 'video', label: 'Video' },
  { id: 'dokumen', label: 'Dokumen' },
  { id: 'infografis', label: 'Infografis' },
  { id: 'kuis', label: 'Kuis & Evaluasi' },
  { id: 'favorit', label: 'Favorit' },
  { id: 'riwayat', label: 'Riwayat' },
];

export const ALL_ACTIONS: PermissionAction[] = ['view', 'add', 'edit', 'delete'];

export const DEFAULT_ROLES: Role[] = [
  {
    id: 'role-admin',
    name: 'Admin / Superuser',
    description: 'Akses penuh ke seluruh sistem, modul pembelajaran, analitik, laporan, dan manajemen hak akses user',
    permissions: AVAILABLE_MENUS.map(m => ({ menuId: m.id, menuLabel: m.label, actions: [...ALL_ACTIONS] })),
  },
  {
    id: 'role-trainer',
    name: 'Trainer / Instruktur',
    description: 'Tenaga pendidik kepolisian — dapat melihat, menambah, dan mengedit silabus materi, modul, video, dan kuis',
    permissions: [
      { menuId: 'beranda', menuLabel: 'Beranda', actions: ['view'] },
      { menuId: 'learning', menuLabel: 'Learning', actions: ['view', 'add', 'edit'] },
      { menuId: 'my-learning', menuLabel: 'My Learning', actions: ['view', 'add', 'edit'] },
      { menuId: 'progress', menuLabel: 'Capaian & Sertifikat', actions: ['view'] },
      { menuId: 'trainer-outreach', menuLabel: 'Kegiatan Lapangan (Trainer)', actions: ['view', 'add', 'edit'] },
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
    id: 'role-executive',
    name: 'Executive (Kapolri / Kapolda / Atasan)',
    description: 'Pimpinan tingkat tinggi — akses khusus pemantauan performa nasional, statistik kelulusan, dan laporan eksekutif',
    permissions: [
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
    ],
  },
];

export const DEFAULT_USERS: UserAccount[] = [
  {
    id: 'user-1',
    username: 'superuser',
    password: '123456',
    fullName: 'AKBP Hendra Wijaya, S.I.K.',
    roleId: 'role-admin',
    isActive: true,
    createdAt: '2026-01-01',
  },
  {
    id: 'user-2',
    username: 'trainer1',
    password: '123456',
    fullName: 'Kompol Budi Santoso, S.H.',
    roleId: 'role-trainer',
    isActive: true,
    createdAt: '2026-01-15',
  },
  {
    id: 'user-3',
    username: 'executive',
    password: '123456',
    fullName: 'Irjen Pol. Drs. Ahmad Fauzi, M.Si. (Kapolda)',
    roleId: 'role-executive',
    isActive: true,
    createdAt: '2026-02-01',
  },
];

// === Outreach Session & Activity Tracking (Dual Access & Trainer Field Operations) ===

export type SessionStatus = 'scheduled' | 'active' | 'completed' | 'closed' | 'cancelled';

export interface OutreachSession {
  id: string;
  materialId: string;
  materialTitle?: string;
  trainerId: string;
  trainerName?: string;
  trainerPosition?: string;
  trainerUnit?: string;
  activityName: string;
  polda: string;
  polres: string;
  location: string;
  date: string;
  startTime: string;
  status: SessionStatus;
  publicAccessCode: string;
  publicAccessUrl: string;
  targetParticipants?: number;
  description?: string;
  createdAt: string;
  closedAt?: string;
}

export interface SessionParticipant {
  id: string;
  sessionId: string;
  name: string;
  place: string;
  joinedAt: string;
}

export type LearningEventType =
  | 'join_session'
  | 'material_view'
  | 'lesson_view'
  | 'video_start'
  | 'video_progress'
  | 'document_view'
  | 'infographic_view'
  | 'quiz_start'
  | 'quiz_answer'
  | 'quiz_submit'
  | 'quiz_completed'
  | 'material_completed';

export interface LearningEventRecord {
  id: string;
  sessionId?: string;
  participantId?: string;
  userId?: string;
  materialId: string;
  eventType: LearningEventType;
  details?: Record<string, any>;
  timestamp: string;
}

export interface SessionQuizAttempt {
  id: string;
  sessionId: string;
  participantId: string;
  participantName?: string;
  materialId: string;
  startedAt: string;
  submittedAt: string;
  answers: Record<number, number>;
  score: number;
  passingGrade: number;
  passed: boolean;
  completed: boolean;
}

export interface OutreachReport {
  id: string;
  sessionId: string;
  trainerId: string;
  trainerName: string;
  activityName: string;
  materialId: string;
  materialTitle: string;
  polda: string;
  polres: string;
  location: string;
  date: string;
  startTime: string;
  closedAt: string;
  totalParticipants: number;
  totalViews: number;
  totalQuizAttempts: number;
  totalQuizCompleted: number;
  averageScore: number;
  passingRate: number;
  notes: string;
  evidenceImages: string[];
  createdAt: string;
}

/**
 * One graded KPI row. Shared shape for trainers, Polres, and Polda so the same
 * ranking table can render any of the three.
 */
export interface KpiRow {
  key: string;
  name: string;
  rank: number;
  kpiScore: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'E';
  label: string;
  components: { activity: number; reach: number; quality: number; discipline: number };
  sessionCount: number;
  closedCount: number;
  participantCount: number;
  quizAttemptCount: number;
  quizPassedCount: number;
  passingRate: number;
  averageScore: number;
  materialCount: number;
  lastActivityDate: string | null;
  // Present depending on which level the row describes
  polda?: string;
  polres?: string;
  position?: string;
  unit?: string;
  trainers?: string[];
  polresCount?: number;
  trainerCount?: number;
}

export interface ExecutiveAnalyticsData {
  totalMaterials: number;
  totalPublicMaterials: number;
  totalTrainers: number;
  activeTrainers: number;
  idleTrainers: number;
  totalSessions: number;
  totalCompletedSessions: number;
  totalParticipants: number;
  totalPublicViews: number;
  totalSessionViews: number;
  totalQuizAttempts: number;
  totalQuizCompleted: number;
  averageQuizScore: number;
  completionRate: number;
  popularMaterials: Array<{
    materialId: string;
    title: string;
    level: string;
    publicViews: number;
    sessionViews: number;
    sessionCount: number;
    participantCount: number;
    quizAttemptCount: number;
  }>;
  trainerPerformance: Array<{
    trainerId: string;
    trainerName: string;
    sessionCount: number;
    materialCount: number;
    participantCount: number;
    sessionViews: number;
    quizCount: number;
    completionCount: number;
  }>;
  regionalHierarchy: Array<{
    polda: string;
    polresList: Array<{
      polres: string;
      sessionCount: number;
      participantCount: number;
      views: number;
      trainers: string[];
    }>;
    totalSessions: number;
    totalParticipants: number;
    totalViews: number;
  }>;
  activityTrend: Array<{
    month: string;
    label: string;
    sessionCount: number;
    participantCount: number;
    quizAttemptCount: number;
    quizPassedCount: number;
  }>;
  levelBreakdown: Array<{
    level: string;
    materialCount: number;
    sessionCount: number;
    participantCount: number;
  }>;
  scoreDistribution: Array<{ band: string; count: number }>;
  statusBreakdown: Array<{ status: string; count: number }>;
  recentActivity: Array<{
    reportId: string;
    sessionId: string;
    activityName: string;
    materialTitle: string;
    trainerName: string;
    polda: string;
    polres: string;
    location: string;
    date: string;
    closedAt: string;
    totalParticipants: number;
    averageScore: number;
    passingRate: number;
  }>;
  trainerKpi: KpiRow[];
  polresKpi: KpiRow[];
  poldaKpi: KpiRow[];
  /** Polda in the program's coverage list that ran no activity in this window. */
  inactivePolda: string[];
  kpiWeights: { activity: number; reach: number; quality: number; discipline: number };
  generatedAt: string;
  appliedFilters: {
    polda: string;
    polres: string;
    level: string;
    trainerId: string;
    startDate: string | null;
    endDate: string | null;
  };
}
