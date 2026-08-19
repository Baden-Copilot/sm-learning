import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { INITIAL_MATERIALS, MOCK_NOTIFICATIONS } from './src/data/materials';
import { MaterialItem } from './src/types';

// In-memory data store for server-backed state
let materialsStore: MaterialItem[] = [...INITIAL_MATERIALS];
let notificationsStore = [...MOCK_NOTIFICATIONS];

async function startServer() {
  const app = express();
  const PORT = 4003;

  app.use(express.json());

  // API Routes
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'E-Learning Safety Education POLRI Server',
      timestamp: new Date().toISOString()
    });
  });

  // Get catalog materials with filtering, search, and sorting
  app.get('/api/materials', (req, res) => {
    const { level, type, q, sort, limit } = req.query;

    let filtered = [...materialsStore];

    if (level && level !== 'ALL') {
      filtered = filtered.filter(item => item.level.toUpperCase() === String(level).toUpperCase());
    }

    if (type && type !== 'all') {
      filtered = filtered.filter(item => item.type.toLowerCase() === String(type).toLowerCase());
    }

    if (q && typeof q === 'string' && q.trim().length > 0) {
      const search = q.toLowerCase();
      filtered = filtered.filter(item =>
        item.title.toLowerCase().includes(search) ||
        item.description.toLowerCase().includes(search) ||
        item.level.toLowerCase().includes(search) ||
        item.typeLabel.toLowerCase().includes(search) ||
        (item.author && item.author.toLowerCase().includes(search))
      );
    }

    if (sort === 'popular') {
      filtered.sort((a, b) => b.views - a.views);
    } else if (sort === 'downloads') {
      filtered.sort((a, b) => (b.downloads || 0) - (a.downloads || 0));
    } else if (sort === 'az') {
      filtered.sort((a, b) => a.title.localeCompare(b.title));
    }

    const totalCount = filtered.length;

    if (limit) {
      const numLimit = parseInt(String(limit), 10);
      if (!isNaN(numLimit)) {
        filtered = filtered.slice(0, numLimit);
      }
    }

    res.json({
      success: true,
      total: totalCount,
      count: filtered.length,
      data: filtered
    });
  });

  // Get single material detail
  app.get('/api/materials/:id', (req, res) => {
    const { id } = req.params;
    const material = materialsStore.find(item => item.id === id);
    if (!material) {
      return res.status(404).json({ success: false, message: 'Material not found' });
    }
    return res.json({ success: true, data: material });
  });

  // Increment views
  app.post('/api/materials/:id/view', (req, res) => {
    const { id } = req.params;
    const index = materialsStore.findIndex(item => item.id === id);
    if (index !== -1) {
      materialsStore[index].views += 1;
      return res.json({ success: true, views: materialsStore[index].views });
    }
    return res.status(404).json({ success: false, message: 'Material not found' });
  });

  // Increment downloads
  app.post('/api/materials/:id/download', (req, res) => {
    const { id } = req.params;
    const index = materialsStore.findIndex(item => item.id === id);
    if (index !== -1) {
      materialsStore[index].downloads = (materialsStore[index].downloads || 0) + 1;
      return res.json({ success: true, downloads: materialsStore[index].downloads });
    }
    return res.status(404).json({ success: false, message: 'Material not found' });
  });

  // Toggle bookmark
  app.post('/api/materials/:id/bookmark', (req, res) => {
    const { id } = req.params;
    const index = materialsStore.findIndex(item => item.id === id);
    if (index !== -1) {
      materialsStore[index].bookmarked = !materialsStore[index].bookmarked;
      return res.json({ success: true, bookmarked: materialsStore[index].bookmarked });
    }
    return res.status(404).json({ success: false, message: 'Material not found' });
  });

  // Stats summary
  app.get('/api/stats', (_req, res) => {
    const totalMaterials = materialsStore.length;
    const totalViews = materialsStore.reduce((acc, curr) => acc + curr.views, 0);
    const totalDownloads = materialsStore.reduce((acc, curr) => acc + (curr.downloads || 0), 0);
    const countsByLevel = {
      'TK/PAUD': materialsStore.filter(m => m.level === 'TK/PAUD').length,
      'SD': materialsStore.filter(m => m.level === 'SD').length,
      'SMP': materialsStore.filter(m => m.level === 'SMP').length,
      'SMA': materialsStore.filter(m => m.level === 'SMA').length
    };

    res.json({
      success: true,
      data: {
        totalMaterials,
        totalViews,
        totalDownloads,
        countsByLevel
      }
    });
  });

  // Notifications API
  app.get('/api/notifications', (_req, res) => {
    res.json({ success: true, data: notificationsStore });
  });

  app.post('/api/notifications/mark-read', (_req, res) => {
    notificationsStore = notificationsStore.map(n => ({ ...n, read: true }));
    res.json({ success: true, data: notificationsStore });
  });

  app.post('/api/ask-ai', async (req, res) => {
    const { messages } = req.body;
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY!,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 500,
          system: `Kamu adalah Alesha AI, asisten AI untuk platform "E-Learning Dikmas Lantas" — Portal Katalog Materi Edukasi Keselamatan POLRI untuk jenjang TK/PAUD, SD, SMP, dan SMA, berisi modul interaktif, video edukasi, dan kuis evaluasi.

  Tugas kamu:
  - Jawab pertanyaan seputar KONTEN materi yang ada di platform ini: keselamatan berlalu lintas, rambu-rambu, etika berkendara, keamanan digital/cyberbullying, bahaya narkoba, dan topik terkait lain yang relevan untuk edukasi pelajar TK sampai SMA.
  - Bantu pengguna menemukan modul yang relevan di katalog (misal arahkan ke kategori jenjang atau jenis materi yang sesuai).
  - Jawab dengan bahasa yang ramah, singkat, jelas, dan sesuai usia pelajar (hindari istilah terlalu teknis/berat).
  - Kalau ditanya hal di luar topik keselamatan lalu lintas, keamanan digital, atau materi edukasi POLRI, arahkan sopan kembali ke topik platform ini — jangan menjawab topik yang sama sekali tidak berkaitan (misal: coding, gosip, politik, dsb).
  - Kamu TIDAK memberikan saran hukum resmi atau keputusan administratif (misal status SIM/tilang individu) — untuk itu arahkan ke layanan resmi POLRI (110 atau kantor Satlantas terdekat).`,
          messages: messages.map((m: any) => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await response.json();
      const reply = data.content?.[0]?.text ?? 'Maaf, tidak ada jawaban.';
      res.json({ reply });
    } catch (err) {
      res.status(500).json({ reply: 'Terjadi kesalahan server.' });
    }
  });

  // Vite development middleware vs production static files
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[POLRI E-Learning] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
