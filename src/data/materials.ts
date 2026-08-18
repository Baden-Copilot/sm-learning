import { MaterialItem } from '../types';

export const POLRI_LOGO_URL = 'https://lh3.googleusercontent.com/aida-public/AB6AXuAcSXSz4YxUZMh7d3NrwpNi5qkb0mfyGjeer_Uz3l2rBckm737bwvkoAXOhuRSngAgg7XunA31flBK74xBTwywGWvPDOx_AJrXaVda0TjgcxPaPe056kWCVFIFBmR2o0pfzfoHdgH0pi-MXe-1z8EO4gvfwIlAlMgSK1oJ0au5x0WqFKnUfh1w7r3NNKUqYaFXhPyeEEPbu5f6EHZp5-AOhR_1ZoRqODkahl16uD9SElAN9yqPx8s8';

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
    description: 'Modul interaktif yang mengajarkan dasar-dasar keselamatan di jalan raya, pengenalan rambu lalu lintas sederhana, dan cara menyeberang jalan yang aman.',
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBnSyZtVLIHEhxbwyh7cszaAHr6MRicFICDDpw5go9eNyHU4XYOyrWVbjmtJwCB8uqV11Pxd3hFjWXHvwVx_2lOcNboxEYLG3Aw6P7QhBRB7OVprR5ZB02RGlBQOpqJGo4Bp23W-J6p2FOLreynqYoxZUllmUG8YpV5f_w1zqWNz0GuKkrvaAmlIc9UIYO_wDfwEr9iP99HN2TXgj7dR8ViQGlaXUXPiDGOEUksGsWNuW8OrE1SQ9M',
    imageAlt: 'Pedoman Keselamatan Berlalu Lintas untuk Anak Usia Dini',
    metadataText: 'Baru Ditambahkan',
    views: 1240,
    downloads: 850,
    readTime: '12 Menit',
    author: 'Korlantas POLRI & Kemendikbudristek',
    publishDate: '15 Agustus 2026',
    downloadSize: '18.4 MB (PDF + Video Ringkasan)',
    summary: 'Materi ini dirancang khusus untuk mengajarkan etika berlalu lintas sejak dini. Mulai dari aturan menyeberang di Zebra Cross (4T: Tunggu, Tengok kanan, Tengok kiri, Tengok kanan lagi), mengenali warna lampu APILL (Alat Pemberi Isyarat Lalu Lintas), hingga kewajiban menggunakan helm SNI.',
    keyPoints: [
      'Memahami arti warna lampu lalu lintas (Merah: Berhenti, Kuning: Hati-hati/Bersiap, Hijau: Jalan)',
      'Prinsip 4T saat menyeberang di Zebra Cross dan Jembatan Penyeberangan Orang (JPO)',
      'Penggunaan helm berstandar SNI bagi anak yang dibonceng motor',
      'Etika berjalan di trotoar yang aman dan menjauhi bahaya blind spot kendaraan besar'
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
    title: 'Cerdas Bersosial Media: Hindari Cyberbullying',
    level: 'SMP',
    type: 'infografis',
    typeLabel: 'Infografis',
    size: 'standard',
    badgeTag: 'SMP',
    description: 'Panduan praktis bagi remaja untuk mengenali, mencegah, dan melaporkan tindakan perundungan di dunia maya.',
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAFe_9rgfQzq3hj1YPgi7JGnDIJpQFBLkXD2yfNJYMdyV3YyFI3GLuQ-vS0lJW5kl-Zjwta_-9T9JrGCHw5vldn8o182VFj0eU5WR0EVxLPmx_CJs26dzNFee_cOOYdDR-oNycLNmcCbaToQxSW8eyxQ1rLRU0Nzc8SsePCvJGGHgOHpfSLOJ0kHEKaCkNd1sIK5sCv-K85Wt_vboYupu3TaZSquH3tCECcM3ufemdqPcEUfcjVmyA',
    imageAlt: 'Cerdas Bersosial Media: Hindari Cyberbullying',
    metadataText: '5 Menit',
    readTime: '5 Menit',
    views: 845,
    downloads: 412,
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
    description: 'Materi komprehensif mengenai jenis-jenis narkoba, dampaknya bagi masa depan, serta strategi pencegahan di lingkungan sekolah.',
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDOTmWkPrYBuplB62P01djJvNGi7J107XTm0o63EnPaaZdkSJYk93VAThGrvLMlc_957teoc3jHIuO0aFlPOJTY3i1THLpmhAxQfKMVaJXIturUk5fqxSgbOqb-rtSz7DQCj80JLoM32U1eBOKFR4NfbW-3W7-FvNOjOHLHcGHZNr9nW5O3qRek-jdpBx1_Q1KFqSN_2f3fucm_QWj_455S-6DbjqLKgC8TNLD2vEcfemR3qFlSr8k',
    imageAlt: 'Bahaya Narkoba & Kenakalan Remaja',
    metadataText: '12 Halaman',
    pageCount: 12,
    views: 3200,
    downloads: 3200,
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
    description: 'Video animasi ceria memperkenalkan tugas mulia bapak dan ibu polisi dalam membantu masyarakat dan menjaga ketertiban.',
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAyUcZm2_aBHxbXXr5sTwXfAx0ZoXhQ8DMVWI6ckoSuIzztPBdL7Zk24ZZ1H9TV5qHfeukRUBTe5rEv1AKgCujuFmMKTLBAjCjzv8IvD5Q8Y0hjs5qFNqezD2oMYbux9r8utqFf4V585wlMUYJ0ZeFuUWc_eKFnTUFy0mUZPEE6x9FUyY1zp7DfKk96v3alZsxRSmdzWrsRVM3Ej6Wrro43a16uJYRcaost3IirIYPqJYBnJnzter0',
    imageAlt: 'Mengenal Profesi Polisi Sahabat Anak',
    metadataText: '3:45',
    duration: '3:45',
    views: 2150,
    downloads: 980,
    author: 'Binmas POLRI',
    publishDate: '18 Juli 2026',
    summary: 'Pengenalan profesi polisi melalui lagu, dongeng, dan animasi yang ramah anak. Menumbuhkan rasa aman dan kedekatan anak-anak dengan aparat kepolisian saat membutuhkan bantuan di tempat umum.'
  },
  {
    id: 'mat-smp-02',
    title: 'Kuis: Uji Pengetahuan Keamanan Digital',
    level: 'SMP',
    type: 'kuis',
    typeLabel: 'Kuis & Evaluasi',
    size: 'compact',
    badgeTag: 'SMP',
    description: 'Uji pemahaman Anda tentang etika internet, deteksi hoaks, dan proteksi akun media sosial.',
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD1b5uaFTkOwEgkK0O_x35hzROtqMcxtCGcP-QJ3McaLHz3PhKpFIcT21oVpndw6dQjlB_dX5TKFcHjyEBeoWMVTKKsfoPmo0rk3ydtI6KRvTFNJ8Ced58-LMnj0Vijc9GhKQnmvyxWYTiBXWJ7HNnxcfijLJlXlznO9RvewXjcMFa8mocBFAaYxL8NLmZ24Vmjnvix98RasSSfWUIDUTry3zey04-nI8lfzl5CW2KUL5XMQ0ovlII',
    imageAlt: 'Kuis: Uji Pengetahuan Keamanan Digital',
    metadataText: '15 Pertanyaan',
    questionsCount: 15,
    views: 1540,
    downloads: 620,
    author: 'Pusiknas Bareskrim POLRI',
    publishDate: '24 Juli 2026',
    quiz: [
      {
        id: 1,
        question: 'Manakah kombinasi kata sandi (password) yang paling kuat dan aman?',
        options: ['12345678', 'namasaya2024', 'P@ssw0rd_K3s3l4m4t4n!', 'tanggal lahir saya'],
        correctIndex: 2,
        explanation: 'Kata sandi yang kuat mengombinasikan huruf besar, huruf kecil, angka, dan karakter simbol serta minimal 12 karakter.'
      },
      {
        id: 2,
        question: 'Ketika menerima tautan (link) mencurigakan yang menjanjikan pulsa gratis di WhatsApp, sikap terbaik adalah...',
        options: ['Langsung klik dan sebarkan ke semua grup', 'Verifikasi sumber resmi, jangan klik, dan segera hapus/laporkan', 'Isi data diri dan nomor KTP orang tua', 'Bagikan nomor OTP yang masuk'],
        correctIndex: 1,
        explanation: 'Tautan tak dikenal berpotensi phising atau malware. Selalu verifikasi kebenaran info sebelum berinteraksi.'
      },
      {
        id: 3,
        question: 'Apa kepanjangan dari 2FA dalam keamanan akun digital?',
        options: ['Two-Factor Authentication (Autentikasi Dua Langkah)', 'Two-Free Account', 'Total Fast Access', 'True Feedback Analytics'],
        correctIndex: 0,
        explanation: '2FA memberikan lapisan keamanan ganda selain password untuk melindungi akun dari peretasan.'
      }
    ]
  },
  {
    id: 'mat-sd-02',
    title: 'Panduan Aman Bersepeda ke Sekolah',
    level: 'SD',
    type: 'artikel',
    typeLabel: 'Baca Artikel',
    size: 'compact',
    badgeTag: 'SD',
    description: 'Tips berkendara sepeda di jalan lingkungan: kelengkapan pelindung, etika belok, dan memilih rute aman.',
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAOMMZE4cSJICqBwC0JD-kCqiGLw-ThX7rmLjrKIEE-O19Cs5lBM51m1u1WUFQurgyYmfp--OqRo1gMYHui6W0AT-vSxceA1PqyK--33s9M29HV66ZvlTwqTclQITqVTOXoew8unTijb0wKIwpo8ExkFa6qMMlQPXKLZUZhCi6Ej6mTvKwtZ4yeqNjdrr6iRBJzrZkwrfo4reYJ8D0QlTg-Wpkjn5O2AE0epbRC5E4hI-7TjGNh7Ww',
    imageAlt: 'Panduan Aman Bersepeda ke Sekolah',
    metadataText: 'Baca Artikel',
    views: 920,
    downloads: 340,
    author: 'Ditlantas Polda Metro Jaya',
    publishDate: '5 Agustus 2026',
    summary: 'Bersepeda merupakan aktivitas sehat dan menyenangkan. Artikel ini memuat 7 aturan emas bersepeda aman: mengenakan helm sepeda terkancing pas, menggunakan pakaian cerah/reflektor, memeriksa rem dan tekanan angin ban sebelum berangkat, serta memberi isyarat tangan saat hendak berbelok.'
  },
  // Extra loaded materials for "Muat Lebih Banyak" / pagination & deep level filtering
  {
    id: 'mat-sma-02',
    title: 'Tata Tertib Berkendara & Prosedur Memperoleh SIM C untuk Pelajar 17+',
    level: 'SMA',
    type: 'video',
    typeLabel: 'Video Edukasi',
    size: 'standard',
    badgeTag: 'SMA',
    description: 'Panduan lengkap uji teori dan praktik ujian SIM C, serta etika berkendara defensif di jalan raya raya.',
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDOTmWkPrYBuplB62P01djJvNGi7J107XTm0o63EnPaaZdkSJYk93VAThGrvLMlc_957teoc3jHIuO0aFlPOJTY3i1THLpmhAxQfKMVaJXIturUk5fqxSgbOqb-rtSz7DQCj80JLoM32U1eBOKFR4NfbW-3W7-FvNOjOHLHcGHZNr9nW5O3qRek-jdpBx1_Q1KFqSN_2f3fucm_QWj_455S-6DbjqLKgC8TNLD2vEcfemR3qFlSr8k',
    imageAlt: 'Tata Tertib Berkendara SIM C Pelajar',
    metadataText: '18 Menit',
    readTime: '18 Menit',
    views: 4190,
    downloads: 2100,
    author: 'Korlantas POLRI',
    publishDate: '12 Juli 2026',
    summary: 'Penjelasan rinci tata tertib pengemudi motor pemula, bahaya modifikasi knalpot bising (brong), dan kepatuhan pada rambu prioritas.'
  },
  {
    id: 'mat-tk-02',
    title: 'Lagu Edukasi Lalu Lintas: Lampu Merah Kuning Hijau',
    level: 'TK/PAUD',
    type: 'video',
    typeLabel: 'Video Edukasi',
    size: 'compact',
    badgeTag: 'TK/PAUD',
    description: 'Lagu riang gembira beranimasi mengajak anak-anak menghafal rambu lalu lintas sambil bernyanyi bersama.',
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAyUcZm2_aBHxbXXr5sTwXfAx0ZoXhQ8DMVWI6ckoSuIzztPBdL7Zk24ZZ1H9TV5qHfeukRUBTe5rEv1AKgCujuFmMKTLBAjCjzv8IvD5Q8Y0hjs5qFNqezD2oMYbux9r8utqFf4V585wlMUYJ0ZeFuUWc_eKFnTUFy0mUZPEE6x9FUyY1zp7DfKk96v3alZsxRSmdzWrsRVM3Ej6Wrro43a16uJYRcaost3IirIYPqJYBnJnzter0',
    imageAlt: 'Lagu Edukasi Lalu Lintas',
    metadataText: '2:15',
    duration: '2:15',
    views: 3410,
    downloads: 1400,
    author: 'Polisi Sahabat Anak Nasional',
    publishDate: '1 Juli 2026'
  },
  {
    id: 'mat-smp-03',
    title: 'Modul Penanggulangan Hoaks dan Berita Bohong di Kalangan Pelajar',
    level: 'SMP',
    type: 'modul',
    typeLabel: 'Modul Pembelajaran',
    size: 'standard',
    badgeTag: 'SMP',
    description: 'Langkah taktis memverifikasi kebenaran informasi, mengenali ciri-ciri hoaks, dan menjaga jejak digital positif.',
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAFe_9rgfQzq3hj1YPgi7JGnDIJpQFBLkXD2yfNJYMdyV3YyFI3GLuQ-vS0lJW5kl-Zjwta_-9T9JrGCHw5vldn8o182VFj0eU5WR0EVxLPmx_CJs26dzNFee_cOOYdDR-oNycLNmcCbaToQxSW8eyxQ1rLRU0Nzc8SsePCvJGGHgOHpfSLOJ0kHEKaCkNd1sIK5sCv-K85Wt_vboYupu3TaZSquH3tCECcM3ufemdqPcEUfcjVmyA',
    imageAlt: 'Modul Penanggulangan Hoaks',
    metadataText: '16 Halaman',
    pageCount: 16,
    views: 1820,
    downloads: 940,
    author: 'Divisi Humas POLRI',
    publishDate: '28 Juni 2026'
  }
];

export const MOCK_NOTIFICATIONS: { id: string; title: string; message: string; time: string; read: boolean; type: 'info' | 'alert' | 'success' }[] = [
  {
    id: 'notif-1',
    title: 'Modul Baru Ditambahkan',
    message: 'Pedoman Keselamatan Berlalu Lintas untuk Anak Usia Dini siap diakses.',
    time: '10 menit yang lalu',
    read: false,
    type: 'info'
  },
  {
    id: 'notif-2',
    title: 'Ujian Kuis Sertifikasi Tersedia',
    message: 'Kuis Uji Pengetahuan Keamanan Digital telah diperbarui dengan materi terbaru.',
    time: '2 jam yang lalu',
    read: false,
    type: 'success'
  },
  {
    id: 'notif-3',
    title: 'Himbauan Operasi Keselamatan Pelajar',
    message: 'Kampanye tertib berkendara di lingkungan sekolah serentak dilaksanakan.',
    time: '1 hari yang lalu',
    read: true,
    type: 'alert'
  }
];
