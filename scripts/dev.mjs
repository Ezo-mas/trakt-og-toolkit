/**
 * One-terminal dev loop: esbuild watch + a no-cache static server for dist/.
 *
 *   npm run dev
 *
 * Open http://localhost:8787/trakt-og-toolkit.user.js in Violentmonkey, click
 * "Track external edits", and keep that installer tab open. Every rebuild is
 * picked up automatically. Override the port with PORT=9000 npm run dev.
 */
import { createServer } from 'node:http';
import { createReadStream, statSync } from 'node:fs';
import { extname, join, resolve, sep } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const DIST = join(ROOT, 'dist');
const PORT = Number(process.env.PORT) || 8787;

const TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
};

const server = createServer((request, response) => {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(request.url || '/', 'http://localhost').pathname);
  } catch {
    response.writeHead(400).end('Bad request');
    return;
  }

  const file = resolve(DIST, pathname.replace(/^\/+/, ''));
  if (!file.startsWith(DIST + sep)) {
    response.writeHead(403).end('Forbidden');
    return;
  }

  let stat;
  try {
    stat = statSync(file);
  } catch {
    response.writeHead(404).end('Not found');
    return;
  }
  if (!stat.isFile()) {
    response.writeHead(404).end('Not found');
    return;
  }

  response.writeHead(200, {
    'Content-Type': TYPES[extname(file)] || 'application/octet-stream',
    'Cache-Control': 'no-store, max-age=0',
    'Content-Length': stat.size,
  });
  createReadStream(file).pipe(response);
});

const build = spawn(process.execPath, [join(ROOT, 'build.mjs'), '--watch'], {
  cwd: ROOT,
  stdio: 'inherit',
});

let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  build.kill('SIGTERM');
  server.close(() => process.exit(code));
  setTimeout(() => process.exit(code), 1000).unref();
}

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') console.error(`[dev] port ${PORT} is already in use (try PORT=8788 npm run dev)`);
  else console.error('[dev] server error:', error.message);
  stop(1);
});

server.listen(PORT, () => {
  console.log(`[dev] serving ${DIST}`);
  console.log(`[dev] install/update: http://localhost:${PORT}/trakt-og-toolkit.user.js`);
  console.log('[dev] leave this running; Ctrl-C stops both the server and the watcher');
});

process.on('SIGINT', () => stop(0));
process.on('SIGTERM', () => stop(0));

build.on('exit', (code, signal) => {
  if (stopping || signal) return;
  stop(code || 0);
});
