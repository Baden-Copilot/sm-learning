/**
 * SM-LEARNING DIKMAS POLRI — Helper Master Data Wilayah (Provinsi & Kota/Kabupaten)
 * =============================================================================
 * Memuat master 34 Provinsi dan ratusan Kota/Kabupaten dari database MySQL via API backend.
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

/** Daftar 34 Provinsi kewilayahan default (fallback cepat sebelum API selesai) */
export const DEFAULT_34_POLDA: string[] = [
  'ACEH',
  'SUMATERA UTARA',
  'RIAU',
  'KEPULAUAN RIAU',
  'SUMATERA BARAT',
  'JAMBI',
  'SUMATERA SELATAN',
  'BENGKULU',
  'LAMPUNG',
  'KEPULAUAN BANGKA BELITUNG',
  'BANTEN',
  'METRO JAYA',
  'JAWA BARAT',
  'JAWA TENGAH',
  'DI YOGYAKARTA',
  'JAWA TIMUR',
  'BALI',
  'NUSA TENGGARA BARAT',
  'NUSA TENGGARA TIMUR',
  'KALIMANTAN BARAT',
  'KALIMANTAN SELATAN',
  'KALIMANTAN TENGAH',
  'KALIMANTAN TIMUR',
  'KALIMANTAN UTARA',
  'SULAWESI UTARA',
  'GORONTALO',
  'SULAWESI TENGAH',
  'SULAWESI BARAT',
  'SULAWESI SELATAN',
  'SULAWESI TENGGARA',
  'MALUKU',
  'MALUKU UTARA',
  'PAPUA BARAT',
  'PAPUA',
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
    console.warn('[Wilayah] Gagal mengambil provinsi dari API, pakai default 34 provinsi:', err);
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
      // Periksa apakah yang dikirim nama provinsi (mis. 'METRO JAYA') atau ID numerik ('12')
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
    console.warn('[Wilayah] Gagal mengambil kota/kabupaten dari API:', err);
  }
  return [];
}

export async function fetchMasterInstansi(): Promise<string[]> {
  try {
    const res = await fetch('/api/master-kedinasan/instansi');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const json = await res.json();
    if (json.success && Array.isArray(json.data) && json.data.length > 0) {
      return json.data.map((item: any) => item.nama);
    }
  } catch (_e) {}
  return MASTER_INSTANSI;
}

export async function fetchMasterOrganisasi(instansi?: string): Promise<string[]> {
  try {
    const url = instansi
      ? `/api/master-kedinasan/organisasi?instansi=${encodeURIComponent(instansi)}`
      : '/api/master-kedinasan/organisasi';
    const res = await fetch(url);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const json = await res.json();
    if (json.success && Array.isArray(json.data) && json.data.length > 0) {
      return json.data.map((item: any) => item.nama);
    }
  } catch (_e) {}
  return MASTER_ORGANISASI;
}

export async function fetchMasterSubOrg(organisasi?: string): Promise<string[]> {
  try {
    const url = organisasi
      ? `/api/master-kedinasan/sub-org?organisasi=${encodeURIComponent(organisasi)}`
      : '/api/master-kedinasan/sub-org';
    const res = await fetch(url);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const json = await res.json();
    if (json.success && Array.isArray(json.data) && json.data.length > 0) {
      return json.data.map((item: any) => item.nama);
    }
  } catch (_e) {}
  return MASTER_SUB_ORG;
}

export async function fetchMasterSatker(subOrg?: string): Promise<string[]> {
  try {
    const url = subOrg
      ? `/api/master-kedinasan/satker?subOrg=${encodeURIComponent(subOrg)}`
      : '/api/master-kedinasan/satker';
    const res = await fetch(url);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const json = await res.json();
    if (json.success && Array.isArray(json.data) && json.data.length > 0) {
      return json.data.map((item: any) => item.nama);
    }
  } catch (_e) {}
  return MASTER_SATKER;
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

