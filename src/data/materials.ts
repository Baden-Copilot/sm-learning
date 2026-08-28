import { MaterialItem } from '../types';

export const POLRI_LOGO_URL = '/korlantas-logo-new.png';

export const ADMIN_AVATAR_URL = 'https://lh3.googleusercontent.com/aida-public/AB6AXuC7rjB1os0twCM_ciYLrpI4Joy1znDrSFkakR4fWTh2PGv57_tHCXfDxNLkKkcN8ibh-Cog3Yv1B4sJaIOKHjFVjBOEDrkoYNoRRQQlqvfcgipdP-9zFUD_NlUOfDA4jfSruc0cnpFrivbPPtN_930tmo_xFSv4yLcSB-csMeWCo5nQUp7qVhpOuZenyXMjsSJrW5pjSv9D4Hd3rD8v_W2o20EwU3nPqJepu7K940ZEHpOtUWWYcKA';

export const AVATAR_STUDENT_URL = 'https://lh3.googleusercontent.com/aida-public/AB6AXuAqg_owfyTrlTEfGWf4nSTfXCFIgGG46nXQcPQiXeo-1frpONV8I716Etcprb1kzo_RB6PcjJDDBvQPgBC7FNXwawnMYnwUE1Sp_z_iCZiLlquyu_2lgAgBrdnQlHNKxTBa325HRAT3Ai5NV_Vs1mUO-tTd9L4vGQqvf8PDUUg86qlr2x-Cxu94pnWwFTwpqjJ8Ab7DQoQLy8l3Y0cPR2-rYYCVkuIH5HStBtt7f4oUrsDcKwpykig';

export const AVATAR_TEACHER_URL = 'https://lh3.googleusercontent.com/aida-public/AB6AXuCtWORCtS7EkXT2SULirMBrob5Jm-D-Xdyw2o4mw9uzmfPOLFtWmLfZSM5QQWgZwBY-lzfXHxAMT8hnfKhAOEMsply_WwzMSlKNYl_MEwjilm5Y4y-ayOlPQUlaWZVV6nH80zhdpFTa-_l2f78t8FbzzfBSDCke9Wy5SXbg6rX-vt0FGiWfEX41S_Jw_pA7abyOwG0_v7ft81t-yMbgE1KP24n1iAQ50coSkFJV5dkYA-AsY1L9SBw';

export const INITIAL_MATERIALS: MaterialItem[] = [
  {
    id: 'mat-sd-01',
    title: 'Pedoman Keselamatan Berlalu Lintas untuk Anak Usia Dini',
    level: 'SD',
    type: 'video',
    typeLabel: 'Video Edukasi',
    isNew: true,
    featured: true,
    size: 'featured',
    badgeTag: 'SD',
    publishStatus: 'published',
    publicAccess: 'allowed',
    description: 'Modul interaktif yang mengajarkan dasar-dasar keselamatan di jalan raya, pengenalan rambu lalu lintas sederhana, dan cara menyeberang jalan yang aman.',
    imageUrl: 'https://images.unsplash.com/photo-1577896851231-70ef18881754?auto=format&fit=crop&w=800&q=80',
    imageAlt: 'Pedoman Keselamatan Berlalu Lintas untuk Anak Usia Dini',
    metadataText: '12 Menit',
    views: 0,
    downloads: 0,
    readTime: '12 Menit',
    duration: '12:30',
    author: 'Korlantas POLRI & Kemendikbudristek',
    publishDate: '15 Agustus 2026',
    downloadSize: '18.4 MB (PDF + Video Ringkasan)',
    progressPercent: 0,
    status: 'not_started',
    estimatedHours: 1.5,
    certificationAvailable: true,
    summary: 'Materi ini dirancang khusus untuk mengajarkan etika berlalu lintas sejak dini. Mulai dari aturan menyeberang di Zebra Cross (4T: Tunggu, Tengok kanan, Tengok kiri, Tengok kanan lagi), mengenali warna lampu APILL (Alat Pemberi Isyarat Lalu Lintas), hingga kewajiban menggunakan helm SNI.',
    keyPoints: [
      'Memahami arti warna lampu lalu lintas (Merah: Berhenti, Kuning: Hati-hati/Bersiap, Hijau: Jalan)',
      'Prinsip 4T saat menyeberang di Zebra Cross dan Jembatan Penyeberangan Orang (JPO)',
      'Penggunaan helm berstandar SNI bagi anak yang dibonceng motor',
      'Etika berjalan di trotoar yang aman dan menjauhi bahaya blind spot kendaraan besar'
    ],
    modules: [
      {
        id: 'mod-1',
        title: 'Modul 1: Pengenalan Lingkungan Jalan & Trotoar',
        lessons: [
          { id: 'les-1-1', title: 'Mengenal Jalur Pejalan Kaki & Trotoar', duration: '03:15', type: 'video', isCompleted: false },
          { id: 'les-1-2', title: 'Bahaya Bermain di Pinggir Jalan Raya', duration: '04:00', type: 'reading', isCompleted: false }
        ]
      },
      {
        id: 'mod-2',
        title: 'Modul 2: Rambu APILL & Menyeberang Aman (4T)',
        lessons: [
          { id: 'les-2-1', title: 'Warna Lampu Lalu Lintas dan Artinya', duration: '02:45', type: 'video', isCompleted: false },
          { id: 'les-2-2', title: 'Praktek Menyeberang Metode 4T di Zebra Cross', duration: '05:10', type: 'video', isCompleted: false }
        ]
      },
      {
        id: 'mod-3',
        title: 'Modul 3: Evaluasi & Uji Pemahaman',
        lessons: [
          { id: 'les-3-1', title: 'Kuis Keselamatan Berlalu Lintas Dasar', duration: '05:00', type: 'quiz', isCompleted: false }
        ]
      }
    ],
    quiz: [
      {
        id: 1,
        question: 'Apa arti dari warna lampu lalu lintas warna KUNING?',
        options: ['Langsung tancap gas secepatnya', 'Hati-hati dan bersiap berhenti atau memperlambat laju', 'Boleh belok kiri sesuka hati', 'Kendaraan harus mematikan mesin'],
        correctIndex: 1,
        explanation: 'Lampu kuning mengisyaratkan pengemudi untuk berhati-hati dan bersiap berhenti jika memungkinkan secara aman.'
      },
      {
        id: 2,
        question: 'Metode menyeberang jalan yang aman menurut edukasi Polisi Sahabat Anak adalah...',
        options: ['Lari sekencang mungkin tanpa melihat', 'Metode 4T (Tunggu, Tengok kanan, Tengok kiri, Tengok kanan lagi)', 'Menyeberang sambil main ponsel', 'Menyeberang di tikungan tajam'],
        correctIndex: 1,
        explanation: 'Metode 4T memastikan lintasan aman dari kendaraan sebelum dan selama menyeberang jalan.'
      }
    ]
  },
  {
    id: 'mat-smp-01',
    title: 'Cerdas Bersosial Media: Hindari Cyberbullying & Kejahatan Siber',
    level: 'SMP',
    type: 'infografis',
    typeLabel: 'Infografis',
    size: 'standard',
    badgeTag: 'SMP',
    publishStatus: 'published',
    publicAccess: 'allowed',
    description: 'Panduan praktis bagi remaja untuk mengenali, mencegah, dan melaporkan tindakan perundungan di dunia maya.',
    imageUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=800&q=80',
    imageAlt: 'Cerdas Bersosial Media: Hindari Cyberbullying',
    metadataText: '5 Menit',
    readTime: '5 Menit',
    views: 0,
    downloads: 0,
    progressPercent: 0,
    status: 'not_started',
    estimatedHours: 1.0,
    certificationAvailable: true,
    author: 'Direktorat Tindak Pidana Siber Bareskrim POLRI',
    publishDate: '10 Agustus 2026',
    downloadSize: '4.2 MB (Infografis HD)',
    summary: 'Infografis edukatif berisi panduan langkah demi langkah saat menghadapi cyberbullying, perlindungan privasi akun media sosial, pemahaman UU ITE yang relevan untuk pelajar, dan saluran hotline pelaporan cybercrime POLRI.',
    keyPoints: [
      'Gunakan saring sebelum sharing (THINK: Is it True, Helpful, Inspiring, Necessary, Kind?)',
      'Lindungi privasi: Jangan pernah membagikan PIN, password, alamat rumah, atau data sensitif',
      'Tindakan saat dirundung: Jangan membalas dengan emosi, simpan bukti screenshot, blokir pelaku, laporkan ke orang tua/guru dan saluran aduan resmi',
      'Jadilah netizen yang suportif dan hindari komentar bernada hate speech atau body shaming'
    ]
  },
  {
    id: 'mat-sma-01',
    title: 'Bahaya Narkoba & Kenakalan Remaja',
    level: 'SMA',
    type: 'modul',
    typeLabel: 'Modul Pembelajaran',
    size: 'standard',
    badgeTag: 'SMA',
    publishStatus: 'published',
    publicAccess: 'allowed',
    description: 'Materi komprehensif mengenai jenis-jenis narkoba, dampaknya bagi masa depan, serta strategi pencegahan di lingkungan sekolah.',
    imageUrl: 'https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?auto=format&fit=crop&w=800&q=80',
    imageAlt: 'Bahaya Narkoba & Kenakalan Remaja',
    metadataText: '12 Halaman',
    pageCount: 12,
    views: 0,
    downloads: 0,
    progressPercent: 0,
    status: 'not_started',
    estimatedHours: 2.0,
    certificationAvailable: true,
    author: 'Direktorat Tindak Pidana Narkoba Bareskrim POLRI',
    publishDate: '2 Agustus 2026',
    downloadSize: '8.7 MB (Modul Lengkap PDF)',
    summary: 'Buku panduan lengkap pencegahan penyalahgunaan narkotika, zat adiktif, dan tawuran pelajar. Mengulas dampak fisik, psikologis, sosial, dan konsekuensi hukum pidana bagi remaja yang terlibat tindak pelanggaran hukum.',
    keyPoints: [
      'Klasifikasi zat terlarang dan modifikasi baru yang sering menyasar generasi muda',
      'Faktor pemicu kenakalan remaja: tekanan kelompok sebaya, minimnya komunikasi keluarga, pengaruh digital',
      'Mekanisme hukum peradilan anak dan sanksi pidana narkotika',
      'Membangun lingkungan sekolah ramah dan berprestasi bebas narkoba'
    ]
  },
  {
    id: 'mat-tk-01',
    title: 'Mengenal Profesi Polisi Sahabat Anak',
    level: 'TK/PAUD',
    type: 'video',
    typeLabel: 'Video Edukasi',
    size: 'compact',
    badgeTag: 'TK/PAUD',
    publishStatus: 'published',
    publicAccess: 'allowed',
    description: 'Video animasi ceria memperkenalkan tugas mulia bapak dan ibu polisi dalam membantu masyarakat dan menjaga ketertiban.',
    imageUrl: 'https://images.unsplash.com/photo-1587654780291-39c9404d746b?auto=format&fit=crop&w=800&q=80',
    imageAlt: 'Mengenal Profesi Polisi Sahabat Anak',
    metadataText: '08:15',
    duration: '08:15',
    views: 0,
    downloads: 0,
    progressPercent: 0,
    status: 'not_started',
    estimatedHours: 0.5,
    certificationAvailable: true,
    author: 'Ditbinmas Baharkam POLRI',
    publishDate: '18 Juli 2026',
    summary: 'Pengenalan profesi polisi melalui lagu, dongeng, dan animasi yang ramah anak. Menumbuhkan rasa aman dan kedekatan anak-anak dengan aparat kepolisian saat membutuhkan bantuan di tempat umum.'
  },
  {
    id: 'mat-sd-02',
    title: 'Evaluasi Pemahaman Rambu & Marka Jalan Raya',
    level: 'SD',
    type: 'kuis',
    typeLabel: 'Kuis & Evaluasi',
    size: 'compact',
    badgeTag: 'SD',
    publishStatus: 'published',
    publicAccess: 'allowed',
    description: 'Tes interaktif pemahaman 10 jenis rambu larangan, peringatan, perintah, dan petunjuk untuk siswa sekolah dasar.',
    imageUrl: 'https://images.unsplash.com/photo-1606326608606-aa0b62935f2b?auto=format&fit=crop&w=800&q=80',
    imageAlt: 'Evaluasi Pemahaman Rambu',
    metadataText: '10 Pertanyaan',
    questionsCount: 10,
    views: 0,
    downloads: 0,
    progressPercent: 0,
    status: 'not_started',
    estimatedHours: 0.5,
    certificationAvailable: true,
    author: 'Korlantas POLRI',
    publishDate: '24 Juli 2026',
    quiz: [
      {
        id: 1,
        question: 'Rambu dengan lingkaran MERAH dan garis miring menunjukkan...',
        options: ['Rambu Larangan', 'Rambu Petunjuk', 'Rambu Peringatan', 'Rambu Informasi'],
        correctIndex: 0,
        explanation: 'Rambu lingkaran merah dengan garis silang/miring merupakan rambu larangan.'
      },
      {
        id: 2,
        question: 'Rambu berbentuk belah ketupat warna KUNING bergambar jalan berliku berfungsi sebagai...',
        options: ['Peringatan bahaya / kondisi jalan', 'Perintah wajib belok', 'Petunjuk arah kota', 'Larangan melintas'],
        correctIndex: 0,
        explanation: 'Warna dasar kuning menandakan rambu peringatan adanya potensi bahaya di depan.'
      }
    ]
  },
  {
    id: 'mat-smp-02',
    title: 'Panduan Aman Bersepeda ke Sekolah',
    level: 'SMP',
    type: 'artikel',
    typeLabel: 'Baca Artikel',
    size: 'compact',
    badgeTag: 'SMP',
    publishStatus: 'published',
    publicAccess: 'allowed',
    description: 'Tips berkendara sepeda di jalan lingkungan: kelengkapan pelindung, etika belok, dan memilih rute aman.',
    imageUrl: 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?auto=format&fit=crop&w=800&q=80',
    imageAlt: 'Panduan Aman Bersepeda ke Sekolah',
    metadataText: 'Baca Artikel',
    views: 0,
    downloads: 0,
    progressPercent: 0,
    status: 'not_started',
    estimatedHours: 1.0,
    certificationAvailable: true,
    author: 'Subditkamsel Korlantas POLRI',
    publishDate: '5 Agustus 2026',
    summary: 'Bersepeda merupakan aktivitas sehat dan menyenangkan. Artikel ini memuat 7 aturan emas bersepeda aman: mengenakan helm sepeda terkancing pas, menggunakan pakaian cerah/reflektor, memeriksa rem dan tekanan angin ban sebelum berangkat, serta memberi isyarat tangan saat hendak berbelok.'
  }
];
