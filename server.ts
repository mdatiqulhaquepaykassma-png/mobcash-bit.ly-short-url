import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const DB_FILE = path.join(__dirname, 'db.json');

interface ShortLink {
  id: string;
  originalUrl: string;
  shortCode: string;
  backHalf: string;
  createdAt: string;
}

interface DatabaseSchema {
  links: ShortLink[];
}

const defaultDb: DatabaseSchema = {
  links: []
};

// --- IN-MEMORY CACHE WITH ASYNC DEBOUNCED IO ---
let memoryDb: DatabaseSchema | null = null;
let writeTimeout: NodeJS.Timeout | null = null;
let isWriting = false;
let pendingWrite = false;

function readDb(): DatabaseSchema {
  if (memoryDb) {
    return memoryDb;
  }
  try {
    if (fs.existsSync(DB_FILE)) {
      const content = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      memoryDb = {
        links: Array.isArray(parsed.links) ? parsed.links : defaultDb.links
      };
      return memoryDb;
    } else {
      fs.writeFileSync(DB_FILE, JSON.stringify(defaultDb));
      memoryDb = defaultDb;
      return defaultDb;
    }
  } catch (err) {
    console.error('Failed to read database, preserving in-memory fallback', err);
    memoryDb = defaultDb;
    return defaultDb;
  }
}

function flushDbToDisk() {
  if (!memoryDb) return;
  if (isWriting) {
    pendingWrite = true;
    return;
  }
  isWriting = true;
  pendingWrite = false;
  fs.writeFile(DB_FILE, JSON.stringify(memoryDb), 'utf-8', (err) => {
    isWriting = false;
    if (err) {
      console.error('Failed to flush db.json:', err);
    }
    if (pendingWrite) {
      flushDbToDisk();
    }
  });
}

function writeDb(data: DatabaseSchema) {
  memoryDb = data;
  if (writeTimeout) clearTimeout(writeTimeout);
  writeTimeout = setTimeout(() => {
    flushDbToDisk();
  }, 200);
}

// Initial DB read
readDb();

async function startServer() {
  const app = express();
  app.use(express.json());

  // --- LINK MANAGEMENT APIS ---

  // Get all shortened links
  app.get('/api/links', (req, res) => {
    const db = readDb();
    res.json(db.links);
  });

  // Shorten a new destination URL
  app.post('/api/links', (req, res) => {
    const { originalUrl, backHalf } = req.body;
    if (!originalUrl) {
      return res.status(400).json({ error: 'Destination URL is required' });
    }

    const db = readDb();

    let shortCode = backHalf ? backHalf.trim().toLowerCase() : '';
    if (shortCode) {
      if (!/^[a-zA-Z0-9_\-]+$/.test(shortCode)) {
        return res.status(400).json({ error: 'Custom alias (back-half) can only contain letters, numbers, underscores, and dashes.' });
      }
      if (db.links.some(l => l.shortCode === shortCode)) {
        return res.status(400).json({ error: 'This custom back-half is already in use.' });
      }
    } else {
      let isUnique = false;
      while (!isUnique) {
        shortCode = Math.random().toString(36).substring(2, 9);
        isUnique = !db.links.some(l => l.shortCode === shortCode);
      }
    }

    const newLink: ShortLink = {
      id: `lnk_${Math.random().toString(36).substring(2, 9)}`,
      originalUrl,
      shortCode,
      backHalf: shortCode,
      createdAt: new Date().toISOString()
    };

    db.links.unshift(newLink);
    writeDb(db);

    res.status(201).json(newLink);
  });

  // Direct In-Place Update: Change original destination URL for existing link
  app.put('/api/links/:linkId', (req, res) => {
    const { linkId } = req.params;
    const { originalUrl, backHalf } = req.body;

    if (!originalUrl) {
      return res.status(400).json({ error: 'Destination URL is required' });
    }

    const db = readDb();
    const link = db.links.find(l => l.id === linkId);
    if (!link) {
      return res.status(404).json({ error: 'Link not found' });
    }

    // Custom back-half checks if changed
    if (backHalf && backHalf.trim().toLowerCase() !== link.shortCode.toLowerCase()) {
      const shortCode = backHalf.trim().toLowerCase();
      if (!/^[a-zA-Z0-9_\-]+$/.test(shortCode)) {
        return res.status(400).json({ error: 'Custom alias can only contain letters, numbers, underscores, and dashes.' });
      }
      if (db.links.some(l => l.id !== linkId && l.shortCode === shortCode)) {
        return res.status(400).json({ error: 'This custom back-half is already in use.' });
      }
      link.shortCode = shortCode;
      link.backHalf = shortCode;
    }

    link.originalUrl = originalUrl;
    writeDb(db);

    res.json({
      message: 'Original destination URL updated successfully!',
      link
    });
  });

  // Split Link creation: creates a new separate short link
  app.post('/api/links/:linkId/edit', (req, res) => {
    const { originalUrl, backHalf } = req.body;

    if (!originalUrl) {
      return res.status(400).json({ error: 'Destination URL is required' });
    }

    const db = readDb();

    let shortCode = backHalf ? backHalf.trim().toLowerCase() : '';
    if (shortCode) {
      if (!/^[a-zA-Z0-9_\-]+$/.test(shortCode)) {
        return res.status(400).json({ error: 'Custom alias can only contain letters, numbers, underscores, and dashes.' });
      }
      if (db.links.some(l => l.shortCode === shortCode)) {
        return res.status(400).json({ error: 'This custom back-half is already in use.' });
      }
    } else {
      let isUnique = false;
      while (!isUnique) {
        shortCode = Math.random().toString(36).substring(2, 9);
        isUnique = !db.links.some(l => l.shortCode === shortCode);
      }
    }

    const newLink: ShortLink = {
      id: `lnk_${Math.random().toString(36).substring(2, 9)}`,
      originalUrl,
      shortCode,
      backHalf: shortCode,
      createdAt: new Date().toISOString()
    };

    db.links.unshift(newLink);
    writeDb(db);

    res.status(201).json({
      message: 'Created a new separate short link.',
      newLink
    });
  });

  // Delete Link
  app.delete('/api/links/:linkId', (req, res) => {
    const { linkId } = req.params;
    const db = readDb();
    const target = decodeURIComponent(linkId).trim().toLowerCase();
    const index = db.links.findIndex(l => 
      l.id.toLowerCase() === target || 
      l.shortCode.toLowerCase() === target || 
      l.backHalf.toLowerCase() === target ||
      l.id === linkId
    );

    if (index === -1) {
      return res.status(404).json({ error: 'Link not found' });
    }

    const removed = db.links.splice(index, 1);
    writeDb(db);
    res.json({ message: 'Short link deleted successfully', link: removed[0] });
  });

  // --- LIGHTNING FAST REDIRECT HANDLER ---
  app.get('/r/:shortCode', (req, res) => {
    const { shortCode } = req.params;
    const db = readDb();

    const link = db.links.find(l => l.shortCode.toLowerCase() === shortCode.toLowerCase());
    if (!link) {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Link Not Found</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <script src="https://cdn.tailwindcss.com"></script>
        </head>
        <body class="bg-slate-50 text-slate-800 flex flex-col items-center justify-center min-h-screen p-6 font-sans">
          <div class="max-w-md w-full bg-white rounded-2xl shadow-lg border border-slate-100 p-8 text-center">
            <h1 class="text-2xl font-black text-slate-900 mb-2">Short Link Not Found</h1>
            <p class="text-slate-500 text-xs mb-6">The link you are trying to reach (/r/${shortCode}) does not exist or has been removed.</p>
            <a href="/" class="inline-flex items-center justify-center px-5 py-2.5 text-xs font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors">
              Return Home
            </a>
          </div>
        </body>
        </html>
      `);
    }

    res.redirect(302, link.originalUrl);
  });

  // --- VITE MIDDLEWARE OR STATIC PRODUCTION SERVING ---
  const isProd = process.env.NODE_ENV === 'production' || fs.existsSync(path.join(__dirname, 'dist'));
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[SERVER] Ultra-fast URL shortener active on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Server boot failed', err);
});
