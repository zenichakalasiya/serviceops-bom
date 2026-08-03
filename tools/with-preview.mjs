/**
 * Run a tool against the built app: boots `vite preview`, waits for it to
 * answer, runs the script, then always tears the server down.
 *
 *   node tools/with-preview.mjs tools/validate.cjs
 *
 * Set APP_URL to point a suite at an already-running server instead.
 */
import { spawn } from 'node:child_process';
import process from 'node:process';

const script = process.argv[2];
if (!script) {
  console.error('usage: node tools/with-preview.mjs <script>');
  process.exit(1);
}

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PORT = Number(process.env.PORT ?? 5190);
/* The site is served from a sub-path on GitHub Pages, and `vite preview`
   honours the same base — so the suites must target base, not "/". Read it from
   the config rather than hardcoding it in two places. */
const cfgPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'vite.config.ts');
const base = (fs.readFileSync(cfgPath, 'utf8').match(/base:\s*['"]([^'"]+)['"]/) ?? [, '/'])[1];
const URL = `http://localhost:${PORT}${base.endsWith('/') ? base : base + '/'}`;
// Run vite's CLI with this node binary. `vite` does not export bin/vite.js, and
// spawning `npx` would need shell:true on Windows (which Node warns about,
// DEP0190) — so point at the file in node_modules directly.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const viteBin = path.join(root, 'node_modules', 'vite', 'bin', 'vite.js');

const wait = async (ms) => new Promise((r) => setTimeout(r, ms));

async function reachable(url, tries = 60) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(1500) });
      if (res.ok) return true;
    } catch { /* not up yet */ }
    await wait(500);
  }
  return false;
}

// If something already serves the URL, use it rather than starting a second one.
let server = null;
if (await reachable(URL, 1)) {
  console.log(`using the server already on ${URL}`);
} else {
  console.log(`starting vite preview on ${URL}`);
  server = spawn(process.execPath, [viteBin, 'preview', '--port', String(PORT), '--strictPort'],
    { stdio: 'ignore' });
  if (!(await reachable(URL))) {
    server.kill();
    console.error(`preview never came up on ${URL} — run \`npm run build\` first`);
    process.exit(1);
  }
}

const child = spawn(process.execPath, [script], {
  stdio: 'inherit',
  env: { ...process.env, APP_URL: URL },
});

const shutdown = (code) => { server?.kill(); process.exit(code); };
child.on('exit', (code) => shutdown(code ?? 1));
process.on('SIGINT', () => shutdown(130));
