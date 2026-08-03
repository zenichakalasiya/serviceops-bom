/**
 * Fetch Inter from Google Fonts into src/fonts/.
 *
 *   npm run fonts
 *
 * Google serves Inter as a single VARIABLE font: requesting wght@400;500;600
 * returned three byte-identical files. So this fetches once and writes one
 * `Inter-var.woff2`; tokens.css declares it with `font-weight: 100 900` and the
 * whole axis is available.
 *
 * The font lives in src/ (not public/) so Vite hashes it and rewrites its URL
 * for whatever base the site is served from — an absolute /fonts/… path 404s
 * under a GitHub Pages sub-path.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const CSS = 'https://fonts.googleapis.com/css2?family=Inter:wght@100..900&display=block';
// a modern desktop UA makes Google serve woff2 rather than a legacy format
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) ' +
  'Chrome/131.0.0.0 Safari/537.36';
const DEST = path.join(__dirname, '..', 'src', 'fonts');

(async () => {
  fs.mkdirSync(DEST, { recursive: true });
  const css = await (await fetch(CSS, { headers: { 'User-Agent': UA } })).text();

  // keep the latin subset — the UI is English-only
  const latin = css.split('@font-face').slice(1)
    .find((b) => /unicode-range:[^;]*U\+0000/.test(b));
  const url = (latin ?? css).match(/url\((https:[^)]+\.woff2)\)/)?.[1];
  if (!url) throw new Error('no woff2 URL in the Google Fonts response');

  const buf = Buffer.from(await (await fetch(url)).arrayBuffer());
  const out = path.join(DEST, 'Inter-var.woff2');
  fs.writeFileSync(out, buf);

  // fvar means the weight axis is really there; without it `font-weight:100 900`
  // in tokens.css would be a lie and every weight would render identically
  const isVariable = buf.includes(Buffer.from('fvar', 'latin1'));
  console.log(`src/fonts/Inter-var.woff2  ${(buf.length / 1024).toFixed(1)} KB`);
  console.log(`  sha256   ${crypto.createHash('sha256').update(buf).digest('hex').slice(0, 16)}…`);
  console.log(`  variable ${isVariable ? 'yes (fvar present)' : 'NO — check tokens.css weight range'}`);
  if (!isVariable) process.exitCode = 1;
})();
