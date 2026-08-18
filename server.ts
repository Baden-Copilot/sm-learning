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
  const PORT = 3000;

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
