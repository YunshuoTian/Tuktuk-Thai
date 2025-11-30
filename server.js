import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'storage.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initialize data file if it doesn't exist
if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, JSON.stringify({ vocabulary: [], folders: [] }));
}

app.use(express.json());
app.use(express.static(path.join(__dirname, 'dist')));

// Proxy for Google Translate API (Bypassing CORS in production/docker)
app.get('/translate_a/single', async (req, res) => {
  try {
    const targetUrl = 'https://translate.googleapis.com/translate_a/single';
    
    // Fix: URLSearchParams(req.query) converts arrays to comma-separated strings (e.g. dt=t,rm)
    // which causes 404/400 errors from Google. We must append them individually.
    const params = new URLSearchParams();
    Object.keys(req.query).forEach(key => {
      const value = req.query[key];
      if (Array.isArray(value)) {
        value.forEach(v => params.append(key, v));
      } else {
        params.append(key, value);
      }
    });

    const fullUrl = `${targetUrl}?${params.toString()}`;

    const response = await fetch(fullUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: 'Upstream API error' });
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Proxy Error:', error);
    res.status(500).json({ error: 'Proxy request failed' });
  }
});

// API Routes for Persistence
app.get('/api/data', (req, res) => {
  try {
    const data = fs.readFileSync(DATA_FILE, 'utf8');
    res.json(JSON.parse(data));
  } catch (error) {
    console.error('Error reading data:', error);
    res.status(500).json({ error: 'Failed to read data' });
  }
});

app.post('/api/data', (req, res) => {
  try {
    const { vocabulary, folders } = req.body;
    fs.writeFileSync(DATA_FILE, JSON.stringify({ vocabulary, folders }, null, 2));
    res.json({ success: true });
  } catch (error) {
    console.error('Error writing data:', error);
    res.status(500).json({ error: 'Failed to save data' });
  }
});

// Catch-all handler for SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`Data storage path: ${DATA_FILE}`);
});