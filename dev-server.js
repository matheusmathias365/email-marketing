/**
 * Servidor de desenvolvimento local que simula a estrutura do Vercel
 * Serve arquivos estáticos de /public e roteia /api/* para as serverless functions
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');
const API_DIR = path.join(__dirname, 'api');

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    return res.end();
  }

  // API routes
  if (pathname.startsWith('/api/')) {
    const apiFile = pathname.replace('/api/', '').replace(/\/$/, '') + '.js';
    const apiPath = path.join(API_DIR, apiFile);

    if (fs.existsSync(apiPath)) {
      try {
        // Ler body para POST
        let body = '';
        if (req.method === 'POST') {
          body = await new Promise((resolve) => {
            let data = '';
            req.on('data', chunk => data += chunk);
            req.on('end', () => resolve(data));
          });
          try { req.body = JSON.parse(body); } catch { req.body = {}; }
        }

        // Criar res simulado
        const resProxy = {
          statusCode: 200,
          headers: {},
          setHeader(key, val) { this.headers[key] = val; res.setHeader(key, val); },
          status(code) { this.statusCode = code; return this; },
          json(data) {
            res.writeHead(this.statusCode, { 'Content-Type': 'application/json', ...this.headers });
            res.end(JSON.stringify(data));
          },
          end() { res.end(); }
        };

        // Limpar cache do módulo para hot reload
        delete require.cache[require.resolve(apiPath)];
        const handler = require(apiPath);
        await handler(req, resProxy);
      } catch (err) {
        console.error('API Error:', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: 'Endpoint não encontrado' }));
    }
    return;
  }

  // Static files
  let filePath = pathname === '/' ? '/index.html' : pathname;
  filePath = path.join(PUBLIC_DIR, filePath);

  // Segurança: não sair do diretório public
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath);
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    const content = fs.readFileSync(filePath);
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  } else {
    // Fallback para SPA
    const indexPath = path.join(PUBLIC_DIR, 'index.html');
    if (fs.existsSync(indexPath)) {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(fs.readFileSync(indexPath));
    } else {
      res.writeHead(404);
      res.end('Not Found');
    }
  }
});

server.listen(PORT, () => {
  console.log('');
  console.log('  ╔══════════════════════════════════════════════╗');
  console.log('  ║                                              ║');
  console.log('  ║   📧  EMAIL MARKETING PRO — Dev Server       ║');
  console.log('  ║                                              ║');
  console.log(`  ║   🌐  http://localhost:${PORT}                  ║`);
  console.log('  ║                                              ║');
  console.log('  ║   Simulando estrutura Vercel localmente      ║');
  console.log('  ║                                              ║');
  console.log('  ╚══════════════════════════════════════════════╝');
  console.log('');
});
