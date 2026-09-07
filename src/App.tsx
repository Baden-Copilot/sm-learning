import React, { useState, useMemo, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { TopHeader } from './components/TopHeader';
import { Toast, ToastMessage } from './components/Toast';
import { INITIAL_MATERIALS } from './data/materials';
import {
  EducationLevel,
  MaterialItem,
  MaterialType,
  UserAccount,
  Role,
  LearningStatus,
  DEFAULT_USERS,
  DEFAULT_ROLES,
} from './types';
import { LoginPage } from './components/LoginPage';
import { UserAccessPage } from './components/UserAccessPage';
import { BerandaPage } from './components/BerandaPage';
import { LearningPage } from './components/LearningPage';
import { MyLearningPage } from './components/MyLearningPage';
import { CourseDetailPage } from './components/CourseDetailPage';
import { LearningFocusMode } from './components/LearningFocusMode';
import { QuizExperience } from './components/QuizExperience';
import { ProgressPage } from './components/ProgressPage';
import { ExecutiveDashboardPage } from './components/ExecutiveDashboardPage';
import { TrainerOutreachPage } from './components/TrainerOutreachPage';
import { PresentationRoom } from './components/PresentationRoom';
import { ActivityReportModal } from './components/ActivityReportModal';
import { PublicLearningPortal } from './components/PublicLearningPortal';
import { PublicSessionView } from './components/PublicSessionView';
import { ContentManagementPage } from './components/ContentManagementPage';
import { ContentAuthoringPage } from './components/ContentAuthoringPage';
import { ProfilePage } from './components/ProfilePage';
import { ReportsPage } from './components/ReportsPage';
import { AiChatPage } from './components/AiChatPage';
import { BottomNav } from './components/BottomNav';
import { AleshaKioskModal } from './components/AleshaKioskModal';
import { Bot } from 'lucide-react';
import { NotFoundPage } from './components/NotFoundPage';
import { ForbiddenPage } from './components/ForbiddenPage';
import { readGuestMaterialProgress, saveGuestLessonProgress } from './utils/guestProgress';

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    return sessionStorage.getItem('isLoggedIn') === 'true';
  });

  const [materials, setMaterials] = useState<MaterialItem[]>(INITIAL_MATERIALS);
  const [selectedLevel, setSelectedLevel] = useState<EducationLevel>('ALL');
  const [selectedType, setSelectedType] = useState<MaterialType>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'latest' | 'popular' | 'downloads' | 'az'>('latest');
  const [currentTab, setCurrentTab] = useState<string>(() => {
    try {
      const saved = sessionStorage.getItem('currentUser');
      if (saved) {
        const u = JSON.parse(saved);
        const roleId = u?.user?.roleId || u?.roleId || u?.role?.id;
        if (roleId === 'role-executive') return 'executive';
      }
    } catch {}
    return 'beranda';
  });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [viewHistory, setViewHistory] = useState<string[]>([]);

  // Navigation & Learning Journey State
  const [selectedCourseDetail, setSelectedCourseDetail] = useState<MaterialItem | null>(null);
  const [activeFocusMaterial, setActiveFocusMaterial] = useState<MaterialItem | null>(null);
  const [activeQuizMaterial, setActiveQuizMaterial] = useState<MaterialItem | null>(null);

  // Outreach & Public Sesi State
  const [activePresentationSession, setActivePresentationSession] = useState<any>(null);
  const [activeReportSession, setActiveReportSession] = useState<any>(null);
  const [isAleshaModalOpen, setIsAleshaModalOpen] = useState<boolean>(false);

  const [isInvalidRoute, setIsInvalidRoute] = useState<boolean>(() => {
    const path = window.location.pathname;
    if (path === '/' || path === '' || path === '/login' || path === '/umum' || path === '/public') {
      return false;
    }
    if (path.startsWith('/umum/session/') || path.startsWith('/public/session/')) {
      const codePart = path.replace(/^\/(umum|public)\/session\//, '').trim();
      return !codePart || codePart.includes('/');
    }
    return true;
  });

  const [publicSessionCode, setPublicSessionCode] = useState<string | null>(() => {
    const path = window.location.pathname;
    if (path.startsWith('/public/session/')) {
      const code = path.replace('/public/session/', '').trim().toUpperCase();
      return code.includes('/') ? null : code;
    }
    if (path.startsWith('/umum/session/')) {
      const code = path.replace('/umum/session/', '').trim().toUpperCase();
      return code.includes('/') ? null : code;
    }
    const params = new URLSearchParams(window.location.search);
    return params.get('session') || null;
  });
  const [isPublicPortalMode, setIsPublicPortalMode] = useState<boolean>(() => {
    const path = window.location.pathname;
    return path === '/umum' || path === '/public';
  });

  // Content Authoring Mode State (Full LMS Authoring Workspace)
  const [isAuthoringOpen, setIsAuthoringOpen] = useState<boolean>(false);
  const [editingMaterial, setEditingMaterial] = useState<MaterialItem | null>(null);

  const [showHelpModal, setShowHelpModal] = useState<boolean>(false);
  const [showAboutModal, setShowAboutModal] = useState<boolean>(false);

  // User access management state
  const [userAccounts, setUserAccounts] = useState<UserAccount[]>(DEFAULT_USERS);
  const [userRoles, setUserRoles] = useState<Role[]>(DEFAULT_ROLES);
  const [currentUser, setCurrentUser] = useState<any>(() => {
    try {
      const saved = sessionStorage.getItem('currentUser');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Active Role Permissions Resolver. An unknown or deleted roleId must resolve
  // to no permissions — defaulting to the first entry would silently hand out
  // admin, since that is index 0.
  const EMPTY_ROLE: Role = { id: 'role-none', name: 'Tanpa Akses', description: 'Role tidak dikenali', permissions: [] };
  const activeRole = useMemo(() => {
    const roleId = currentUser?.user?.roleId || currentUser?.roleId;
    if (!roleId) return EMPTY_ROLE;
    return userRoles.find(r => r.id === roleId) || DEFAULT_ROLES.find(r => r.id === roleId) || EMPTY_ROLE;
  }, [currentUser, userRoles]);

  // Check if current role has action permission on a menu
  const hasPermission = (menuId: string, action: 'view' | 'add' | 'edit' | 'delete') => {
    if (!activeRole) return false;
    const menuPerm = activeRole.permissions.find(p => p.menuId === menuId);
    if (!menuPerm) return false;
    return menuPerm.actions.includes(action);
  };

  const isExecutive =
    activeRole.id === 'role-executive' ||
    activeRole.id === 'role-executive-1' ||
    activeRole.id === 'role-executive-2' ||
    activeRole.id === 'role-executive-3';
  /** Where "back to home" lands. A pimpinan has no Beranda — their home is the dashboard. */
  const homeTab = isExecutive ? 'executive' : 'beranda';
  // Every gate below is derived from the role's actual permissions. Hardcoding
  // role ids here would make revoking a permission in User Akses cosmetic: the
  // button would still render and the API would then reject the click.
  const canAddMaterial = hasPermission('katalog', 'add') || hasPermission('content-management', 'add');
  const canEditMaterial = hasPermission('katalog', 'edit') || hasPermission('content-management', 'edit');
  const canDeleteMaterial = hasPermission('katalog', 'delete') || hasPermission('content-management', 'delete');
  const canAccessUserAkses = hasPermission('user-akses', 'view');
  const canAccessContentManagement = hasPermission('content-management', 'view') || canEditMaterial || canAddMaterial;
  const canAccessReports = hasPermission('reports', 'view');
  const canAccessTrainerOutreach = hasPermission('trainer-outreach', 'view');
  const canAccessExecutiveDashboard = hasPermission('executive', 'view');

  // Filtered materials for learner-facing portal views (Only published content for learners)
  const learnerMaterials = useMemo(() => {
    if (canAccessContentManagement) {
      return materials;
    }
    return materials.filter(m => (m.publishStatus || 'published') === 'published');
  }, [materials, canAccessContentManagement]);

  // Helper to build authenticated headers. No signed-in user means no identity
  // headers at all — falling back to a hardcoded id would hand an anonymous
  // visitor whatever permissions that account happens to hold.
  const getAuthHeaders = (): Record<string, string> => {
    const userId = currentUser?.user?.id || currentUser?.id;
    if (!userId) {
      return { 'Content-Type': 'application/json' };
    }
    return {
      'Content-Type': 'application/json',
      'x-user-id': userId,
      'x-role-id': currentUser?.user?.roleId || currentUser?.role?.id || activeRole.id,
    };
  };

  // Fetch materials & user access data from express backend (once on login, not on every role recalc)
  useEffect(() => {
    if (!isLoggedIn) return;

    fetch('/api/materials', { headers: getAuthHeaders() })
      .then(res => res.json())
      .then(data => {
        if (data.success && Array.isArray(data.data) && data.data.length > 0) {
          setMaterials(data.data);
        }
      })
      .catch(() => {});

    // Live role definitions for every signed-in account. Without this the menus
    // would render against the hardcoded defaults and drift from what the
    // server actually enforces.
    fetch('/api/user-access/my-permissions', { headers: getAuthHeaders() })
      .then(res => res.json())
      .then(data => {
        if (data.success && Array.isArray(data.data?.roles) && data.data.roles.length > 0) {
          setUserRoles(data.data.roles);
        }
      })
      .catch(() => {});

    // The full account list is only for those who manage it.
    if (!canAccessUserAkses) return;

    fetch('/api/user-access/data', { headers: getAuthHeaders() })
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data) {
          if (Array.isArray(data.data.users) && data.data.users.length > 0) {
            setUserAccounts(data.data.users);
          }
          if (Array.isArray(data.data.roles) && data.data.roles.length > 0) {
            setUserRoles(data.data.roles);
          }
        }
      })
      .catch(() => {});
  }, [isLoggedIn, canAccessUserAkses]);

  // Toast Notification Manager
  const addToast = (type: 'success' | 'info' | 'warning', title: string, message: string) => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Real-time Progress Update & Persistence
  const handleUpdateProgress = (
    materialId: string,
    progressPercent: number,
    status?: LearningStatus,
    completedLessonId?: string
  ) => {
    // Optimistic state update
    setMaterials(prev =>
      prev.map(m => {
        if (m.id === materialId) {
          const updatedModules = m.modules?.map(mod => ({
            ...mod,
            lessons: mod.lessons.map(les =>
              les.id === completedLessonId ? { ...les, isCompleted: true } : les
            ),
          }));

          return {
            ...m,
            progressPercent: Math.min(100, Math.max(0, progressPercent)),
            status: status || (progressPercent >= 100 ? 'completed' : 'in_progress'),
            modules: updatedModules || m.modules,
          };
        }
        return m;
      })
    );

    // Sync to Express Backend / JSON DB. Guests have no server-side record —
    // their progress lives in localStorage via guestProgress — so the calls are
    // skipped rather than sent to be rejected.
    if (!isLoggedIn) return;

    fetch(`/api/materials/${materialId}/progress`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ progressPercent, status, completedLessonId }),
    })
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data) {
          setMaterials(prev => prev.map(m => (m.id === materialId ? { ...m, ...data.data } : m)));
        }
      })
      .catch(() => {});

    fetch('/api/learning-records/progress', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ materialId, progressPercent, status, completedLessonId }),
    }).catch(() => {});
  };

  // === REST User Management Handlers (Per-item efficient persistence) ===

  const handleCreateUserSingle = async (newUser: UserAccount): Promise<boolean> => {
    try {
      const res = await fetch('/api/user-access/user', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(newUser),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Gagal menambahkan akun ke basis data.');
      }
      const created = data.data || newUser;
      setUserAccounts(prev => [created, ...prev]);
      addToast('success', 'Akun Dibuat', `Akun "${newUser.username}" berhasil dibuat dan aktif di database.`);
      return true;
    } catch (err: any) {
      addToast('warning', 'Gagal Tambah Akun', err.message || 'Terjadi kesalahan saat menyimpan akun.');
      return false;
    }
  };

  const handleUpdateUserSingle = async (updatedUser: UserAccount): Promise<boolean> => {
    try {
      const res = await fetch(`/api/user-access/user/${encodeURIComponent(updatedUser.id)}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(updatedUser),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Gagal memperbarui akun di basis data.');
      }
      const saved = data.data || updatedUser;
      setUserAccounts(prev => prev.map(u => u.id === updatedUser.id ? { ...u, ...saved } : u));
      addToast('success', 'Akun Diperbarui', `Perubahan akun "${updatedUser.username}" berhasil disimpan.`);
      return true;
    } catch (err: any) {
      addToast('warning', 'Gagal Edit Akun', err.message || 'Terjadi kesalahan saat menyimpan perubahan.');
      return false;
    }
  };

  const handleDeleteUserSingle = async (userId: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/user-access/user/${encodeURIComponent(userId)}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Gagal menghapus akun di basis data.');
      }
      setUserAccounts(prev => prev.filter(u => u.id !== userId));
      addToast('success', 'Akun Dihapus', 'Akun pengguna berhasil dihapus dari database.');
      return true;
    } catch (err: any) {
      addToast('warning', 'Gagal Hapus Akun', err.message || 'Terjadi kesalahan saat menghapus akun.');
      return false;
    }
  };

  const handleSaveRoleSingle = async (role: Role): Promise<boolean> => {
    try {
      const res = await fetch('/api/user-access/role', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(role),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Gagal menyimpan role di basis data.');
      }
      const saved = data.data || role;
      setUserRoles(prev => {
        const exists = prev.some(r => r.id === role.id);
        return exists ? prev.map(r => r.id === role.id ? saved : r) : [...prev, saved];
      });
      addToast('success', 'Role Disimpan', `Matriks izin role "${role.name}" berhasil disimpan.`);
      return true;
    } catch (err: any) {
      addToast('warning', 'Gagal Simpan Role', err.message || 'Terjadi kesalahan saat menyimpan role.');
      return false;
    }
  };

  const handleDeleteRoleSingle = async (roleId: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/user-access/role/${encodeURIComponent(roleId)}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Gagal menghapus role di basis data.');
      }
      setUserRoles(prev => prev.filter(r => r.id !== roleId));
      addToast('success', 'Role Dihapus', 'Role berhasil dihapus dari database.');
      return true;
    } catch (err: any) {
      addToast('warning', 'Gagal Hapus Role', err.message || 'Terjadi kesalahan saat menghapus role.');
      return false;
    }
  };

  // Sync users to backend MySQL / express (Bulk Fallback)
  const handleUpdateUsers = (newUsers: UserAccount[]) => {
    fetch('/api/user-access/users', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ users: newUsers }),
    })
      .then(async res => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data.message || 'Gagal menyimpan ke basis data');
        }
        return data;
      })
      .then(() => {
        setUserAccounts(newUsers);
        addToast('success', 'Data Disimpan', 'Daftar user berhasil diperbarui dan tersimpan ke MySQL.');
      })
      .catch((err) => {
        addToast('warning', 'Gagal Simpan', err.message || 'Perubahan user gagal disimpan ke backend.');
      });
  };

  // Sync roles to backend MySQL / express (Bulk Fallback)
  const handleUpdateRoles = (newRoles: Role[]) => {
    fetch('/api/user-access/roles', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ roles: newRoles }),
    })
      .then(async res => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data.message || 'Gagal menyimpan role ke basis data');
        }
        return data;
      })
      .then(() => {
        setUserRoles(newRoles);
        addToast('success', 'Data Disimpan', 'Daftar role berhasil diperbarui dan tersimpan ke MySQL.');
      })
      .catch((err) => {
        addToast('warning', 'Gagal Simpan', err.message || 'Perubahan role gagal disimpan ke backend.');
      });
  };

  // Save (Create or Update) Material from Authoring Workspace
  const handleSaveMaterial = (formData: Partial<MaterialItem>, isDraft: boolean = false) => {
    if (editingMaterial) {
      // Update Existing
      fetch(`/api/materials/${editingMaterial.id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(formData),
      })
        .then(res => {
          if (!res.ok) throw new Error('Forbidden');
          return res.json();
        })
        .then(data => {
          if (data.success) {
            setMaterials(prev => prev.map(m => m.id === editingMaterial.id ? { ...m, ...data.data } : m));
            addToast('success', isDraft ? 'Draft Disimpan' : 'Materi Diperbarui', `Modul "${formData.title}" berhasil ${isDraft ? 'disimpan sebagai draft' : 'dipublikasikan'}.`);
          }
        })
        .catch(() => {
          setMaterials(prev => prev.map(m => m.id === editingMaterial.id ? { ...m, ...formData } as MaterialItem : m));
          addToast('success', 'Materi Diperbarui', `Modul "${formData.title}" berhasil diperbarui.`);
        });
    } else {
      // Create New
      fetch('/api/materials', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(formData),
      })
        .then(res => {
          if (!res.ok) throw new Error('Forbidden');
          return res.json();
        })
        .then(data => {
          if (data.success) {
            setMaterials(prev => [data.data, ...prev]);
            addToast('success', isDraft ? 'Draft Disimpan' : 'Materi Diterbitkan', `Modul "${formData.title}" berhasil ${isDraft ? 'disimpan sebagai draft' : 'dipublikasikan ke katalog'}.`);
          }
        })
        .catch(() => {
          const newItem: MaterialItem = {
            ...formData,
            id: `mat-${Date.now()}`,
            views: 0,
            downloads: 0,
            progressPercent: 0,
            status: 'not_started',
            publishDate: new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }),
          } as MaterialItem;
          setMaterials(prev => [newItem, ...prev]);
          addToast('success', 'Materi Diterbitkan', `Modul "${formData.title}" berhasil ditambahkan.`);
        });
    }
    setIsAuthoringOpen(false);
    setEditingMaterial(null);
  };

  // Delete Material
  const handleDeleteMaterial = (id: string) => {
    const target = materials.find(m => m.id === id);
    if (!target) return;
    if (confirm(`Apakah Anda yakin ingin menghapus materi "${target.title}"?`)) {
      fetch(`/api/materials/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      })
        .then(res => {
          if (!res.ok) throw new Error('Forbidden');
          return res.json();
        })
        .then(data => {
          if (data.success) {
            setMaterials(prev => prev.filter(m => m.id !== id));
            addToast('info', 'Materi Dihapus', `Modul "${target.title}" telah dihapus.`);
            if (selectedCourseDetail?.id === id) {
              setSelectedCourseDetail(null);
            }
          }
        })
        .catch(() => {
          setMaterials(prev => prev.filter(m => m.id !== id));
          addToast('info', 'Materi Dihapus', `Modul "${target.title}" telah dihapus.`);
          if (selectedCourseDetail?.id === id) {
            setSelectedCourseDetail(null);
          }
        });
    }
  };

  // Handle Tab changes from Sidebar
  const handleSelectTab = (tab: string, typeFilter: MaterialType = 'all') => {
    if (tab === 'bantuan') {
      setShowHelpModal(true);
      return;
    }
    if (tab === 'tentang') {
      setShowAboutModal(true);
      return;
    }

    // Reset views
    setSelectedCourseDetail(null);
    setIsAuthoringOpen(false);
    setEditingMaterial(null);
    setCurrentTab(tab);

    if (typeFilter !== 'all') {
      setSelectedType(typeFilter);
    } else if (tab === 'learning' || tab === 'beranda') {
      setSelectedType('all');
      setSelectedLevel('ALL');
    }
  };

  // Bookmark toggle
  const handleToggleBookmark = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setMaterials(prev => {
      return prev.map(item => {
        if (item.id === id) {
          const nextState = !item.bookmarked;
          addToast(
            nextState ? 'success' : 'info',
            nextState ? 'Ditambahkan ke Favorit' : 'Dihapus dari Favorit',
            `Modul "${item.title}" ${nextState ? 'berhasil disimpan ke daftar favorit.' : 'telah dihapus dari daftar favorit.'}`
          );
          return { ...item, bookmarked: nextState };
        }
        return item;
      });
    });

    // Notify backend. The favourite is filed against the signed-in account, so
    // the identity headers have to ride along; an anonymous portal visitor has
    // no record to file it in and keeps the toggle in-page only.
    if (isLoggedIn) {
      fetch(`/api/materials/${id}/bookmark`, { method: 'POST', headers: getAuthHeaders() }).catch(() => {});
    }
  };

  // Open Course Detail (Learning Journey step)
  const handleOpenCourseDetail = (material: MaterialItem) => {
    setIsAuthoringOpen(false);
    setSelectedCourseDetail(material);
    setViewHistory(prev => Array.from(new Set([material.id, ...prev])));

    // Update view count. Logged-in personnel and anonymous public visitors both
    // land here, so the event carries userId only when a session is actually
    // authenticated — that split is what lets the executive dashboard tell
    // portal traffic apart from trainer-session traffic.
    setMaterials(prev => prev.map(m => m.id === material.id ? { ...m, views: m.views + 1 } : m));
    fetch('/api/learning-events/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: currentUser?.user?.id || currentUser?.id || null,
        materialId: material.id,
        eventType: 'material_view',
        details: { source: isPublicPortalMode ? 'public_portal' : 'internal_catalog' }
      })
    }).catch(() => {});
  };

  // Open Authoring Mode (Add / Edit)
  const handleOpenAuthoring = (material: MaterialItem | null = null) => {
    setSelectedCourseDetail(null);
    setEditingMaterial(material);
    setIsAuthoringOpen(true);
  };

  // Start / Continue Learning in Focus Mode
  const handleStartLearning = (material: MaterialItem) => {
    setActiveFocusMaterial(material);
    setViewHistory(prev => Array.from(new Set([material.id, ...prev])));
  };

  // Download simulation
  const handleDownload = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const item = materials.find(m => m.id === id);
    if (item) {
      setMaterials(prev => prev.map(m => m.id === id ? { ...m, downloads: (m.downloads || 0) + 1 } : m));
      addToast(
        'success',
        'Unduhan Dimulai',
        `Mengunduh berkas materi resmi POLRI: ${item.title}`
      );
      fetch(`/api/materials/${id}/download`, { method: 'POST' }).catch(() => {});
    }
  };

  const handleLogin = (userData?: { user: any; role: any }) => {
    setIsLoggedIn(true);
    sessionStorage.setItem('isLoggedIn', 'true');
    if (userData) {
      setCurrentUser(userData);
      sessionStorage.setItem('currentUser', JSON.stringify(userData));
      // Land each role on the screen it actually works from. A pimpinan opening the
      // app wants the national picture, not the learner home page.
      const roleId = userData.user?.roleId || userData.role?.id;
      if (roleId === 'role-executive' || roleId === 'role-executive-1' || roleId === 'role-executive-2' || roleId === 'role-executive-3') {
        setCurrentTab('executive');
      } else {
        setCurrentTab('beranda');
      }
    }
  };

  if (!isLoggedIn) {
    if (isInvalidRoute) {
      return (
        <div className="min-h-screen bg-[#f7f9fb] flex flex-col justify-center items-center p-4">
          <NotFoundPage
            onBackToHome={() => {
              window.history.pushState({}, '', '/');
              setIsInvalidRoute(false);
              setIsPublicPortalMode(false);
              setPublicSessionCode(null);
            }}
            onBackToPublicPortal={() => {
              window.history.pushState({}, '', '/umum');
              setIsInvalidRoute(false);
              setIsPublicPortalMode(true);
              setPublicSessionCode(null);
            }}
            isPublicMode={true}
            message="Alamat URL yang Anda tuju pada portal Dikmas Lantas POLRI tidak valid atau tidak ditemukan."
          />
        </div>
      );
    }

    if (publicSessionCode) {
      return (
        <div className="min-h-screen bg-slate-900 p-4">
          <PublicSessionView
            initialCode={publicSessionCode}
            onBackToPortal={() => {
              window.history.pushState({}, '', '/umum');
              setPublicSessionCode(null);
              setIsPublicPortalMode(true);
            }}
          />
        </div>
      );
    }

    if (isPublicPortalMode) {
      return (
        <div className="min-h-screen bg-[#f7f9fb] text-[#191c1e] p-4 sm:p-8 max-w-7xl mx-auto space-y-6">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-[#0a1d37] p-1 flex items-center justify-center">
                <img
                  src="/favicon.svg"
                  alt="POLRI"
                  className="w-6 h-6 object-contain"
                  onError={(e) => {
                    (e.target as any).style.display = 'none';
                  }}
                />
              </div>
              <div>
                <h2 className="font-black text-slate-900 text-sm tracking-tight">DIKMAS POLRI</h2>
                <p className="text-[10px] text-slate-500 font-semibold uppercase">Portal Edukasi Terbuka</p>
              </div>
            </div>
          </div>

          <PublicLearningPortal
            onOpenSessionJoin={(code) => {
              if (code) {
                window.history.pushState({}, '', `/umum/session/${encodeURIComponent(code)}`);
              }
              setPublicSessionCode(code || '');
            }}
            onOpenCourseDetail={(mat) => handleOpenCourseDetail(mat)}
          />

          {selectedCourseDetail && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
              <div className="bg-white rounded-3xl max-w-4xl w-full p-6 max-h-[90vh] overflow-y-auto">
                <CourseDetailPage
                  material={selectedCourseDetail}
                  allMaterials={materials.filter(m => m.publicAccess !== 'restricted' && m.publishStatus === 'published')}
                  onBack={() => setSelectedCourseDetail(null)}
                  onStartLearning={(mat) => setActiveFocusMaterial(mat)}
                  onToggleBookmark={handleToggleBookmark}
                  onDownload={handleDownload}
                  onOpenRelatedCourse={(rel) => handleOpenCourseDetail(rel)}
                  canEdit={false}
                  canDelete={false}
                  guestProgressOverride={readGuestMaterialProgress(selectedCourseDetail.id)}
                />
              </div>
            </div>
          )}

          {activeFocusMaterial && (
            <LearningFocusMode
              material={activeFocusMaterial}
              onExit={() => setActiveFocusMaterial(null)}
              onCompleteCourse={() => {
                addToast('success', 'Modul Selesai', `Anda telah menyelesaikan seluruh silabus ${activeFocusMaterial.title}.`);
                setActiveFocusMaterial(null);
              }}
              // Anonymous visitors have no server record: keep their reading progress
              // in this browser so a return visit shows what is already finished.
              resumeCompletedLessonIds={
                readGuestMaterialProgress(activeFocusMaterial.id)?.completedLessonIds || []
              }
              onLessonsCompletedChange={(ids, total) =>
                saveGuestLessonProgress({
                  materialId: activeFocusMaterial.id,
                  completedLessonIds: ids,
                  totalLessons: total
                })
              }
              onProgressUpdate={() => {}}
            />
          )}
        </div>
      );
    }

    return (
      <LoginPage
        onLogin={handleLogin}
        onOpenPublicPortal={() => {
          window.history.pushState({}, '', '/umum');
          setIsPublicPortalMode(true);
        }}
        onOpenPublicSession={(code) => {
          if (code) {
            window.history.pushState({}, '', `/umum/session/${encodeURIComponent(code)}`);
          }
          setPublicSessionCode(code || '');
        }}
      />
    );
  }

  return (
    <div className="bg-[#f7f9fb] text-[#191c1e] min-h-screen flex antialiased">
      {/* Side Navigation Bar */}
      <Sidebar
        currentTab={isAuthoringOpen ? 'content-management' : currentTab}
        onSelectTab={handleSelectTab}
        isOpenMobile={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
        canAccessUserManagement={canAccessUserAkses}
        canAccessContentManagement={canAccessContentManagement}
        canAccessReports={canAccessReports}
        isExecutive={isExecutive}
        canAccessExecutive={canAccessExecutiveDashboard}
        isTrainer={canAccessTrainerOutreach}
      />

      {/* Main Content Wrapper */}
      <div className="flex-1 md:ml-[260px] min-h-screen flex flex-col">
        {/* Sticky Top Header */}
        <TopHeader
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
          currentUser={currentUser}
          currentRole={activeRole}
          materials={learnerMaterials}
          onSelectMaterial={(material) => handleOpenCourseDetail(material)}
          onOpenProfile={() => handleSelectTab('profile')}
          onLogout={() => {
            setIsLoggedIn(false);
            setCurrentUser(null);
            sessionStorage.removeItem('isLoggedIn');
            sessionStorage.removeItem('currentUser');
          }}
        />

        {/* Main Content Body */}
        <main className="flex-1 mt-16 p-3 sm:p-6 md:p-10 pb-24 md:pb-12 space-y-6 sm:space-y-8 max-w-[1440px] mx-auto w-full overflow-x-hidden">
          {/* 1. CONTENT AUTHORING WORKSPACE (FULL PAGE AUTHORING) */}
          {isAuthoringOpen ? (
            <ContentAuthoringPage
              initialData={editingMaterial}
              onBack={() => {
                setIsAuthoringOpen(false);
                setEditingMaterial(null);
              }}
              onSave={handleSaveMaterial}
              isReadOnly={!canEditMaterial && !canAddMaterial}
            />
          ) : selectedCourseDetail ? (
            /* 2. COURSE DETAIL VIEW */
            <CourseDetailPage
              material={materials.find(m => m.id === selectedCourseDetail.id) || selectedCourseDetail}
              allMaterials={learnerMaterials}
              onBack={() => setSelectedCourseDetail(null)}
              onStartLearning={handleStartLearning}
              onToggleBookmark={handleToggleBookmark}
              onDownload={handleDownload}
              onOpenRelatedCourse={(rel) => handleOpenCourseDetail(rel)}
              onEdit={(m) => handleOpenAuthoring(m)}
              onDelete={(id) => handleDeleteMaterial(id)}
              canEdit={canEditMaterial}
              canDelete={canDeleteMaterial}
              reviewMode={isExecutive}
            />
          ) : currentTab === 'beranda' ? (
            /* 3. BERANDA DASHBOARD */
            <BerandaPage
              currentUser={currentUser}
              currentRole={activeRole}
              materials={learnerMaterials}
              viewHistory={viewHistory}
              onOpenMaterial={handleOpenCourseDetail}
              onSelectTab={handleSelectTab}
              onSelectLevel={setSelectedLevel}
              onToggleBookmark={handleToggleBookmark}
              canAdd={canAddMaterial}
              canEdit={canEditMaterial}
              canDelete={canDeleteMaterial}
              onAddNewMaterial={() => handleOpenAuthoring(null)}
              onEditMaterial={(m) => handleOpenAuthoring(m)}
              onDeleteMaterial={handleDeleteMaterial}
            />
          ) : currentTab === 'learning' || currentTab === 'katalog' ? (
            /* 4. LEARNING LIBRARY */
            <LearningPage
              materials={learnerMaterials}
              selectedLevel={selectedLevel}
              onSelectLevel={setSelectedLevel}
              selectedType={selectedType}
              onSelectType={setSelectedType}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              sortBy={sortBy}
              onSelectSort={setSortBy}
              onOpenCourseDetail={handleOpenCourseDetail}
              onToggleBookmark={handleToggleBookmark}
              canAdd={canAddMaterial}
              onAddNewMaterial={() => handleOpenAuthoring(null)}
              reviewMode={isExecutive}
            />
          ) : currentTab === 'my-learning' ? (
            /* 5. MY LEARNING */
            <MyLearningPage
              materials={learnerMaterials}
              viewHistory={viewHistory}
              onOpenCourseDetail={handleOpenCourseDetail}
              onStartLearning={handleStartLearning}
              onToggleBookmark={handleToggleBookmark}
              onNavigateToLearning={() => handleSelectTab('learning')}
            />
          ) : currentTab === 'progress' ? (
            /* 6. CAPAIAN & SERTIFIKAT */
            <ProgressPage
              currentUser={currentUser}
              materials={learnerMaterials}
              onOpenCourseDetail={handleOpenCourseDetail}
            />
          ) : currentTab === 'trainer-outreach' ? (
            /* TRAINER OUTREACH FIELD SESSIONS */
            canAccessTrainerOutreach ? (
              <TrainerOutreachPage
                currentUser={currentUser}
                currentRole={activeRole}
                materials={materials}
                onOpenPresentationRoom={(ses) => {
                  setActivePresentationSession(ses);
                  setCurrentTab('presentation-room');
                }}
                onOpenReportModal={(ses) => setActiveReportSession(ses)}
              />
            ) : (
              <ForbiddenPage
                onBackToHome={() => setCurrentTab(homeTab)}
                requiredMenu="Kegiatan Lapangan & Sosialisasi"
                roleName={activeRole.name}
              />
            )
          ) : currentTab === 'presentation-room' && activePresentationSession ? (
            /* PRESENTATION ROOM */
            canAccessTrainerOutreach ? (
              <PresentationRoom
                session={activePresentationSession}
                onBack={() => {
                  setActivePresentationSession(null);
                  setCurrentTab('trainer-outreach');
                }}
                onOpenReportModal={(ses) => setActiveReportSession(ses)}
                onOpenCourseMaterial={(matId) => {
                  const target = materials.find(m => m.id === matId);
                  if (target) handleOpenCourseDetail(target);
                }}
              />
            ) : (
              <ForbiddenPage
                onBackToHome={() => setCurrentTab(homeTab)}
                requiredMenu="Ruang Presentasi Lapangan"
                roleName={activeRole.name}
              />
            )
          ) : currentTab === 'public-portal' ? (
            /* PUBLIC LEARNING PORTAL — citizen-facing, not a pimpinan surface */
            isExecutive ? (
              <ForbiddenPage
                onBackToHome={() => setCurrentTab(homeTab)}
                requiredMenu="Portal Edukasi Publik"
                roleName={activeRole.name}
              />
            ) : (
              <PublicLearningPortal
                onOpenSessionJoin={(code) => {
                  setPublicSessionCode(code || '');
                  setCurrentTab('public-session');
                }}
                onOpenCourseDetail={handleOpenCourseDetail}
              />
            )
          ) : currentTab === 'public-session' ? (
            /* PUBLIC SESSION PARTICIPANT VIEW */
            <PublicSessionView
              initialCode={publicSessionCode || ''}
              onBackToPortal={() => {
                setPublicSessionCode(null);
                setCurrentTab('public-portal');
              }}
            />
          ) : currentTab === 'executive' ? (
            /* 7. EKSEKUTIF DASHBOARD */
            canAccessExecutiveDashboard ? (
              <ExecutiveDashboardPage
                materials={materials}
                authHeaders={getAuthHeaders()}
              />
            ) : (
              <ForbiddenPage
                onBackToHome={() => setCurrentTab(homeTab)}
                requiredMenu="Dashboard Eksekutif"
                roleName={activeRole.name}
              />
            )
          ) : currentTab === 'content-management' ? (
            /* 8. KELOLA KONTEN & SILABUS */
            canAccessContentManagement ? (
              <ContentManagementPage
                materials={materials}
                onAddNewMaterial={() => handleOpenAuthoring(null)}
                onEditMaterial={(m) => handleOpenAuthoring(m)}
                onDeleteMaterial={handleDeleteMaterial}
                onOpenCourseDetail={handleOpenCourseDetail}
                canAdd={canAddMaterial}
                canEdit={canEditMaterial}
                canDelete={canDeleteMaterial}
              />
            ) : (
              <ForbiddenPage
                onBackToHome={() => setCurrentTab(homeTab)}
                requiredMenu="Kelola Konten & Silabus"
                roleName={activeRole.name}
              />
            )
          ) : currentTab === 'reports' ? (
            /* 9. PUSAT LAPORAN & EKSPOR DATA */
            canAccessReports ? (
              <ReportsPage
                materials={materials}
                users={userAccounts}
                roles={userRoles}
                currentRole={activeRole}
                currentUser={currentUser}
                authHeaders={getAuthHeaders()}
              />
            ) : (
              <ForbiddenPage
                onBackToHome={() => setCurrentTab(homeTab)}
                requiredMenu="Pusat Laporan & Data Ekspor"
                roleName={activeRole.name}
              />
            )
          ) : currentTab === 'user-akses' ? (
            /* 10. USER AKSES & RBAC */
            canAccessUserAkses ? (
              <UserAccessPage
                users={userAccounts}
                roles={userRoles}
                onCreateUser={handleCreateUserSingle}
                onUpdateUser={handleUpdateUserSingle}
                onDeleteUser={handleDeleteUserSingle}
                onSaveRole={handleSaveRoleSingle}
                onDeleteRole={handleDeleteRoleSingle}
                onUpdateUsers={handleUpdateUsers}
                onUpdateRoles={handleUpdateRoles}
                materialsCount={materials.length}
              />
            ) : (
              <ForbiddenPage
                onBackToHome={() => setCurrentTab(homeTab)}
                requiredMenu="Manajemen Akses Pengguna & RBAC"
                roleName={activeRole.name}
              />
            )
          ) : currentTab === 'profile' ? (
            /* 10. PROFIL PENGGUNA */
            <ProfilePage
              currentUser={currentUser}
              currentRole={activeRole}
              onLogout={() => {
                setIsLoggedIn(false);
                setCurrentUser(null);
                sessionStorage.removeItem('isLoggedIn');
                sessionStorage.removeItem('currentUser');
              }}
              onUpdateCurrentUserFullName={(newName) => {
                setCurrentUser((prev: any) => {
                  if (!prev) return prev;
                  const updated = {
                    ...prev,
                    user: { ...prev.user, fullName: newName },
                    fullName: newName,
                  };
                  sessionStorage.setItem('currentUser', JSON.stringify(updated));
                  return updated;
                });
                addToast('success', 'Profil Diperbarui', 'Nama tampilan akun berhasil disimpan.');
              }}
            />
          ) : currentTab === 'ai-chat' ? (
            /* 11. AI CHAT GEMINI ASSISTANT */
            <AiChatPage
              currentUser={currentUser}
              currentRole={activeRole}
              authHeaders={getAuthHeaders()}
            />
          ) : (
            <LearningPage
              materials={learnerMaterials}
              selectedLevel={selectedLevel}
              onSelectLevel={setSelectedLevel}
              selectedType={selectedType}
              onSelectType={setSelectedType}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              sortBy={sortBy}
              onSelectSort={setSortBy}
              onOpenCourseDetail={handleOpenCourseDetail}
              onToggleBookmark={handleToggleBookmark}
              canAdd={canAddMaterial}
              onAddNewMaterial={() => handleOpenAuthoring(null)}
              reviewMode={isExecutive}
            />
          )}
        </main>
      </div>

      {/* FULL-SCREEN IMMERSIVE FOCUS LEARNING MODE */}
      {activeFocusMaterial && (
        <LearningFocusMode
          material={materials.find(m => m.id === activeFocusMaterial.id) || activeFocusMaterial}
          onExit={() => setActiveFocusMaterial(null)}
          reviewMode={isExecutive}
          onCompleteCourse={() => {
            if (isExecutive) {
              addToast('info', 'Peninjauan Selesai', `Seluruh silabus ${activeFocusMaterial.title} selesai ditinjau.`);
              setActiveFocusMaterial(null);
              return;
            }
            handleUpdateProgress(activeFocusMaterial.id, 100, 'completed');
            addToast('success', 'Kursus Diselesaikan', `Selamat! Anda telah menyelesaikan seluruh silabus ${activeFocusMaterial.title}.`);
            setActiveFocusMaterial(null);
          }}
          onOpenQuiz={() => {
            setActiveQuizMaterial(activeFocusMaterial);
          }}
          // A pimpinan inspecting a module is not enrolled in it — recording their
          // reading as learner progress would pollute their own capaian record.
          onProgressUpdate={(lessonId, percent) => {
            if (isExecutive) return;
            handleUpdateProgress(
              activeFocusMaterial.id,
              percent,
              percent >= 100 ? 'completed' : 'in_progress',
              lessonId
            );
          }}
        />
      )}

      {/* INTERACTIVE QUIZ EVALUATION EXPERIENCE */}
      {activeQuizMaterial && (
        <QuizExperience
          material={materials.find(m => m.id === activeQuizMaterial.id) || activeQuizMaterial}
          onExit={() => setActiveQuizMaterial(null)}
          onFinishQuiz={(score, answers) => {
            const passed = score >= 70;
            // Optimistic update
            handleUpdateProgress(activeQuizMaterial.id, passed ? 100 : 75, passed ? 'completed' : 'in_progress');

            // Persistent sync to server learning records.
            // Server re-scores from `answers` (never trusts the client score),
            // so the answer map must be sent or the attempt is graded 0.
            fetch('/api/quiz/submit', {
              method: 'POST',
              headers: getAuthHeaders(),
              body: JSON.stringify({
                materialId: activeQuizMaterial.id,
                answers,
                score,
                passingGrade: 70,
              }),
            })
              .then(res => res.json())
              .then(() => {
                // Refresh materials data
                fetch('/api/materials', { headers: getAuthHeaders() })
                  .then(r => r.json())
                  .then(data => {
                    if (data.success && Array.isArray(data.data)) {
                      setMaterials(data.data);
                    }
                  })
                  .catch(() => {});
              })
              .catch(() => {});

            if (passed) {
              addToast('success', 'Ujian Lulus & Sertifikat Terbit', `Skor Anda: ${score}%. Sertifikat kelulusan dapat diakses di menu Capaian & Sertifikat.`);
            } else {
              addToast('warning', 'Evaluasi Remedial', `Skor Anda: ${score}%. Silakan pelajari kembali modul untuk memperbarui nilai.`);
            }
            setActiveQuizMaterial(null);
          }}
        />
      )}

      {/* HELP MODAL */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-headline text-lg font-bold text-slate-900">Pusat Bantuan & Layanan POLRI</h3>
              <button
                onClick={() => setShowHelpModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>
            <div className="space-y-3 text-xs text-slate-600">
              <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
                <h4 className="font-bold text-blue-900 text-sm mb-1">Layanan Kontak Darurat 110</h4>
                <p className="text-blue-800">Hubungi layanan kepolisian bebas pulsa 24 jam untuk laporan kedaruratan atau konsultasi kamtibmas.</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <h4 className="font-bold text-slate-900 text-sm mb-1">Alur Pembelajaran & Uji Kompetensi</h4>
                <p>Pilih materi di <strong>Learning Library</strong>, buka <strong>Course Detail</strong> untuk mempelajari silabus, masuk ke <strong>Focus Learning Mode</strong>, dan selesaikan <strong>Kuis Interaktif</strong> untuk menerbitkan sertifikat resmi.</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <h4 className="font-bold text-slate-900 text-sm mb-1">Penerbitan Sertifikat Kelulusan</h4>
                <p>Setelah lulus kuis dengan nilai minimum 70%, buka menu <strong>Capaian & Sertifikat</strong> untuk mengunduh dokumen transkrip dan sertifikat digital Anda.</p>
              </div>
            </div>
            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowHelpModal(false)}
                className="bg-[#0a1d37] text-white px-5 py-2 rounded-lg text-xs font-semibold hover:bg-slate-800 cursor-pointer"
              >
                Mengerti
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ABOUT MODAL */}
      {showAboutModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-headline text-lg font-bold text-slate-900">Tentang SM-Learning Dikmas Lantas POLRI</h3>
              <button
                onClick={() => setShowAboutModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>
            <div className="space-y-3 text-xs text-slate-600">
              <p className="leading-relaxed">
                Platform <strong>SM-Learning (Safety & Moral Learning) Dikmas Lantas POLRI</strong> merupakan ekosistem pendidikan digital modern yang dirancang oleh <strong>Korlantas POLRI</strong> bersama <strong>Ditbinmas POLRI</strong> guna menanamkan pemahaman etika berlalu lintas, kesadaran hukum, dan pencegahan kenakalan remaja di seluruh jenjang pendidikan nasional.
              </p>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <div className="font-bold text-slate-800 text-xs">Informasi Versi Sistem:</div>
                <div className="text-[11px] text-slate-500">Versi: 2.5.0 Enterprise E-Learning Edition</div>
                <div className="text-[11px] text-slate-500">Arsitektur: React 19 + Express Engine + RBAC Engine</div>
              </div>
            </div>
            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowAboutModal(false)}
                className="bg-[#0a1d37] text-white px-5 py-2 rounded-lg text-xs font-semibold hover:bg-slate-800 cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* OUTREACH ACTIVITY REPORT & CLOSURE MODAL */}
      {activeReportSession && (
        <ActivityReportModal
          session={activeReportSession}
          authHeaders={getAuthHeaders()}
          onClose={() => setActiveReportSession(null)}
          onSuccess={() => {
            setActiveReportSession(null);
            addToast('success', 'Laporan Berhasil Disimpan', 'Kegiatan pemaparan telah diselesaikan dan berita acara diterbitkan.');
            // Switch to outreach tab
            setCurrentTab('trainer-outreach');
          }}
        />
      )}

      {/* Alesha AI Kiosk Virtual Assistant Modal with Live Context Awareness */}
      <AleshaKioskModal
        isOpen={isAleshaModalOpen}
        onClose={() => setIsAleshaModalOpen(false)}
        kioskUrl={(import.meta as any).env?.VITE_ALESHA_KIOSK_URL || "https://alesha.djalu.co.id/kiosk-public"}
        activeMenu={currentTab}
        selectedMaterial={activeFocusMaterial || selectedCourseDetail || activeQuizMaterial}
        currentUser={currentUser}
      />

      {/* Floating Alesha AI Kiosk Trigger Button (Icon-only with rich hover tooltip) */}
      <div className="fixed bottom-6 right-6 z-40 flex items-center group">
        {/* Hover Tooltip to the left */}
        <div className="absolute right-full mr-3.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-0 translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200 ease-out z-50">
          <div className="relative flex items-center gap-2.5 px-3.5 py-2.5 bg-slate-900/95 backdrop-blur-md text-white text-xs rounded-2xl shadow-2xl border border-indigo-500/40 whitespace-nowrap">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
            <div>
              <p className="font-extrabold text-white flex items-center gap-1.5 leading-none">
                <span>Alesha AI Kiosk</span>
                <span className="text-[9px] px-1.5 py-0.5 bg-indigo-500/30 text-indigo-300 rounded font-semibold border border-indigo-400/30">
                  Virtual Assistant
                </span>
              </p>
              <p className="text-[10px] text-indigo-200/70 mt-1">
                Interaksi Suara & Tanya Jawab Edukasi
              </p>
            </div>
            {/* Tooltip pointer arrow */}
            <div className="absolute top-1/2 -right-1.5 -translate-y-1/2 w-3 h-3 bg-slate-900 border-t border-r border-indigo-500/40 rotate-45"></div>
          </div>
        </div>

        {/* Circular Icon Button */}
        <button
          onClick={() => setIsAleshaModalOpen(true)}
          className="relative w-14 h-14 rounded-full bg-gradient-to-tr from-violet-600 via-indigo-600 to-blue-600 hover:from-violet-500 hover:to-indigo-500 text-white flex items-center justify-center shadow-2xl hover:shadow-indigo-500/50 border border-indigo-300/40 transition-all duration-300 transform hover:scale-110 active:scale-95 cursor-pointer group-hover:ring-4 group-hover:ring-indigo-500/25"
          aria-label="Alesha AI Kiosk"
        >
          {/* Glowing Ping Indicator */}
          <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 ring-2 ring-white"></span>
          </span>

          <Bot className="w-6 h-6 text-white drop-shadow-md transition-transform duration-300 group-hover:rotate-6" />
        </button>
      </div>

      {/* MOBILE BOTTOM NAVIGATION */}
      <BottomNav
        currentTab={currentTab}
        onSelectTab={handleSelectTab}
        currentRole={activeRole}
        canAccessContentManagement={canAccessContentManagement}
        canAccessReports={canAccessReports}
        isExecutive={isExecutive}
        isTrainer={canAccessTrainerOutreach}
      />

      {/* TOAST SYSTEM */}
      <Toast toasts={toasts} onDismiss={(id) => removeToast(id)} />
    </div>
  );
}
