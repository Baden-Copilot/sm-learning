import React, { useState, useEffect, useMemo } from 'react';
import {
  Building2,
  Plus,
  Search,
  X,
  Trash2,
  Edit2,
  Copy,
  Check,
  CheckCircle2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Filter,
  Layers,
  SearchX,
  AlertCircle
} from 'lucide-react';

export type MasterKedinasanType = 'instansi' | 'organisasi' | 'sub_organisasi' | 'satker';

export interface MasterKedinasanItem {
  id: string;
  nama: string;
  instansiId?: string;
  organisasiId?: string;
  subOrgId?: string;
}

interface MasterKedinasanManagementProps {
  isAdmin?: boolean;
}

const TAB_CONFIG: Array<{
  type: MasterKedinasanType;
  label: string;
  fullDesc: string;
  parentLabel?: string;
}> = [
  {
    type: 'instansi',
    label: 'Instansi',
    fullDesc: 'Kementerian & Lembaga Negara',
  },
  {
    type: 'organisasi',
    label: 'Organisasi',
    fullDesc: 'Ditjen / Deputi / Korps',
    parentLabel: 'Instansi',
  },
  {
    type: 'sub_organisasi',
    label: 'Sub-Organisasi',
    fullDesc: 'Kanwil / Dit / Biro',
    parentLabel: 'Organisasi',
  },
  {
    type: 'satker',
    label: 'Satker',
    fullDesc: 'Satuan Kerja Lapangan',
    parentLabel: 'Sub-Organisasi',
  },
];

export const MasterKedinasanManagement: React.FC<MasterKedinasanManagementProps> = ({
  isAdmin = true,
}) => {
  const [activeType, setActiveType] = useState<MasterKedinasanType>('instansi');
  const [masterList, setMasterList] = useState<MasterKedinasanItem[]>([]);
  const [parentOptions, setParentOptions] = useState<Array<{ id: string; nama: string }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [counts, setCounts] = useState<Record<MasterKedinasanType, number>>({
    instansi: 0,
    organisasi: 0,
    sub_organisasi: 0,
    satker: 0,
  });

  // Filter & Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedParentFilter, setSelectedParentFilter] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({ id: '', nama: '', parentId: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete Confirmation State
  const [deleteConfirm, setDeleteConfirm] = useState<{
    type: 'single' | 'bulk';
    id?: string;
    name?: string;
    count?: number;
  } | null>(null);

  // Toast Alert Notification
  const [alertMsg, setAlertMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showAlert = (type: 'success' | 'error', text: string) => {
    setAlertMsg({ type, text });
    setTimeout(() => setAlertMsg(null), 4000);
  };

  // Fetch count badges for all tabs
  const fetchCounts = async () => {
    try {
      const [resIns, resOrg, resSub, resSat] = await Promise.all([
        fetch('/api/master-kedinasan/instansi').then(r => r.json()),
        fetch('/api/master-kedinasan/organisasi').then(r => r.json()),
        fetch('/api/master-kedinasan/sub-org').then(r => r.json()),
        fetch('/api/master-kedinasan/satker').then(r => r.json()),
      ]);
      setCounts({
        instansi: resIns?.data?.length || 0,
        organisasi: resOrg?.data?.length || 0,
        sub_organisasi: resSub?.data?.length || 0,
        satker: resSat?.data?.length || 0,
      });
    } catch (_e) {
      // ignore silently
    }
  };

  // Load Main Data & Parent Options
  const loadData = async () => {
    setIsLoading(true);
    setSelectedIds([]);
    try {
      if (activeType === 'instansi') {
        const res = await fetch('/api/master-kedinasan/instansi');
        const json = await res.json();
        const data = json.data || [];
        setMasterList(data);
        setParentOptions([]);
        setCounts(prev => ({ ...prev, instansi: data.length }));
      } else if (activeType === 'organisasi') {
        const [res, pRes] = await Promise.all([
          fetch('/api/master-kedinasan/organisasi').then(r => r.json()),
          fetch('/api/master-kedinasan/instansi').then(r => r.json()),
        ]);
        const data = res.data || [];
        setMasterList(data);
        setParentOptions(pRes.data || []);
        setCounts(prev => ({ ...prev, organisasi: data.length, instansi: pRes.data?.length || prev.instansi }));
      } else if (activeType === 'sub_organisasi') {
        const [res, pRes] = await Promise.all([
          fetch('/api/master-kedinasan/sub-org').then(r => r.json()),
          fetch('/api/master-kedinasan/organisasi').then(r => r.json()),
        ]);
        const data = res.data || [];
        setMasterList(data);
        setParentOptions(pRes.data || []);
        setCounts(prev => ({ ...prev, sub_organisasi: data.length, organisasi: pRes.data?.length || prev.organisasi }));
      } else if (activeType === 'satker') {
        const [res, pRes] = await Promise.all([
          fetch('/api/master-kedinasan/satker').then(r => r.json()),
          fetch('/api/master-kedinasan/sub-org').then(r => r.json()),
        ]);
        const data = res.data || [];
        setMasterList(data);
        setParentOptions(pRes.data || []);
        setCounts(prev => ({ ...prev, satker: data.length, sub_organisasi: pRes.data?.length || prev.sub_organisasi }));
      }
    } catch (_e) {
      setMasterList([]);
      setParentOptions([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    fetchCounts();
    setCurrentPage(1);
    setSelectedParentFilter('');
  }, [activeType]);

  // Lookup Parent Name from ID
  const parentMap = useMemo(() => {
    const map = new Map<string, string>();
    parentOptions.forEach(opt => {
      map.set(opt.id, opt.nama);
    });
    return map;
  }, [parentOptions]);

  const getItemParentId = (item: MasterKedinasanItem): string | undefined => {
    return item.instansiId || item.organisasiId || item.subOrgId;
  };

  // Filtered List
  const filteredList = useMemo(() => {
    let list = masterList;

    // Filter by Parent if selected
    if (selectedParentFilter && activeType !== 'instansi') {
      list = list.filter(item => getItemParentId(item) === selectedParentFilter);
    }

    // Filter by Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(item => {
        const parentId = getItemParentId(item) || '';
        const parentName = parentMap.get(parentId) || '';
        return (
          item.id.toLowerCase().includes(q) ||
          item.nama.toLowerCase().includes(q) ||
          parentId.toLowerCase().includes(q) ||
          parentName.toLowerCase().includes(q)
        );
      });
    }

    return list;
  }, [masterList, searchQuery, selectedParentFilter, activeType, parentMap]);

  // Pagination Calculations
  const totalItems = filteredList.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const paginatedList = filteredList.slice(startIndex, startIndex + pageSize);

  // Checkbox Selection
  const isAllSelected =
    paginatedList.length > 0 && paginatedList.every(item => selectedIds.includes(item.id));
  const isSomeSelected =
    paginatedList.some(item => selectedIds.includes(item.id)) && !isAllSelected;

  const handleToggleSelectAll = () => {
    if (!isAdmin) return;
    if (isAllSelected) {
      const currentPageIds = new Set(paginatedList.map(item => item.id));
      setSelectedIds(prev => prev.filter(id => !currentPageIds.has(id)));
    } else {
      const newSelected = Array.from(new Set([...selectedIds, ...paginatedList.map(item => item.id)]));
      setSelectedIds(newSelected);
    }
  };

  const handleToggleSelect = (id: string) => {
    if (!isAdmin) return;
    setSelectedIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
  };

  // Copy to Clipboard
  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedId(code);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (_e) {
      // Fallback
    }
  };

  // Open Modal for Add
  const handleOpenAdd = () => {
    if (!isAdmin) return;
    setIsEditing(false);
    setFormData({ id: '', nama: '', parentId: parentOptions[0]?.id || '' });
    setShowModal(true);
  };

  // Open Modal for Edit
  const handleOpenEdit = (item: MasterKedinasanItem) => {
    if (!isAdmin) return;
    setIsEditing(true);
    setFormData({
      id: item.id,
      nama: item.nama,
      parentId: getItemParentId(item) || parentOptions[0]?.id || '',
    });
    setShowModal(true);
  };

  // Save (Create or Update)
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    if (!formData.id.trim() || !formData.nama.trim()) {
      showAlert('error', 'Kode / ID dan Nama Resmi wajib diisi.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/master-kedinasan/${activeType}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': 'user-1',
          'x-role-id': 'role-admin',
        },
        body: JSON.stringify(formData),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        showAlert('success', json.message || `Data master ${formData.nama} berhasil disimpan.`);
        setShowModal(false);
        setFormData({ id: '', nama: '', parentId: '' });
        await loadData();
        fetchCounts();
      } else {
        showAlert('error', json.message || 'Gagal menyimpan master data.');
      }
    } catch {
      showAlert('error', 'Gagal terhubung ke server database.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Execute Single Delete
  const handleExecuteDelete = async (id: string, name?: string) => {
    if (!isAdmin) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/master-kedinasan/${activeType}/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: {
          'x-user-id': 'user-1',
          'x-role-id': 'role-admin',
        },
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.success) {
        showAlert('success', `Item "${name || id}" berhasil dihapus.`);
        setSelectedIds(prev => prev.filter(x => x !== id));
        setDeleteConfirm(null);
        await loadData();
        fetchCounts();
      } else {
        showAlert('error', json.message || 'Gagal menghapus item master.');
      }
    } catch {
      showAlert('error', 'Gagal terhubung ke server.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Execute Bulk Delete
  const handleExecuteBulkDelete = async () => {
    if (!isAdmin || selectedIds.length === 0) return;
    setIsSubmitting(true);
    try {
      await Promise.all(
        selectedIds.map(id =>
          fetch(`/api/master-kedinasan/${activeType}/${encodeURIComponent(id)}`, {
            method: 'DELETE',
            headers: {
              'x-user-id': 'user-1',
              'x-role-id': 'role-admin',
            },
          })
        )
      );
      showAlert('success', `${selectedIds.length} data master berhasil dihapus.`);
      setSelectedIds([]);
      setDeleteConfirm(null);
      await loadData();
      fetchCounts();
    } catch {
      showAlert('error', 'Gagal menghapus beberapa data master kedinasan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentTabConfig = TAB_CONFIG.find(t => t.type === activeType)!;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-6">
      {/* 1. HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-blue-50/90 text-blue-900 border border-blue-100/80 flex items-center justify-center shrink-0 shadow-xs">
            <Building2 className="w-6 h-6 text-[#0a1d37]" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-slate-900 tracking-tight">
              Manajemen Master Data Birokrasi & Kedinasan
            </h3>
            <p className="text-sm text-slate-500 mt-1">
              Kelola data entitas berjenjang: Instansi &rarr; Organisasi &rarr; Sub-Organisasi &rarr; Satker (Satuan Kerja).
            </p>
          </div>
        </div>

        <button
          onClick={handleOpenAdd}
          disabled={!isAdmin}
          title={!isAdmin ? 'Aksi dibatasi: Hanya Super User / Admin yang dapat menambah master data' : undefined}
          className={`w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition shadow-xs self-start sm:self-auto focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-hidden ${
            !isAdmin
              ? 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
              : 'bg-[#0a1d37] hover:bg-[#162c4e] text-white cursor-pointer active:scale-[0.98]'
          }`}
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Master Baru</span>
        </button>
      </div>

      {/* ALERT NOTIFICATION TOAST */}
      {alertMsg && (
        <div
          className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 font-medium text-xs animate-in fade-in duration-200 ${
            alertMsg.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-red-50 border-red-200 text-red-900'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {alertMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span>{alertMsg.text}</span>
          </div>
          <button
            onClick={() => setAlertMsg(null)}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-md cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 2. TAB / STEPPER LEVEL (SEGMENTED CONTROL) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 bg-slate-100/80 p-1.5 rounded-2xl">
        {TAB_CONFIG.map((tab, idx) => {
          const isActive = activeType === tab.type;
          const count = counts[tab.type] || 0;
          return (
            <button
              key={tab.type}
              onClick={() => {
                setActiveType(tab.type);
                setSearchQuery('');
              }}
              className={`flex flex-col items-start justify-center p-3 rounded-xl transition-all text-left cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-hidden ${
                isActive
                  ? 'bg-[#0a1d37] text-white shadow-xs'
                  : 'bg-transparent text-slate-600 hover:bg-white/80 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className="text-xs font-semibold flex items-center gap-1.5">
                  <span className={`inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-bold ${
                    isActive ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {idx + 1}
                  </span>
                  {tab.label}
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    isActive ? 'bg-blue-500/30 text-white' : 'bg-slate-200/80 text-slate-600'
                  }`}
                >
                  {count}
                </span>
              </div>
              <span className={`text-[11px] mt-1 font-normal line-clamp-1 ${
                isActive ? 'text-blue-100/80' : 'text-slate-400'
              }`}>
                {tab.fullDesc}
              </span>
            </button>
          );
        })}
      </div>

      {/* 3. TOOLBAR ROW: SEARCH & FILTER & BULK BAR */}
      <div className="space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Left: Search input */}
          <div className="relative w-full max-w-xs">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder={`Cari ${currentTabConfig.label.toLowerCase()}...`}
              value={searchQuery}
              onChange={e => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-9 py-2 text-xs rounded-xl border border-slate-200 bg-white placeholder:text-slate-400 text-slate-900 focus:outline-hidden focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setCurrentPage(1);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-md cursor-pointer"
                title="Hapus pencarian"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Right: Parent filter dropdown & count status */}
          <div className="flex flex-wrap items-center gap-3">
            {activeType !== 'instansi' && parentOptions.length > 0 && (
              <div className="flex items-center gap-2">
                <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <select
                  value={selectedParentFilter}
                  onChange={e => {
                    setSelectedParentFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-700 font-medium focus:outline-hidden focus:border-blue-600 focus:ring-1 focus:ring-blue-600 cursor-pointer max-w-[220px] truncate"
                >
                  <option value="">Semua {currentTabConfig.parentLabel}</option>
                  {parentOptions.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.nama}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="text-xs text-slate-500 font-medium ml-auto md:ml-0 whitespace-nowrap">
              Menampilkan <span className="font-semibold text-slate-900">{totalItems > 0 ? startIndex + 1 : 0}</span>
              –
              <span className="font-semibold text-slate-900">{Math.min(startIndex + pageSize, totalItems)}</span> dari{' '}
              <span className="font-semibold text-slate-900">{totalItems}</span> data
            </div>
          </div>
        </div>

        {/* Bulk Action Bar */}
        {selectedIds.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-blue-50/90 border border-blue-200 rounded-xl shadow-xs animate-in fade-in duration-150">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse" />
              <p className="text-xs font-semibold text-blue-950">
                <span className="font-bold">{selectedIds.length}</span> item master terpilih
              </p>
              <button
                onClick={() => setSelectedIds([])}
                className="text-[11px] font-semibold text-blue-700 hover:text-blue-900 underline ml-2 cursor-pointer"
              >
                Batal Pilihan
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (!isAdmin) return;
                  setDeleteConfirm({
                    type: 'bulk',
                    count: selectedIds.length,
                  });
                }}
                disabled={!isAdmin}
                title={!isAdmin ? 'Aksi dibatasi: Hanya Super User / Admin yang dapat menghapus data master' : undefined}
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white bg-red-600 hover:bg-red-700 transition flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus {selectedIds.length} Terpilih</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 4. TABLE SECTION */}
      <div className="overflow-hidden border border-slate-200/80 rounded-2xl bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 bg-slate-50/95 backdrop-blur-xs text-slate-600 uppercase text-[10px] font-bold border-b border-slate-200/80 z-10">
              <tr>
                <th className="w-12 px-4 py-3.5 text-center">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    ref={el => {
                      if (el) el.indeterminate = isSomeSelected;
                    }}
                    onChange={handleToggleSelectAll}
                    disabled={!isAdmin || paginatedList.length === 0}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                    title={
                      !isAdmin
                        ? 'Aksi dibatasi: Hanya Admin'
                        : isAllSelected
                        ? 'Batalkan semua pilihan di halaman ini'
                        : 'Pilih semua di halaman ini'
                    }
                  />
                </th>
                <th className="px-4 py-3.5 font-bold tracking-wider" style={{ width: '22%' }}>
                  Kode / ID Entitas
                </th>
                <th className="px-4 py-3.5 font-bold tracking-wider" style={{ width: activeType !== 'instansi' ? '38%' : '63%' }}>
                  Nama Resmi Entitas
                </th>
                {activeType !== 'instansi' && (
                  <th className="px-4 py-3.5 font-bold tracking-wider" style={{ width: '25%' }}>
                    Induk ({currentTabConfig.parentLabel})
                  </th>
                )}
                <th className="px-4 py-3.5 font-bold tracking-wider text-right" style={{ width: '15%' }}>
                  Aksi
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {/* LOADING SKELETON */}
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="w-12 px-4 py-4 text-center">
                      <div className="w-4 h-4 bg-slate-200 rounded mx-auto" />
                    </td>
                    <td className="px-4 py-4">
                      <div className="w-24 h-5 bg-slate-200 rounded-md" />
                    </td>
                    <td className="px-4 py-4">
                      <div className="w-48 h-5 bg-slate-200 rounded-md" />
                    </td>
                    {activeType !== 'instansi' && (
                      <td className="px-4 py-4">
                        <div className="w-36 h-5 bg-slate-200 rounded-md" />
                      </td>
                    )}
                    <td className="px-4 py-4 text-right">
                      <div className="w-16 h-6 bg-slate-200 rounded-lg ml-auto" />
                    </td>
                  </tr>
                ))
              ) : paginatedList.length > 0 ? (
                /* DATA ROWS */
                paginatedList.map(item => {
                  const isSelected = selectedIds.includes(item.id);
                  const parentId = getItemParentId(item);
                  const parentName = parentId ? parentMap.get(parentId) : undefined;

                  return (
                    <tr
                      key={item.id}
                      className={`transition-colors border-b border-slate-100/80 ${
                        isSelected ? 'bg-blue-50/60 font-medium' : 'hover:bg-slate-50/70'
                      }`}
                    >
                      <td className="w-12 px-4 py-3.5 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(item.id)}
                          disabled={!isAdmin}
                          className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                        />
                      </td>

                      {/* Kode / ID with Copy Button */}
                      <td className="px-4 py-3.5">
                        <div className="inline-flex items-center gap-1.5 group">
                          <span className="font-mono text-[11px] font-medium bg-slate-100/90 text-slate-700 px-2 py-0.5 rounded border border-slate-200/60">
                            {item.id}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyCode(item.id)}
                            className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                            title="Salin kode ID"
                          >
                            {copiedId === item.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Nama Resmi */}
                      <td className="px-4 py-3.5">
                        <span
                          className="font-medium text-slate-900 block truncate max-w-md"
                          title={item.nama}
                        >
                          {item.nama}
                        </span>
                      </td>

                      {/* Induk Entity Name Badge */}
                      {activeType !== 'instansi' && (
                        <td className="px-4 py-3.5">
                          {parentName ? (
                            <div className="inline-flex flex-col">
                              <span
                                className="inline-flex items-center px-2 py-0.5 rounded-lg text-[11px] font-medium bg-blue-50 text-blue-800 border border-blue-200/60 max-w-xs truncate"
                                title={`${parentName} (${parentId})`}
                              >
                                {parentName}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono pl-0.5 mt-0.5">
                                {parentId}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400 font-mono text-xs">{parentId || '-'}</span>
                          )}
                        </td>
                      )}

                      {/* Actions: Edit & Delete */}
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenEdit(item)}
                            disabled={!isAdmin}
                            title={!isAdmin ? 'Aksi dibatasi: Hanya Admin' : 'Edit Master Data'}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-blue-700 hover:bg-blue-50 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (!isAdmin) return;
                              setDeleteConfirm({
                                type: 'single',
                                id: item.id,
                                name: item.nama,
                              });
                            }}
                            disabled={!isAdmin}
                            title={!isAdmin ? 'Aksi dibatasi: Hanya Admin' : 'Hapus Master Data'}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-red-700 hover:bg-red-50 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                /* EMPTY STATE */
                <tr>
                  <td colSpan={activeType !== 'instansi' ? 5 : 4} className="py-12 text-center">
                    <div className="max-w-xs mx-auto flex flex-col items-center justify-center text-center space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
                        {searchQuery ? (
                          <SearchX className="w-6 h-6" />
                        ) : (
                          <Layers className="w-6 h-6" />
                        )}
                      </div>
                      <div>
                        <h4 className="text-xs font-semibold text-slate-800">
                          {searchQuery
                            ? 'Tidak ada data master yang cocok'
                            : `Belum ada master ${currentTabConfig.label}`}
                        </h4>
                        <p className="text-[11px] text-slate-500 mt-1">
                          {searchQuery
                            ? `Pencarian "${searchQuery}" tidak menemukan hasil pada tingkat ini.`
                            : `Mulai dengan menambahkan master ${currentTabConfig.label.toLowerCase()} pertama Anda.`}
                        </p>
                      </div>
                      {searchQuery ? (
                        <button
                          onClick={() => {
                            setSearchQuery('');
                            setSelectedParentFilter('');
                          }}
                          className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 transition cursor-pointer"
                        >
                          Reset Pencarian
                        </button>
                      ) : (
                        isAdmin && (
                          <button
                            onClick={handleOpenAdd}
                            className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white bg-[#0a1d37] hover:bg-[#162c4e] transition cursor-pointer shadow-xs"
                          >
                            Tambah Master Baru
                          </button>
                        )
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 5. PAGINATION SECTION */}
        {totalItems > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 bg-slate-50/70 border-t border-slate-200/80 text-xs">
            {/* Page Size Selector */}
            <div className="flex items-center gap-2 text-slate-600">
              <span>Baris per halaman:</span>
              <select
                value={pageSize}
                onChange={e => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-2 py-1 rounded-lg border border-slate-200 bg-white font-medium text-slate-700 cursor-pointer focus:outline-hidden focus:border-blue-600"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center gap-2 ml-auto sm:ml-0">
              <span className="text-slate-500 mr-2">
                Halaman <strong className="text-slate-800">{safeCurrentPage}</strong> dari{' '}
                <strong className="text-slate-800">{totalPages}</strong>
              </span>

              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={safeCurrentPage <= 1}
                className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                title="Halaman sebelumnya"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(page => {
                    return (
                      page === 1 ||
                      page === totalPages ||
                      Math.abs(page - safeCurrentPage) <= 1
                    );
                  })
                  .map((page, idx, arr) => {
                    const prev = arr[idx - 1];
                    const hasGap = prev && page - prev > 1;
                    return (
                      <React.Fragment key={page}>
                        {hasGap && <span className="px-1 text-slate-400">…</span>}
                        <button
                          onClick={() => setCurrentPage(page)}
                          className={`w-7 h-7 rounded-lg text-xs font-semibold transition cursor-pointer ${
                            page === safeCurrentPage
                              ? 'bg-[#0a1d37] text-white shadow-xs'
                              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          {page}
                        </button>
                      </React.Fragment>
                    );
                  })}
              </div>

              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={safeCurrentPage >= totalPages}
                className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                title="Halaman selanjutnya"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 6. MODAL TAMBAH & EDIT MASTER DATA */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl max-h-[90vh] flex flex-col my-auto space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
              <div>
                <h3 className="font-bold text-base text-slate-900">
                  {isEditing ? 'Ubah Master' : 'Tambah Master'} {currentTabConfig.label}
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Tingkat {currentTabConfig.fullDesc}
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="text-xs flex flex-col flex-1 overflow-hidden">
              <div className="space-y-3.5 overflow-y-auto flex-1 pr-1 pb-2">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Kode / ID Unik <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.id}
                    disabled={isEditing}
                    onChange={e => setFormData({ ...formData, id: e.target.value })}
                    placeholder={`e.g. ${
                      activeType === 'instansi'
                        ? 'ins-kemendagri'
                        : activeType === 'organisasi'
                        ? 'org-polri-korlantas'
                        : activeType === 'sub_organisasi'
                        ? 'sub-polri-ditlantas'
                        : 'stk-satlantas-polres'
                    }`}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-blue-600 focus:outline-none font-mono disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                    required
                  />
                  {isEditing && (
                    <p className="text-[10px] text-slate-400 mt-1">
                      ID kode entitas bersifat unik dan tidak dapat diubah setelah dibuat.
                    </p>
                  )}
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Nama Lengkap Resmi <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.nama}
                    onChange={e => setFormData({ ...formData, nama: e.target.value })}
                    placeholder="e.g. Korps Lalu Lintas Polri"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-blue-600 focus:outline-none font-medium"
                    required
                  />
                </div>

                {activeType !== 'instansi' && (
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      Induk ({currentTabConfig.parentLabel}) <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.parentId}
                      onChange={e => setFormData({ ...formData, parentId: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-blue-600 focus:outline-none font-medium cursor-pointer"
                      required
                    >
                      <option value="">-- Pilih Induk {currentTabConfig.parentLabel} --</option>
                      {parentOptions.map(opt => (
                        <option key={opt.id} value={opt.id}>
                          {opt.nama} ({opt.id})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={!isAdmin || isSubmitting}
                  className="bg-[#0a1d37] hover:bg-[#162c4e] text-white px-5 py-2 rounded-xl text-xs font-semibold transition shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Menyimpan...' : isEditing ? 'Simpan Perubahan' : 'Tambah Master'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. DIALOG KONFIRMASI HAPUS */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto my-auto">
            <div className="flex items-center gap-3 text-red-600">
              <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center shrink-0 border border-red-100">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="font-bold text-sm text-slate-900">
                {deleteConfirm.type === 'bulk'
                  ? `Hapus ${deleteConfirm.count} Data Master?`
                  : 'Hapus Data Master Kedinasan?'}
              </h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              {deleteConfirm.type === 'bulk' ? (
                <>
                  Anda akan menghapus secara permanen{' '}
                  <strong className="text-slate-900">{deleteConfirm.count} data master</strong> dari tingkat{' '}
                  <strong className="text-slate-900">{currentTabConfig.label}</strong>. Tindakan ini tidak dapat
                  dibatalkan.
                </>
              ) : (
                <>
                  Anda akan menghapus data master{' '}
                  <strong className="text-slate-900">"{deleteConfirm.name}"</strong> secara permanen.
                </>
              )}
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 shrink-0">
              <button
                type="button"
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  if (deleteConfirm.type === 'bulk') {
                    handleExecuteBulkDelete();
                  } else if (deleteConfirm.id) {
                    handleExecuteDelete(deleteConfirm.id, deleteConfirm.name);
                  }
                }}
                disabled={isSubmitting || !isAdmin}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-xs"
              >
                {isSubmitting ? 'Menghapus...' : 'Hapus Permanen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

