/**
 * SM-LEARNING DIKMAS POLRI — Helper Master Data Wilayah (Polda & Polres)
 * =============================================================================
 * Memuat master 34 Polda dan ratusan Polres dari database MySQL via API backend.
 * Menyediakan fallback bawaan bila server belum merespons.
 */

export interface WilayahPoldaItem {
  poldaId: string;
  nama: string;
  isWilayah: boolean;
}

export interface WilayahPolresItem {
  poldaId: string;
  polresId: string;
  nama: string;
}

let cachedPoldaList: WilayahPoldaItem[] = [];
let cachedPolresMap: Record<string, string[]> = {};

/** Daftar 34 Polda kewilayahan default (fallback cepat sebelum API selesai) */
export const DEFAULT_34_POLDA: string[] = [
  'POLDA ACEH',
  'POLDA SUMATERA UTARA',
  'POLDA RIAU',
  'POLDA KEPULAUAN RIAU',
  'POLDA SUMATERA BARAT',
  'POLDA JAMBI',
  'POLDA SUMATERA SELATAN',
  'POLDA BENGKULU',
  'POLDA LAMPUNG',
  'POLDA KEPULAUAN BANGKA BELITUNG',
  'POLDA BANTEN',
  'POLDA METRO JAYA',
  'POLDA JAWA BARAT',
  'POLDA JAWA TENGAH',
  'POLDA DI YOGYAKARTA',
  'POLDA JAWA TIMUR',
  'POLDA BALI',
  'POLDA NUSA TENGGARA BARAT',
  'POLDA NUSA TENGGARA TIMUR',
  'POLDA KALIMANTAN BARAT',
  'POLDA KALIMANTAN SELATAN',
  'POLDA KALIMANTAN TENGAH',
  'POLDA KALIMANTAN TIMUR',
  'POLDA KALIMANTAN UTARA',
  'POLDA SULAWESI UTARA',
  'POLDA GORONTALO',
  'POLDA SULAWESI TENGAH',
  'POLDA SULAWESI BARAT',
  'POLDA SULAWESI SELATAN',
  'POLDA SULAWESI TENGGARA',
  'POLDA MALUKU',
  'POLDA MALUKU UTARA',
  'POLDA PAPUA BARAT',
  'POLDA PAPUA',
];

export async function fetchPoldaList(): Promise<WilayahPoldaItem[]> {
  if (cachedPoldaList.length > 0) return cachedPoldaList;
  try {
    const res = await fetch('/api/wilayah/polda');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const json = await res.json();
    if (json.success && Array.isArray(json.data)) {
      cachedPoldaList = json.data;
      return cachedPoldaList;
    }
  } catch (err) {
    console.warn('[Wilayah] Gagal mengambil polda dari API, pakai default 34 polda:', err);
  }
  return DEFAULT_34_POLDA.map((nama, idx) => ({
    poldaId: String(idx + 1).padStart(2, '0'),
    nama,
    isWilayah: true,
  }));
}

export async function fetchPolresByPolda(poldaIdOrNama?: string): Promise<WilayahPolresItem[]> {
  try {
    let url = '/api/wilayah/polres';
    if (poldaIdOrNama) {
      // Periksa apakah yang dikirim nama polda (mis. 'POLDA METRO JAYA') atau ID numerik ('12')
      const poldas = await fetchPoldaList();
      const matched = poldas.find(
        p => p.poldaId === poldaIdOrNama || p.nama.toUpperCase() === poldaIdOrNama.toUpperCase()
      );
      const targetId = matched ? matched.poldaId : poldaIdOrNama;
      url = `/api/wilayah/polres?poldaId=${encodeURIComponent(targetId)}`;
    }
    const res = await fetch(url);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const json = await res.json();
    if (json.success && Array.isArray(json.data)) {
      return json.data;
    }
  } catch (err) {
    console.warn('[Wilayah] Gagal mengambil polres dari API:', err);
  }
  return [];
}

/** Master Data Tambahan untuk Profil & Organisasi Kedinasan */
export const MASTER_INSTANSI = [
  'Kepolisian Negara Republik Indonesia (POLRI)',
  'Kementerian Perhubungan Republik Indonesia',
  'Kementerian Pendidikan, Kebudayaan, Riset, dan Teknologi',
  'Kementerian Dalam Negeri Republik Indonesia',
  'Dinas Perhubungan Provinsi / Kabupaten / Kota',
  'Jasa Raharja',
  'Instansi Pendidikan / Sekolah / Kampus',
  'Komunitas / Mitra Keselamatan Publik'
];

export const MASTER_ORGANISASI = [
  'Korps Lalu Lintas (Korlantas POLRI)',
  'Direktorat Keamanan dan Keselamatan (Ditkamsel)',
  'Direktorat Penegakan Hukum (Ditgakkum)',
  'Direktorat Registrasi dan Identifikasi (Ditregident)',
  'Direktorat Lalu Lintas Polda (Ditlantas)',
  'Satuan Lalu Lintas Polres (Satlantas)',
  'Unit Keamanan dan Keselamatan (Unit Kamsel / Dikyasa)',
  'Polsek Jajaran',
  'Biro Operasi (Roops)',
  'Biro SDM'
];

export const MASTER_SUB_ORG = [
  'Subdit Pendidikan Masyarakat (Subdit Dikmas)',
  'Subdit Standar Cegah & Tindak (Subdit Kamsel)',
  'Subdit Patroli Pengawalan (Subdit Wal)',
  'Subdit Gakkum & Tilang',
  'Subdit Sim & Stnk (Regident)',
  'Unit Kamsel Satlantas',
  'Unit Turjawali Satlantas',
  'Unit Gakkum Satlantas',
  'Bagian Operasional (Bagops)',
  'Seksi Humas & Edukasi'
];

export const MASTER_SATKER = [
  'Korlantas Mabes Polri',
  'Ditlantas Polda Metro Jaya',
  'Ditlantas Polda Jawa Barat',
  'Ditlantas Polda Jawa Tengah',
  'Ditlantas Polda Jawa Timur',
  'Satlantas Polres Metro Jakarta Pusat',
  'Satlantas Polres Metro Jakarta Selatan',
  'Satlantas Polres Metro Jakarta Barat',
  'Satlantas Polres Metro Jakarta Timur',
  'Satlantas Polres Metro Jakarta Utara',
  'Satlantas Polrestabes Bandung',
  'Satlantas Polrestabes Semarang',
  'Satlantas Polrestabes Surabaya',
  'Satlantas Polres Bogor',
  'Satlantas Polresta Tangerang'
];

