import { exec } from 'child_process';
import { createReadStream, existsSync, statSync } from 'fs';
import { createServer } from 'http';
import { extname, join, normalize, resolve } from 'path';

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
  const start =
    process.platform === 'darwin'
      ? `open "${url}"`
      : process.platform === 'win32'
        ? `start "" "${url}"`
        : `xdg-open "${url}"`;

  exec(start, () => {});
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
    console.error(`✗ Report file not found at "${outputDir}/index.html".`);
    console.error(`  Make sure you have run your Playwright tests first.`);

    process.exit(1);
  }

  const server = createServer((req, res) => {
    const rawPath = decodeURIComponent((req.url || '/').split('?')[0]);
    let safePath = normalize(rawPath).replace(/^(\.\.[/\\])+/, '');
    let filePath = join(reportDir, safePath);

    if (!filePath.startsWith(reportDir)) {
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
    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        startServer(port + 1);
      } else {
        console.error('✗ Failed to start report server:', err.message || err);
        process.exit(1);
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
