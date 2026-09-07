import React, { useState, useMemo } from 'react';
import {
  Users,
  Plus,
  Pencil,
  Trash2,
  X,
  Check,
  Shield,
  Eye,
  FilePlus,
  FileEdit,
  Search,
  UserPlus,
  ShieldCheck,
  AlertTriangle,
  Activity,
  Layers,
  CheckCircle2,
  Server,
  Lock,
  Database,
  RefreshCw,
  KeyRound,
  Upload,
  Phone,
  Mail,
  Image as ImageIcon
} from 'lucide-react';
import {
  UserAccount,
  Role,
  MenuPermission,
  PermissionAction,
  AVAILABLE_MENUS,
  ALL_ACTIONS
} from '../types';
import { DEFAULT_34_POLDA, fetchPoldaList, fetchPolresByPolda, WilayahPoldaItem, WilayahPolresItem } from '../utils/wilayah';

interface UserAccessPageProps {
  users: UserAccount[];
  roles: Role[];
  onCreateUser?: (user: UserAccount) => Promise<boolean>;
  onUpdateUser?: (user: UserAccount) => Promise<boolean>;
  onDeleteUser?: (userId: string) => Promise<boolean>;
  onSaveRole?: (role: Role) => Promise<boolean>;
  onDeleteRole?: (roleId: string) => Promise<boolean>;
  onUpdateUsers: (users: UserAccount[]) => void;
  onUpdateRoles: (roles: Role[]) => void;
  materialsCount?: number;
}

type ActiveTab = 'overview' | 'users' | 'roles' | 'audit';

const ACTION_LABELS: Record<PermissionAction, { label: string; icon: React.ReactNode; color: string }> = {
  view: { label: 'View', icon: <Eye className="w-3 h-3" />, color: 'bg-blue-100 text-blue-700 border-blue-200' },
  add: { label: 'Add', icon: <FilePlus className="w-3 h-3" />, color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  edit: { label: 'Edit', icon: <FileEdit className="w-3 h-3" />, color: 'bg-amber-100 text-amber-700 border-amber-200' },
  delete: { label: 'Delete', icon: <Trash2 className="w-3 h-3" />, color: 'bg-red-100 text-red-700 border-red-200' },
};

export function UserAccessPage({
  users,
  roles,
  onCreateUser,
  onUpdateUser,
  onDeleteUser,
  onSaveRole,
  onDeleteRole,
  onUpdateUsers,
  onUpdateRoles,
  materialsCount = 6,
}: UserAccessPageProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // User modal state
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);
  const [poldaList, setPoldaList] = useState<WilayahPoldaItem[]>([]);
  const [polresList, setPolresList] = useState<WilayahPolresItem[]>([]);
  const [userForm, setUserForm] = useState({
    username: '',
    password: '',
    fullName: '',
    phone: '',
    email: '',
    photoUrl: '',
    roleId: '',
    isActive: true,
    nip: '',
    position: '',
    unit: '',
    polda: '',
    polres: ''
  });
  const [isUploadingUserPhoto, setIsUploadingUserPhoto] = useState(false);

  // Load daftar polda dari DB
  React.useEffect(() => {
    fetchPoldaList().then(list => {
      const active = list.filter(p => p.isWilayah);
      setPoldaList(active);
    });
  }, []);

  // Load polres saat userForm.polda berubah
  React.useEffect(() => {
    if (!userForm.polda) {
      setPolresList([]);
      return;
    }
    fetchPolresByPolda(userForm.polda).then(list => {
      setPolresList(list);
    });
  }, [userForm.polda]);

  // Role modal state
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [roleForm, setRoleForm] = useState({
    name: '',
    description: '',
    permissions: [] as MenuPermission[]
  });

  // Delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'user' | 'role'; id: string; name: string } | null>(null);

  // System Audit Logs (in-session tracked)
  const [auditLogs, setAuditLogs] = useState<Array<{ id: string; time: string; actor: string; action: string; target: string }>>([
    { id: '1', time: 'Hari ini, 10:45', actor: 'Super Admin', action: 'Update Role Matrix', target: 'Role Trainer' },
    { id: '2', time: 'Hari ini, 09:30', actor: 'Super Admin', action: 'Verify Data Store', target: 'materials.json & user-data.json' },
    { id: '3', time: 'Kemarin, 16:15', actor: 'System', action: 'Sync Permissions', target: 'RBAC Policy Table' },
  ]);

  const getRoleName = (roleId: string) => roles.find(r => r.id === roleId)?.name || 'Unknown Role';

  // System Calculations
  const totalUsers = users.length;
  const activeUsersCount = users.filter(u => u.isActive).length;
  const totalRoles = roles.length;

  const handleToggleUserStatus = async (user: UserAccount) => {
    const updatedUser: UserAccount = {
      ...user,
      isActive: !user.isActive
    };
    setIsSubmitting(true);
    try {
      if (onUpdateUser) {
        await onUpdateUser(updatedUser);
      } else {
        onUpdateUsers(users.map(u => u.id === user.id ? updatedUser : u));
      }
      setAuditLogs(prev => [
        {
          id: String(Date.now()),
          time: 'Baru saja',
          actor: 'Admin',
          action: user.isActive ? 'Nonaktifkan Akun' : 'Aktivasi / Setujui Akun',
          target: user.username
        },
        ...prev
      ]);
    } finally {
      setIsSubmitting(false);
    }
  };
  const openCreateUser = () => {
    setEditingUser(null);
    setUserForm({
      username: '',
      password: '',
      fullName: '',
      phone: '',
      email: '',
      photoUrl: '',
      roleId: roles[0]?.id || 'role-trainer',
      isActive: true,
      nip: '',
      position: '',
      unit: '',
      polda: '',
      polres: ''
    });
    setShowUserModal(true);
  };

  const openEditUser = (user: UserAccount) => {
    setEditingUser(user);
    setUserForm({
      username: user.username,
      password: '',
      fullName: user.fullName,
      phone: user.phone || '',
      email: user.email || '',
      photoUrl: user.photoUrl || '',
      roleId: user.roleId,
      isActive: user.isActive,
      nip: user.nip || '',
      position: user.position || '',
      unit: user.unit || '',
      polda: user.polda || '',
      polres: user.polres || ''
    });
    setShowUserModal(true);
  };

  const handleUserPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    if (file.size > 5 * 1024 * 1024) {
      alert('Ukuran foto maksimal 5 MB.');
      return;
    }
    setIsUploadingUserPhoto(true);
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      fetch('/api/outreach/evidence/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: base64,
          filename: file.name
        })
      })
        .then(r => r.json())
        .then(d => {
          if (d.success && d.url) {
            setUserForm(prev => ({ ...prev, photoUrl: d.url }));
          } else {
            setUserForm(prev => ({ ...prev, photoUrl: base64 }));
          }
        })
        .catch(() => {
          setUserForm(prev => ({ ...prev, photoUrl: base64 }));
        })
        .finally(() => setIsUploadingUserPhoto(false));
    };
    reader.readAsDataURL(file);
  };

  const handleSaveUser = async () => {
    const trimmedUsername = userForm.username.trim();
    const trimmedFullName = userForm.fullName.trim();
    if (!trimmedUsername || !trimmedFullName || !userForm.roleId) return;
    if (!editingUser && !userForm.password.trim()) return;

    // Check duplicate username
    if (!editingUser) {
      const isDuplicate = users.some(u => u.username.toLowerCase() === trimmedUsername.toLowerCase());
      if (isDuplicate) {
        alert(`Username "${trimmedUsername}" sudah digunakan. Silakan gunakan username lain.`);
        return;
      }
    } else {
      const isDuplicate = users.some(u => u.id !== editingUser.id && u.username.toLowerCase() === trimmedUsername.toLowerCase());
      if (isDuplicate) {
        alert(`Username "${trimmedUsername}" sudah digunakan oleh akun lain.`);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const selectedPoldaObj = poldaList.find(p => p.nama === userForm.polda);
      const selectedPolresObj = polresList.find(p => p.nama === userForm.polres);

      if (editingUser) {
        const payload: UserAccount = {
          ...editingUser,
          username: trimmedUsername,
          fullName: trimmedFullName,
          phone: userForm.phone.trim() || undefined,
          email: userForm.email.trim() || undefined,
          photoUrl: userForm.photoUrl || undefined,
          nip: userForm.nip.trim() || undefined,
          roleId: userForm.roleId,
          isActive: userForm.isActive,
          position: userForm.position?.trim() || undefined,
          unit: userForm.unit?.trim() || undefined,
          poldaId: selectedPoldaObj?.poldaId || editingUser.poldaId,
          polresId: selectedPolresObj?.polresId || editingUser.polresId,
          polda: userForm.polda || undefined,
          polres: userForm.polres || undefined,
          ...(userForm.password.trim() ? { password: userForm.password.trim() } : {}),
        };

        if (onUpdateUser) {
          const success = await onUpdateUser(payload);
          if (!success) return;
        } else {
          onUpdateUsers(users.map(u => u.id === editingUser.id ? payload : u));
        }

        // Add audit log
        setAuditLogs(prev => [
          {
            id: String(Date.now()),
            time: 'Baru saja',
            actor: 'Admin',
            action: 'Update User',
            target: trimmedUsername
          },
          ...prev
        ]);
      } else {
        const newUser: UserAccount = {
          id: `user-${Date.now()}`,
          username: trimmedUsername,
          password: userForm.password.trim(),
          fullName: trimmedFullName,
          phone: userForm.phone.trim() || undefined,
          email: userForm.email.trim() || undefined,
          photoUrl: userForm.photoUrl || undefined,
          nip: userForm.nip.trim() || undefined,
          roleId: userForm.roleId,
          isActive: userForm.isActive,
          position: userForm.position?.trim() || undefined,
          unit: userForm.unit?.trim() || undefined,
          poldaId: selectedPoldaObj?.poldaId || undefined,
          polresId: selectedPolresObj?.polresId || undefined,
          polda: userForm.polda || undefined,
          polres: userForm.polres || undefined,
          createdAt: new Date().toISOString().slice(0, 10),
        };

        if (onCreateUser) {
          const success = await onCreateUser(newUser);
          if (!success) return;
        } else {
          onUpdateUsers([...users, newUser]);
        }

        // Add audit log
        setAuditLogs(prev => [
          {
            id: String(Date.now()),
            time: 'Baru saja',
            actor: 'Admin',
            action: 'Create User',
            target: trimmedUsername
          },
          ...prev
        ]);
      }
      setShowUserModal(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async (id: string) => {
    const target = users.find(u => u.id === id);
    if (onDeleteUser) {
      const success = await onDeleteUser(id);
      if (!success) return;
    } else {
      onUpdateUsers(users.filter(u => u.id !== id));
    }
    if (target) {
      setAuditLogs(prev => [
        {
          id: String(Date.now()),
          time: 'Baru saja',
          actor: 'Admin',
          action: 'Delete User',
          target: target.username
        },
        ...prev
      ]);
    }
    setDeleteConfirm(null);
  };

  // === ROLE CRUD ===
  const openCreateRole = () => {
    setEditingRole(null);
    setRoleForm({
      name: '',
      description: '',
      permissions: AVAILABLE_MENUS.map(m => ({ menuId: m.id, menuLabel: m.label, actions: [] })),
    });
    setShowRoleModal(true);
  };

  const openEditRole = (role: Role) => {
    setEditingRole(role);
    const perms = AVAILABLE_MENUS.map(m => {
      const existing = role.permissions.find(p => p.menuId === m.id);
      return existing ? { ...existing } : { menuId: m.id, menuLabel: m.label, actions: [] as PermissionAction[] };
    });
    setRoleForm({ name: role.name, description: role.description, permissions: perms });
    setShowRoleModal(true);
  };

  const togglePermAction = (menuId: string, action: PermissionAction) => {
    setRoleForm(prev => ({
      ...prev,
      permissions: prev.permissions.map(p => {
        if (p.menuId !== menuId) return p;
        const has = p.actions.includes(action);
        return { ...p, actions: has ? p.actions.filter(a => a !== action) : [...p.actions, action] };
      }),
    }));
  };

  const toggleAllActionsForMenu = (menuId: string) => {
    setRoleForm(prev => ({
      ...prev,
      permissions: prev.permissions.map(p => {
        if (p.menuId !== menuId) return p;
        const allChecked = ALL_ACTIONS.every(a => p.actions.includes(a));
        return { ...p, actions: allChecked ? [] : [...ALL_ACTIONS] };
      }),
    }));
  };

  const handleSaveRole = async () => {
    if (!roleForm.name.trim()) return;

    setIsSubmitting(true);
    try {
      if (editingRole) {
        const payload: Role = {
          ...editingRole,
          name: roleForm.name.trim(),
          description: roleForm.description?.trim() || '',
          permissions: roleForm.permissions.filter(p => p.actions.length > 0),
        };

        if (onSaveRole) {
          const success = await onSaveRole(payload);
          if (!success) return;
        } else {
          onUpdateRoles(roles.map(r => r.id === editingRole.id ? payload : r));
        }

        setAuditLogs(prev => [
          {
            id: String(Date.now()),
            time: 'Baru saja',
            actor: 'Admin',
            action: 'Update Role Permissions',
            target: roleForm.name
          },
          ...prev
        ]);
      } else {
        const newRole: Role = {
          id: `role-${Date.now()}`,
          name: roleForm.name.trim(),
          description: roleForm.description?.trim() || '',
          permissions: roleForm.permissions.filter(p => p.actions.length > 0),
        };

        if (onSaveRole) {
          const success = await onSaveRole(newRole);
          if (!success) return;
        } else {
          onUpdateRoles([...roles, newRole]);
        }

        setAuditLogs(prev => [
          {
            id: String(Date.now()),
            time: 'Baru saja',
            actor: 'Admin',
            action: 'Create Role',
            target: roleForm.name
          },
          ...prev
        ]);
      }
      setShowRoleModal(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteRole = async (id: string) => {
    const usersWithRole = users.filter(u => u.roleId === id);
    if (usersWithRole.length > 0) {
      alert('Tidak dapat menghapus role yang sedang digunakan oleh akun pengguna.');
      return;
    }
    const target = roles.find(r => r.id === id);
    if (onDeleteRole) {
      const success = await onDeleteRole(id);
      if (!success) return;
    } else {
      onUpdateRoles(roles.filter(r => r.id !== id));
    }
    if (target) {
      setAuditLogs(prev => [
        {
          id: String(Date.now()),
          time: 'Baru saja',
          actor: 'Admin',
          action: 'Delete Role',
          target: target.name
        },
        ...prev
      ]);
    }
    setDeleteConfirm(null);
  };

  // Filtered Users
  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const matchRole = roleFilter === 'ALL' || u.roleId === roleFilter;
      const matchSearch =
        !searchQuery.trim() ||
        u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        getRoleName(u.roleId).toLowerCase().includes(searchQuery.toLowerCase());
      return matchRole && matchSearch;
    });
  }, [users, roleFilter, searchQuery]);

  return (
    <div className="space-y-8 pb-20 max-w-6xl mx-auto font-sans">
      {/* 1. ADMIN WORKSPACE HEADER */}
      <section className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-800 text-xs font-bold">
              <Server className="w-3.5 h-3.5 text-blue-900" />
              <span>Admin Workspace & System Control</span>
            </div>
            <h1 className="font-headline text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Manajemen Sistem, User & Hak Akses
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Pusat tata kelola platform E-Learning Dikmas Lantas POLRI untuk mengontrol integritas akun personil, konfigurasi matriks peran RBAC, dan pemantauan aktivitas audit sistem.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={openCreateUser}
              className="bg-[#0a1d37] hover:bg-[#162c4e] text-white px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-all cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>+ Tambah Akun User</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 mt-6 border-t border-slate-100 pt-4 overflow-x-auto">
          {[
            { id: 'overview', label: 'Ringkasan Sistem', icon: Activity },
            { id: 'users', label: 'Daftar Pengguna', count: totalUsers, icon: Users },
            { id: 'roles', label: 'Role & Matriks RBAC', count: totalRoles, icon: Shield },
            { id: 'audit', label: 'Log Aktivitas Sistem', count: auditLogs.length, icon: Database },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as ActiveTab)}
                className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
                  isActive
                    ? 'bg-[#0a1d37] text-white shadow-xs'
                    : 'bg-slate-50 border border-slate-200/80 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                    isActive ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* === TAB 1: SYSTEM OVERVIEW === */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Status Tiles */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-800 flex items-center justify-center shrink-0 border border-blue-100">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[11px] text-slate-500 font-semibold uppercase">Total User Terdaftar</p>
                <p className="text-xl font-extrabold text-slate-900 mt-0.5">{totalUsers}</p>
                <p className="text-[10px] text-emerald-600 font-bold mt-0.5">{activeUsersCount} Akun Aktif</p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-700 flex items-center justify-center shrink-0 border border-purple-100">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[11px] text-slate-500 font-semibold uppercase">Struktur Role RBAC</p>
                <p className="text-xl font-extrabold text-slate-900 mt-0.5">{totalRoles} Peran</p>
                <p className="text-[10px] text-slate-400 font-medium mt-0.5">Admin, Trainer, Executive</p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-100">
                <Layers className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[11px] text-slate-500 font-semibold uppercase">Katalog Kurikulum</p>
                <p className="text-xl font-extrabold text-slate-900 mt-0.5">{materialsCount} Modul</p>
                <p className="text-[10px] text-emerald-600 font-bold mt-0.5">Tersinkronisasi REST API</p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0 border border-amber-100">
                <Server className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[11px] text-slate-500 font-semibold uppercase">Status Penyimpanan</p>
                <p className="text-xl font-extrabold text-slate-900 mt-0.5">JSON Sync</p>
                <p className="text-[10px] text-slate-500 font-medium mt-0.5">data/user-data.json</p>
              </div>
            </div>
          </div>

          {/* Quick Management Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-600" />
                  <span>Ringkasan Pengguna per Role</span>
                </h3>
                <button
                  onClick={() => setActiveTab('users')}
                  className="text-xs font-bold text-blue-600 hover:underline cursor-pointer"
                >
                  Kelola User →
                </button>
              </div>

              <div className="space-y-3">
                {roles.map(r => {
                  const count = users.filter(u => u.roleId === r.id).length;
                  return (
                    <div key={r.id} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100 text-xs">
                      <div>
                        <p className="font-bold text-slate-900">{r.name}</p>
                        <p className="text-[11px] text-slate-500 line-clamp-1">{r.description}</p>
                      </div>
                      <span className="px-2.5 py-1 rounded-lg bg-[#0a1d37] text-white font-extrabold text-xs">
                        {count} Akun
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <Database className="w-4 h-4 text-purple-600" />
                  <span>Aktivitas Sistem Terkini</span>
                </h3>
                <button
                  onClick={() => setActiveTab('audit')}
                  className="text-xs font-bold text-purple-600 hover:underline cursor-pointer"
                >
                  Lihat Semua Log →
                </button>
              </div>

              <div className="space-y-3">
                {auditLogs.slice(0, 3).map((log) => (
                  <div key={log.id} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100 text-xs">
                    <div>
                      <span className="font-bold text-slate-900">{log.action}</span>
                      <span className="text-slate-500 block text-[11px] mt-0.5">Target: {log.target}</span>
                    </div>
                    <span className="text-[10px] font-semibold text-slate-400">{log.time}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* === TAB 2: USERS LIST & MANAGEMENT === */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 overflow-hidden shadow-xs space-y-4 p-6">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-2 border-b border-slate-100">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="relative w-full sm:w-72">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari user, nama, atau role..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-xl px-3 py-2 font-bold focus:ring-2 focus:ring-blue-600 cursor-pointer"
              >
                <option value="ALL">Semua Role</option>
                {roles.map(r => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>

            <button
              onClick={openCreateUser}
              className="bg-[#0a1d37] hover:bg-[#162c4e] text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Tambah User</span>
            </button>
          </div>

          {/* Users Table & Mobile Card View */}
          <div className="md:hidden divide-y divide-slate-100">
            {filteredUsers.map((user) => (
              <div key={`mob-user-${user.id}`} className="py-3.5 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-bold text-sm text-slate-900">{user.fullName}</p>
                    <p className="text-xs text-slate-500 font-mono">@{user.username}</p>
                  </div>
                  <button
                    onClick={() => handleToggleUserStatus(user)}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer ${
                      user.isActive
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-amber-50 text-amber-800 border border-amber-300 animate-pulse'
                    }`}
                  >
                    {user.isActive ? 'Aktif' : 'Menunggu ACC / Nonaktif'}
                  </button>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                  <span className="px-2.5 py-0.5 rounded text-[10px] font-extrabold bg-[#0a1d37] text-white">
                    {getRoleName(user.roleId)}
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {user.createdAt || '2026-01-01'}
                  </span>
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    onClick={() => openEditUser(user)}
                    className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 text-xs font-semibold hover:bg-blue-100 flex items-center gap-1 cursor-pointer"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={() => setDeleteConfirm({ type: 'user', id: user.id, name: user.fullName })}
                    className="px-3 py-1.5 rounded-lg bg-red-50 text-red-700 text-xs font-semibold hover:bg-red-100 flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hapus</span>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Users Table (Desktop) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[10px] font-bold">
                <tr>
                  <th className="px-4 py-3">Nama & Username</th>
                  <th className="px-4 py-3">Role Akses</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Terdaftar Sejak</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3.5">
                      <p className="font-bold text-slate-900">{user.fullName}</p>
                      <p className="text-[11px] text-slate-500 font-mono">@{user.username}</p>
                      {(user.position || user.unit || user.polda) && (
                        <p className="text-[10px] text-blue-700 font-medium mt-0.5">
                          {[user.position, user.unit, user.polres || user.polda].filter(Boolean).join(' • ')}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="px-2.5 py-0.5 rounded text-[10px] font-extrabold bg-[#0a1d37] text-white">
                        {getRoleName(user.roleId)}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <button
                        onClick={() => handleToggleUserStatus(user)}
                        title={user.isActive ? 'Klik untuk nonaktifkan akun' : 'Klik untuk menyetujui / aktifkan akun'}
                        className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold cursor-pointer transition flex items-center gap-1 ${
                          user.isActive
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-red-50 hover:text-red-700 hover:border-red-200'
                            : 'bg-amber-50 text-amber-800 border border-amber-300 hover:bg-emerald-100 hover:text-emerald-800 animate-pulse'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${user.isActive ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                        <span>{user.isActive ? 'Aktif' : 'Menunggu ACC / Nonaktif'}</span>
                      </button>
                    </td>
                    <td className="px-4 py-3.5 text-slate-500">
                      {user.createdAt || '2026-01-01'}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEditUser(user)}
                          className="p-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors cursor-pointer"
                          title="Edit User"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm({ type: 'user', id: user.id, name: user.fullName })}
                          className="p-1.5 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 transition-colors cursor-pointer"
                          title="Hapus User"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* === TAB 3: ROLES & RBAC MATRIX === */}
      {activeTab === 'roles' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500">
              Konfigurasi kewenangan izin per menu (View, Add, Edit, Delete) yang mengatur fungsi UI dan proteksi akses peran.
            </p>
            <button
              onClick={openCreateRole}
              className="bg-[#0a1d37] hover:bg-[#162c4e] text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Role Baru</span>
            </button>
          </div>

          <div className="grid grid-cols-1 gap-6">
            {roles.map((role) => (
              <div key={role.id} className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-100">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-base text-slate-900">{role.name}</span>
                      <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                        {role.id}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">{role.description}</p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => openEditRole(role)}
                      className="px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      <span>Edit Matriks</span>
                    </button>
                    {role.id !== 'role-admin' && (
                      <button
                        onClick={() => setDeleteConfirm({ type: 'role', id: role.id, name: role.name })}
                        className="p-1.5 rounded-xl bg-red-50 text-red-700 hover:bg-red-100 transition-colors cursor-pointer"
                        title="Hapus Role"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Role Permissions Matrix Preview */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 uppercase text-[9px] font-bold">
                      <tr>
                        <th className="px-3 py-2">Menu Layanan</th>
                        <th className="px-3 py-2 text-center">View (Lihat)</th>
                        <th className="px-3 py-2 text-center">Add (Tambah)</th>
                        <th className="px-3 py-2 text-center">Edit (Ubah)</th>
                        <th className="px-3 py-2 text-center">Delete (Hapus)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {AVAILABLE_MENUS.map((menu) => {
                        const perm = role.permissions.find(p => p.menuId === menu.id);
                        return (
                          <tr key={menu.id}>
                            <td className="px-3 py-2 font-medium text-slate-800">{menu.label}</td>
                            <td className="px-3 py-2 text-center">
                              {perm?.actions.includes('view') ? (
                                <Check className="w-4 h-4 text-emerald-600 mx-auto" />
                              ) : (
                                <span className="text-slate-300">-</span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-center">
                              {perm?.actions.includes('add') ? (
                                <Check className="w-4 h-4 text-emerald-600 mx-auto" />
                              ) : (
                                <span className="text-slate-300">-</span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-center">
                              {perm?.actions.includes('edit') ? (
                                <Check className="w-4 h-4 text-emerald-600 mx-auto" />
                              ) : (
                                <span className="text-slate-300">-</span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-center">
                              {perm?.actions.includes('delete') ? (
                                <Check className="w-4 h-4 text-emerald-600 mx-auto" />
                              ) : (
                                <span className="text-slate-300">-</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* === TAB 4: AUDIT LOGS === */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-sm text-slate-900">Rekam Jejak Aktivitas Tata Kelola Sistem</h3>
              <p className="text-xs text-slate-500 mt-0.5">Audit log perubahan akun, role, dan konfigurasi hak akses SM-Learning.</p>
            </div>
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-slate-100 text-slate-700">
              {auditLogs.length} Aktivitas
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-bold">
                <tr>
                  <th className="px-4 py-3">Waktu</th>
                  <th className="px-4 py-3">Pelaksana (Actor)</th>
                  <th className="px-4 py-3">Aksi Perubahan</th>
                  <th className="px-4 py-3">Sasaran (Target)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3 text-slate-500">{log.time}</td>
                    <td className="px-4 py-3 font-bold text-slate-900">{log.actor}</td>
                    <td className="px-4 py-3 font-semibold text-blue-700">{log.action}</td>
                    <td className="px-4 py-3 font-mono text-slate-700">{log.target}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* USER EDIT / CREATE MODAL */}
      {showUserModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900">
                {editingUser ? 'Edit Akun Pengguna' : 'Tambah Akun Pengguna Baru'}
              </h3>
              <button onClick={() => setShowUserModal(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Nama Lengkap</label>
                <input
                  type="text"
                  value={userForm.fullName}
                  onChange={e => setUserForm({ ...userForm, fullName: e.target.value })}
                  placeholder="e.g. Bripda Ahmad Fauzi"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Username Login</label>
                <input
                  type="text"
                  value={userForm.username}
                  onChange={e => setUserForm({ ...userForm, username: e.target.value })}
                  placeholder="e.g. ahmad.fauzi"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Password {editingUser && '(Kosongkan jika tidak ingin mengubah)'}
                </label>
                <input
                  type="password"
                  value={userForm.password}
                  onChange={e => setUserForm({ ...userForm, password: e.target.value })}
                  placeholder={editingUser ? '••••••••' : 'Password login baru'}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Role & Wewenang</label>
                <select
                  value={userForm.roleId}
                  onChange={e => setUserForm({ ...userForm, roleId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold focus:ring-2 focus:ring-blue-600 focus:outline-none cursor-pointer"
                >
                  {roles.map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>

              {/* Kontak & Foto Profil */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1 text-[11px]">No. Telp / WA</label>
                  <input
                    type="text"
                    value={userForm.phone}
                    onChange={e => setUserForm({ ...userForm, phone: e.target.value })}
                    placeholder="08xxxxxxxxxx"
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-blue-600 focus:outline-none text-xs"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1 text-[11px]">Email</label>
                  <input
                    type="email"
                    value={userForm.email}
                    onChange={e => setUserForm({ ...userForm, email: e.target.value })}
                    placeholder="nama@polri.go.id"
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-blue-600 focus:outline-none text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1 text-[11px]">Foto Profil</label>
                <div className="flex items-center gap-2">
                  <label className="cursor-pointer inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-dashed border-blue-300 bg-blue-50 hover:bg-blue-100 text-blue-700 text-[11px] font-bold">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{isUploadingUserPhoto ? 'Upload...' : 'Pilih Foto'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleUserPhotoUpload}
                      disabled={isUploadingUserPhoto}
                      className="hidden"
                    />
                  </label>
                  {userForm.photoUrl && (
                    <div className="relative w-8 h-8 rounded-lg overflow-hidden border border-slate-200">
                      <img src={userForm.photoUrl} alt="Foto" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setUserForm({ ...userForm, photoUrl: '' })}
                        className="absolute top-0 right-0 bg-red-600 text-white p-0.5 rounded"
                      >
                        <X className="w-2 h-2" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Informasi Kedinasan (Jabatan, Satuan, Wilayah) */}
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Informasi Kedinasan (Opsional)
                </span>
                <div>
                  <label className="font-bold text-slate-700 block mb-1 text-[11px]">NRP / NIP</label>
                  <input
                    type="text"
                    value={userForm.nip}
                    onChange={e => setUserForm({ ...userForm, nip: e.target.value })}
                    placeholder="e.g. 19840212 200801 1 002"
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-blue-600 focus:outline-none text-xs"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1 text-[11px]">Pangkat / Jabatan</label>
                    <input
                      type="text"
                      value={userForm.position}
                      onChange={e => setUserForm({ ...userForm, position: e.target.value })}
                      placeholder="e.g. Kanit Dikyasa"
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-blue-600 focus:outline-none text-xs"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1 text-[11px]">Satuan / Unit</label>
                    <input
                      type="text"
                      value={userForm.unit}
                      onChange={e => setUserForm({ ...userForm, unit: e.target.value })}
                      placeholder="e.g. Satlantas"
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-blue-600 focus:outline-none text-xs"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1 text-[11px]">Provinsi</label>
                    <select
                      value={userForm.polda}
                      onChange={e => {
                        const polda = e.target.value;
                        setUserForm({ ...userForm, polda, polres: '' });
                      }}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-blue-600 focus:outline-none text-xs cursor-pointer"
                    >
                      <option value="">Pilih Provinsi</option>
                      {(poldaList.length > 0 ? poldaList.map(p => p.nama) : DEFAULT_34_POLDA).map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1 text-[11px]">Kota / Kabupaten</label>
                    <select
                      value={userForm.polres}
                      onChange={e => setUserForm({ ...userForm, polres: e.target.value })}
                      disabled={!userForm.polda}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 disabled:opacity-50 focus:ring-2 focus:ring-blue-600 focus:outline-none text-xs cursor-pointer"
                    >
                      <option value="">Pilih Kota / Kabupaten</option>
                      {polresList.map(p => (
                        <option key={`${p.poldaId}-${p.polresId}`} value={p.nama}>{p.nama}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="isActiveToggle"
                  checked={userForm.isActive}
                  onChange={e => setUserForm({ ...userForm, isActive: e.target.checked })}
                  className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                />
                <label htmlFor="isActiveToggle" className="font-semibold text-slate-700 cursor-pointer">
                  Status Akun Aktif (Dapat Login)
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
              <button
                onClick={() => setShowUserModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleSaveUser}
                disabled={isSubmitting}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-[#0a1d37] hover:bg-[#162c4e] disabled:opacity-50 transition-colors cursor-pointer shadow-xs"
              >
                {isSubmitting ? 'Menyimpan...' : 'Simpan Akun'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ROLE EDIT / CREATE MODAL WITH PERMISSION MATRIX */}
      {showRoleModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
              <h3 className="font-bold text-base text-slate-900">
                {editingRole ? `Konfigurasi Matriks RBAC: ${editingRole.name}` : 'Tambah Role Baru'}
              </h3>
              <button onClick={() => setShowRoleModal(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 overflow-y-auto flex-1 pr-1 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Nama Role</label>
                  <input
                    type="text"
                    value={roleForm.name}
                    onChange={e => setRoleForm({ ...roleForm, name: e.target.value })}
                    placeholder="e.g. Instruktur Wilayah"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Deskripsi Wewenang</label>
                  <input
                    type="text"
                    value={roleForm.description}
                    onChange={e => setRoleForm({ ...roleForm, description: e.target.value })}
                    placeholder="e.g. Akses penyusunan silabus kurikulum daerah"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-800 block mb-2">Matriks Izin Menu (Action Matrix)</label>
                <div className="border border-slate-200 rounded-2xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[9px] font-bold">
                      <tr>
                        <th className="px-4 py-2.5">Menu</th>
                        {ALL_ACTIONS.map(a => (
                          <th key={a} className="px-3 py-2.5 text-center uppercase">{a}</th>
                        ))}
                        <th className="px-3 py-2.5 text-center">Toggle</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {roleForm.permissions.map(perm => (
                        <tr key={perm.menuId} className="hover:bg-slate-50/50">
                          <td className="px-4 py-2 font-medium text-slate-900">{perm.menuLabel}</td>
                          {ALL_ACTIONS.map(action => {
                            const isChecked = perm.actions.includes(action);
                            return (
                              <td key={action} className="px-3 py-2 text-center">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => togglePermAction(perm.menuId, action)}
                                  className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                                />
                              </td>
                            );
                          })}
                          <td className="px-3 py-2 text-center">
                            <button
                              type="button"
                              onClick={() => toggleAllActionsForMenu(perm.menuId)}
                              className="text-[10px] font-bold text-blue-600 hover:underline cursor-pointer"
                            >
                              Semua
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 shrink-0">
              <button
                onClick={() => setShowRoleModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleSaveRole}
                disabled={isSubmitting}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-[#0a1d37] hover:bg-[#162c4e] disabled:opacity-50 transition-colors cursor-pointer shadow-xs"
              >
                {isSubmitting ? 'Menyimpan...' : 'Simpan Matriks Role'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION DIALOG */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="font-bold text-sm text-slate-900">
                Hapus {deleteConfirm.type === 'user' ? 'Akun Pengguna' : 'Role'}?
              </h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Anda akan menghapus <strong>"{deleteConfirm.name}"</strong> secara permanen dari sistem tata kelola SM-Learning.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={() => {
                  if (deleteConfirm.type === 'user') {
                    handleDeleteUser(deleteConfirm.id);
                  } else {
                    handleDeleteRole(deleteConfirm.id);
                  }
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 transition-colors cursor-pointer shadow-xs"
              >
                Hapus Permanen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
