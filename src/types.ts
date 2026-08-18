export type EducationLevel = 'ALL' | 'TK/PAUD' | 'SD' | 'SMP' | 'SMA';

export type MaterialType = 'all' | 'video' | 'infografis' | 'modul' | 'kuis' | 'artikel';

export interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

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
