import React, { useState, useEffect } from 'react';
import { X, Check, BookOpen, Video, FileText, BarChart3, CheckSquare, Sparkles } from 'lucide-react';
import { MaterialItem, EducationLevel, MaterialType } from '../../types';

interface MaterialFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (material: Partial<MaterialItem>) => void;
  initialData?: MaterialItem | null;
}

export function MaterialFormModal({
  isOpen,
  onClose,
  onSave,
  initialData,
}: MaterialFormModalProps) {
  const [formData, setFormData] = useState<Partial<MaterialItem>>({
    title: '',
    level: 'SD',
    type: 'modul',
    typeLabel: 'Modul Pembelajaran',
    badgeTag: 'SD',
    description: '',
    imageUrl: '',
    imageAlt: '',
    metadataText: '10 Menit',
    author: 'Korlantas POLRI',
    summary: '',
    downloadSize: '',
    featured: false,
    size: 'standard',
  });

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    } else {
      setFormData({
        title: '',
        level: 'SD',
        type: 'modul',
        typeLabel: 'Modul Pembelajaran',
        badgeTag: 'SD',
        description: '',
        imageUrl: 'https://images.unsplash.com/photo-1577896851231-70ef18881754?auto=format&fit=crop&w=800&q=80',
        imageAlt: 'Materi Edukasi POLRI',
        metadataText: '10 Menit Baca',
        author: 'Korlantas POLRI',
        summary: '',
        downloadSize: '5.2 MB (PDF)',
        featured: false,
        size: 'standard',
      });
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleTypeChange = (type: MaterialType) => {
    const typeLabels: Record<MaterialType, string> = {
      all: 'Semua Format',
      video: 'Video Edukasi',
      infografis: 'Infografis',
      modul: 'Modul Pembelajaran',
      kuis: 'Kuis & Evaluasi',
      artikel: 'Artikel',
    };
    setFormData(prev => ({
      ...prev,
      type,
      typeLabel: typeLabels[type] || 'Materi',
    }));
  };

  const handleLevelChange = (level: EducationLevel) => {
    if (level === 'ALL') return;
    setFormData(prev => ({
      ...prev,
      level,
      badgeTag: level,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title?.trim() || !formData.description?.trim()) return;
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-[#0a1d37] rounded-xl flex items-center justify-center text-white">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-headline text-lg font-bold text-slate-900">
                {initialData ? 'Edit Materi Edukasi' : 'Tambah Materi Edukasi Baru'}
              </h3>
              <p className="text-xs text-slate-500">
                Lengkapi rincian modul keselamatan untuk kurikulum Dikmas Lantas POLRI.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Judul Materi */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Judul Materi <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.title || ''}
              onChange={e => setFormData({ ...formData, title: e.target.value })}
              placeholder="Contoh: Tata Tertib Penyeberangan Zebra Cross untuk Pelajar"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0a1d37] focus:bg-white transition-all"
            />
          </div>

          {/* Jenjang & Format */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Jenjang Pendidikan <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.level || 'SD'}
                onChange={e => handleLevelChange(e.target.value as EducationLevel)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0a1d37] cursor-pointer"
              >
                <option value="TK/PAUD">TK / PAUD (Usia Dini)</option>
                <option value="SD">Sekolah Dasar (SD)</option>
                <option value="SMP">Sekolah Menengah Pertama (SMP)</option>
                <option value="SMA">SMA / SMK / Sederajat</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Format Materi <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.type || 'modul'}
                onChange={e => handleTypeChange(e.target.value as MaterialType)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0a1d37] cursor-pointer"
              >
                <option value="modul">Modul Pembelajaran (PDF)</option>
                <option value="video">Video Edukasi</option>
                <option value="infografis">Infografis Visual</option>
                <option value="kuis">Kuis & Evaluasi</option>
                <option value="artikel">Artikel / Bacaan</option>
              </select>
            </div>
          </div>

          {/* Deskripsi Singkat */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Deskripsi Singkat <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              rows={3}
              value={formData.description || ''}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              placeholder="Rangkuman ringkas isi materi keselamatan..."
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0a1d37] focus:bg-white transition-all"
            />
          </div>

          {/* Gambar Sampul URL & Instansi Pembuat */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                URL Gambar Sampul
              </label>
              <input
                type="text"
                value={formData.imageUrl || ''}
                onChange={e => setFormData({ ...formData, imageUrl: e.target.value, imageAlt: formData.title || 'Materi' })}
                placeholder="https://images.unsplash.com/..."
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0a1d37]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Instansi Pembuat / Penulis
              </label>
              <input
                type="text"
                value={formData.author || ''}
                onChange={e => setFormData({ ...formData, author: e.target.value })}
                placeholder="Misal: Korlantas POLRI & Kemendikbud"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0a1d37]"
              />
            </div>
          </div>

          {/* Durasi / Halaman & Ukuran Berkas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Info Durasi / Jumlah Halaman
              </label>
              <input
                type="text"
                value={formData.metadataText || ''}
                onChange={e => setFormData({ ...formData, metadataText: e.target.value })}
                placeholder="Contoh: 10 Menit atau 15 Halaman"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0a1d37]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Ukuran File Unduhan
              </label>
              <input
                type="text"
                value={formData.downloadSize || ''}
                onChange={e => setFormData({ ...formData, downloadSize: e.target.value })}
                placeholder="Contoh: 12.5 MB (PDF)"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0a1d37]"
              />
            </div>
          </div>

          {/* Layout Display Card Option */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Tipe Tampilan Kartu di Katalog
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              {[
                { id: 'featured', label: 'Featured Banner (Lebar 8-Kolom)' },
                { id: 'standard', label: 'Standard Card (4-Kolom Vertikal)' },
                { id: 'compact', label: 'Compact Card (4-Kolom Horizontal)' },
              ].map(opt => (
                <button
                  type="button"
                  key={opt.id}
                  onClick={() => setFormData({ ...formData, size: opt.id as any, featured: opt.id === 'featured' })}
                  className={`p-3 rounded-xl border text-left text-xs font-semibold transition-all cursor-pointer ${
                    formData.size === opt.id
                      ? 'border-[#0a1d37] bg-[#0a1d37] text-white shadow-xs'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Rangkuman Detail untuk Modal */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Rangkuman Materi Komprehensif (Muncul saat Modul Dibuka)
            </label>
            <textarea
              rows={3}
              value={formData.summary || ''}
              onChange={e => setFormData({ ...formData, summary: e.target.value })}
              placeholder="Penjelasan lengkap kurikulum dan sasaran kompetensi siswa..."
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0a1d37]"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 bg-[#0a1d37] hover:bg-[#162c4e] text-white px-6 py-2.5 rounded-xl text-xs font-semibold shadow-md hover:shadow-lg transition-all cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>{initialData ? 'Simpan Perubahan' : 'Terbitkan Materi'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
