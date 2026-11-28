/**
 * Runs the production build the same way the Docker image does: the standalone server
 * with .next/static and public/ placed next to it. Used by Playwright, because
 * `next start` does not support `output: 'standalone'`.
 *
 *   pnpm build && pnpm start:standalone   (PORT defaults to 3100)
 */
import { spawn } from 'node:child_process';
import { cpSync, existsSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '../..');
const STANDALONE = path.join(ROOT, '.next/standalone');

if (!existsSync(path.join(STANDALONE, 'server.js'))) {
  console.error('No standalone build found. Run `pnpm build` first.');
  process.exit(1);
}

cpSync(path.join(ROOT, '.next/static'), path.join(STANDALONE, '.next/static'), {
  recursive: true,
});
cpSync(path.join(ROOT, 'public'), path.join(STANDALONE, 'public'), { recursive: true });

const server = spawn(process.execPath, ['server.js'], {
  cwd: STANDALONE,
  stdio: 'inherit',
  env: { ...process.env, PORT: process.env.PORT ?? '3100', HOSTNAME: 'localhost' },
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => server.kill(signal));
}
server.on('exit', (code) => process.exit(code ?? 0));
