import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const DEFAULT_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwLTVcv2eDSsgnmTrOqOIrxhdXEtMdxBep_JSu_7Oxm94jyVCFS6JXqiATz9u5_dMBJCQ/exec";
const DEFAULT_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vT9RHKZ8DMDbCnUetowUM5X46nojL_zHtOE8OH7PMXvt7sH1ay3CZiKJ-9F7trKbwiJTWfYYF9T1wgU/pub?output=csv";

// In-memory real-time state & connected clients
let cachedData: any[] = [];
let lastDataHash = '';
const sseClients = new Set<Response>();

function broadcastSSE(payload: { type: string; data?: any; timestamp?: string }) {
  const message = `data: ${JSON.stringify({ ...payload, timestamp: new Date().toISOString() })}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(message);
    } catch {
      sseClients.delete(client);
    }
  }
}

// Helper to parse CSV if fetching via CSV publish link
function parseCSV(text: string): Record<string, string>[] {
  const lines: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let insideQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (insideQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          insideQuotes = false;
        }
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      insideQuotes = true;
    } else if (ch === ',') {
      row.push(cell.trim());
      cell = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cell.trim());
      lines.push(row);
      row = [];
      cell = '';
    } else {
      cell += ch;
    }
  }
  if (cell || row.length) {
    row.push(cell.trim());
    lines.push(row);
  }

  if (lines.length < 2) return [];
  const headers = lines[0].map(h => h.trim().toLowerCase());
  return lines.slice(1).filter(r => r[0]).map(r => {
    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      obj[h] = r[idx] || '';
    });
    return obj;
  });
}

// Background Sheet Sync Worker (checks every 3.5 seconds for real-time updates)
async function fetchRemoteSheetData(): Promise<any[] | null> {
  try {
    const resp = await fetch(DEFAULT_SCRIPT_URL, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      redirect: 'follow',
    });
    if (resp.ok) {
      const text = await resp.text();
      try {
        const json = JSON.parse(text);
        if (Array.isArray(json) && json.length > 0) {
          return json;
        }
      } catch {}
    }
  } catch {}

  // Fallback to CSV
  try {
    const csvResp = await fetch(`${DEFAULT_CSV_URL}&_t=${Date.now()}`);
    if (csvResp.ok) {
      const text = await csvResp.text();
      const parsed = parseCSV(text);
      if (parsed.length > 0) return parsed;
    }
  } catch {}

  return null;
}

// Continuous Real-Time Poller
async function pollGoogleSheet() {
  const remote = await fetchRemoteSheetData();
  if (remote && Array.isArray(remote)) {
    const newHash = JSON.stringify(remote);
    if (newHash !== lastDataHash) {
      lastDataHash = newHash;
      cachedData = remote;
      broadcastSSE({ type: 'update', data: remote });
    }
  }
}

// Start real-time background poller
setInterval(pollGoogleSheet, 3500);
pollGoogleSheet(); // Initial fetch

// SSE Endpoint for instant real-time push to frontend clients
app.get('/api/sheet/events', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  // Send current cached state immediately
  res.write(`data: ${JSON.stringify({ type: 'init', data: cachedData, timestamp: new Date().toISOString() })}\n\n`);

  sseClients.add(res);

  // Keep-alive heartbeat ping every 15 seconds
  const heartbeat = setInterval(() => {
    res.write(': heartbeat\n\n');
  }, 15000);

  req.on('close', () => {
    clearInterval(heartbeat);
    sseClients.delete(res);
  });
});

// GET Sheet Data via Apps Script or CSV (with memory cache fallback)
app.get('/api/sheet/data', async (req: Request, res: Response) => {
  try {
    const scriptUrl = (req.query.scriptUrl as string) || DEFAULT_SCRIPT_URL;
    const csvUrl = (req.query.csvUrl as string) || DEFAULT_CSV_URL;

    // If using default urls and cache is populated, return fast
    if (scriptUrl === DEFAULT_SCRIPT_URL && cachedData.length > 0 && req.query.fresh !== 'true') {
      return res.json({ ok: true, source: 'realtime_cache', data: cachedData });
    }

    if (scriptUrl) {
      try {
        const resp = await fetch(scriptUrl, {
          method: 'GET',
          headers: { 'Accept': 'application/json' },
          redirect: 'follow',
        });
        const text = await resp.text();
        try {
          const json = JSON.parse(text);
          if (Array.isArray(json)) {
            cachedData = json;
            lastDataHash = JSON.stringify(json);
            return res.json({ ok: true, source: 'apps_script', data: json });
          }
        } catch {}
      } catch (err) {
        console.warn('Apps Script GET failed, trying CSV fallback:', err);
      }
    }

    if (csvUrl) {
      const resp = await fetch(`${csvUrl}&_t=${Date.now()}`);
      if (!resp.ok) {
        throw new Error(`Failed to fetch CSV: ${resp.status} ${resp.statusText}`);
      }
      const csvText = await resp.text();
      const parsed = parseCSV(csvText);
      cachedData = parsed;
      lastDataHash = JSON.stringify(parsed);
      return res.json({ ok: true, source: 'csv', data: parsed });
    }

    if (cachedData.length > 0) {
      return res.json({ ok: true, source: 'memory_cache', data: cachedData });
    }

    return res.status(400).json({ ok: false, error: 'No valid data source configured.' });
  } catch (error: any) {
    console.error('Error fetching sheet data:', error);
    if (cachedData.length > 0) {
      return res.json({ ok: true, source: 'cache_fallback', data: cachedData });
    }
    return res.status(500).json({ ok: false, error: error.message || 'Failed to fetch data' });
  }
});

// POST to save or update row in Google Sheet via Apps Script
app.post('/api/sheet/save', async (req: Request, res: Response) => {
  try {
    const scriptUrl = (req.body.scriptUrl as string) || DEFAULT_SCRIPT_URL;
    const rowData = req.body.data;

    if (!rowData || !rowData.id) {
      return res.status(400).json({ ok: false, error: 'Invalid row data: missing id' });
    }

    if (!rowData.updated) {
      rowData.updated = new Date().toISOString();
    }

    // Real-time optimistic update of cachedData
    const existingIndex = cachedData.findIndex(item => String(item.id) === String(rowData.id));
    if (existingIndex >= 0) {
      cachedData[existingIndex] = { ...cachedData[existingIndex], ...rowData };
    } else {
      cachedData.push(rowData);
    }
    lastDataHash = JSON.stringify(cachedData);

    // Immediately broadcast updated state to all connected clients
    broadcastSSE({ type: 'update', data: cachedData });

    // Forward save directly to Google Apps Script
    if (scriptUrl) {
      fetch(scriptUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify(rowData),
        redirect: 'follow',
      }).catch(err => {
        console.warn('Asynchronous Apps Script save dispatch error:', err);
      });
    }

    return res.json({ ok: true, message: 'Saved and broadcast in real-time' });
  } catch (error: any) {
    console.error('Error saving to sheet:', error);
    return res.status(500).json({ ok: false, error: error.message || 'Failed to save to sheet' });
  }
});

// Health check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ ok: true, realtimeClients: sseClients.size, timestamp: new Date().toISOString() });
});

async function startServer() {
  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT} (${isDev ? 'development' : 'production'})`);
  });
}

startServer();
