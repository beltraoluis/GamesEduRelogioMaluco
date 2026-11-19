// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { createReadStream, existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

export type ServeRoot = 'legacy' | 'dist';

export interface SwitchableServer {
  readonly origin: string;
  readonly port: number;
  setRoot(root: ServeRoot): void;
  setSubpath(prefix: string | null): void;
  /** Serve legacy SW with CACHE rewritten to v7 (rollback). */
  setLegacyCacheVersion(version: 'v6' | 'v7'): void;
  close(): Promise<void>;
}

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json',
};

function contentType(filePath: string): string {
  return MIME[path.extname(filePath)] ?? 'application/octet-stream';
}

function safeJoin(rootDir: string, urlPath: string): string | null {
  const decoded = decodeURIComponent(urlPath.split('?')[0] ?? '');
  const joined = path.normalize(path.join(rootDir, decoded));
  if (!joined.startsWith(rootDir)) return null;
  return joined;
}

/**
 * Servidor HTTP local no estilo do spike F0a: mesma origem, troca legado ↔ dist,
 * opcionalmente sob `/GamesEduRelogioMaluco/`.
 */
export async function startSwitchableServer(
  options: { readonly host?: string; readonly port?: number } = {},
): Promise<SwitchableServer> {
  const host = options.host ?? '127.0.0.1';
  let root: ServeRoot = 'dist';
  let subpath: string | null = null;
  let legacyCacheVersion: 'v6' | 'v7' = 'v6';

  const server: Server = createServer((req, res) => {
    void handle(req, res);
  });

  async function handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
    try {
      const hostHeader = req.headers.host ?? `${host}`;
      const url = new URL(req.url ?? '/', `http://${hostHeader}`);
      let pathname = url.pathname;

      if (subpath) {
        const prefix = subpath.endsWith('/') ? subpath.slice(0, -1) : subpath;
        if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
          pathname = pathname.slice(prefix.length) || '/';
        } else if (pathname === '/LICENSE' || pathname === '/LICENSE.txt') {
          // allow
        } else {
          res.writeHead(404).end('not in subpath');
          return;
        }
      }

      const rootDir = path.join(REPO_ROOT, root === 'legacy' ? 'legacy' : 'dist');

      if (root === 'legacy' && (pathname === '/LICENSE' || pathname === '/LICENSE.txt')) {
        const licensePath = path.join(REPO_ROOT, 'LICENSE');
        return sendFile(res, licensePath);
      }

      if (root === 'legacy' && pathname === '/sw.js') {
        return sendLegacySw(res, legacyCacheVersion);
      }

      let filePath = safeJoin(rootDir, pathname === '/' ? '/index.html' : pathname);
      if (!filePath) {
        res.writeHead(403).end('forbidden');
        return;
      }

      if (existsSync(filePath) && statSync(filePath).isDirectory()) {
        filePath = path.join(filePath, 'index.html');
      }

      if (!existsSync(filePath) && root === 'dist' && !path.extname(pathname)) {
        // SPA navigateFallback
        filePath = path.join(rootDir, 'index.html');
      }

      if (!existsSync(filePath)) {
        res.writeHead(404).end('not found');
        return;
      }

      return sendFile(res, filePath);
    } catch (error) {
      res.writeHead(500).end(error instanceof Error ? error.message : 'error');
    }
  }

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(options.port ?? 0, host, () => resolve());
  });

  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('failed to bind switchable server');
  }

  return {
    origin: `http://${host}:${address.port}`,
    port: address.port,
    setRoot(next) {
      root = next;
    },
    setSubpath(prefix) {
      subpath = prefix;
    },
    setLegacyCacheVersion(version) {
      legacyCacheVersion = version;
    },
    close() {
      return new Promise((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      });
    },
  };
}

function sendFile(res: ServerResponse, filePath: string): void {
  res.writeHead(200, {
    'Content-Type': contentType(filePath),
    'Cache-Control': 'no-cache',
  });
  createReadStream(filePath).pipe(res);
}

function sendLegacySw(res: ServerResponse, version: 'v6' | 'v7'): void {
  const swPath = path.join(REPO_ROOT, 'legacy', 'sw.js');
  const raw = readFileSync(swPath, 'utf8');
  const rewritten = raw.replace(
    /const CACHE = 'relogio-maluco-v6';/,
    `const CACHE = 'relogio-maluco-${version}';`,
  );
  res.writeHead(200, {
    'Content-Type': 'text/javascript; charset=utf-8',
    'Cache-Control': 'no-cache',
  });
  res.end(rewritten);
}
