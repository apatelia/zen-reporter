import { spawn } from 'child_process';
import { createReadStream, existsSync, statSync } from 'fs';
import { createServer } from 'http';
import { extname, join, normalize, relative, resolve } from 'path';
import { SqliteHistoryStore } from '../../dist/reporter.js';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.wasm': 'application/wasm',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
};

/**
 * Launches default system web browser to open the specified report URL.
 *
 * @param {string} url - Local server HTTP URL to open.
 */
function openBrowser(url) {
  try {
    let child;
    if (process.platform === 'darwin') {
      child = spawn('open', [url], { stdio: 'ignore', detached: true });
    } else if (process.platform === 'win32') {
      child = spawn('cmd.exe', ['/c', 'start', '""', url], {
        stdio: 'ignore',
        detached: true,
        windowsVerbatimArguments: true,
      });
    } else {
      child = spawn('xdg-open', [url], { stdio: 'ignore', detached: true });
    }
    child.on('error', () => {});
    child.unref();
  } catch {
    /* ignore browser launch errors */
  }
}

/**
 * Serves and displays the generated HTML report using an internal Node.js static server bound to 127.0.0.1.
 *
 * @param {string} [cwd=process.cwd()] - Current working directory.
 */
export function handleShow(cwd = process.cwd()) {
  const outputDir = process.env.PW_REPORTER_OUTPUT || 'zen-report';
  const reportDir = resolve(cwd, outputDir);
  const indexPath = join(reportDir, 'index.html');

  if (!existsSync(indexPath)) {
    throw new Error(
      `Report file not found at "${outputDir}/index.html".\n  Make sure you have run your Playwright tests first.`
    );
  }

  const dbPath = join(reportDir, 'history.db');
  let historyStore = null;
  if (existsSync(dbPath)) {
    try {
      historyStore = new SqliteHistoryStore({ dbPath, autoMigrate: false });
    } catch {
      /* ignore db init error */
    }
  }

  const server = createServer(async (req, res) => {
    const urlObj = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    const pathname = urlObj.pathname;

    // API Routes for Multi-Run Browsing
    if (pathname.startsWith('/api/')) {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache');

      if (!historyStore) {
        res.writeHead(503);
        res.end(JSON.stringify({ error: 'History database not available' }));
        return;
      }

      if (pathname === '/api/runs' && req.method === 'GET') {
        try {
          const history = await historyStore.getHistoryData();
          res.writeHead(200);
          res.end(JSON.stringify({ runs: history.runs }));
        } catch (e) {
          res.writeHead(500);
          res.end(JSON.stringify({ error: String(e?.message || e) }));
        }
        return;
      }

      const runMatch = pathname.match(/^\/api\/runs\/([^/]+)$/);
      if (runMatch && req.method === 'GET') {
        const runId = decodeURIComponent(runMatch[1]);
        try {
          const runReport = await historyStore.getRunReport(runId);
          if (!runReport) {
            res.writeHead(404);
            res.end(JSON.stringify({ error: `Run "${runId}" not found` }));
            return;
          }
          res.writeHead(200);
          res.end(JSON.stringify(runReport));
        } catch (e) {
          res.writeHead(500);
          res.end(JSON.stringify({ error: String(e?.message || e) }));
        }
        return;
      }

      res.writeHead(404);
      res.end(JSON.stringify({ error: 'Not Found' }));
      return;
    }

    const rawPath = decodeURIComponent(pathname);
    const safePath = normalize(rawPath).replace(/^(\.\.[/\\])+/, '');
    let filePath = resolve(reportDir, safePath.startsWith('/') ? safePath.slice(1) : safePath);

    const rel = relative(reportDir, filePath);
    if (rel.startsWith('..') || resolve(reportDir, rel) !== filePath) {
      res.writeHead(403, { 'Content-Type': 'text/plain' });
      res.end('Forbidden');
      return;
    }

    if (existsSync(filePath) && statSync(filePath).isDirectory()) {
      filePath = join(filePath, 'index.html');
    }

    if (!existsSync(filePath)) {
      filePath = indexPath;
    }

    const ext = extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    try {
      const stream = createReadStream(filePath);
      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': 'no-cache',
      });
      stream.pipe(res);
    } catch {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Internal Server Error');
    }
  });

  const preferredPort = parseInt(process.env.PORT || '9323', 10);
  const host = '127.0.0.1';

  const startServer = (port) => {
    server.removeAllListeners('listening');

    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        startServer(port + 1);
      } else {
        console.error('✗ Failed to start report server:', err.message || err);
        process.exitCode = 1;
      }
    });

    server.listen(port, host, () => {
      const url = `http://${host}:${port}`;
      console.log(`Serving HTML report at ${url}`);
      console.log('Press Ctrl+C to quit.');
      openBrowser(url);
    });
  };

  startServer(preferredPort);
}
