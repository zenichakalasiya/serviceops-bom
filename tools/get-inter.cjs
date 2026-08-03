/**
 * Fetch Inter 400/500/600 (latin) woff2 from Google Fonts and write them next to
 * the rebuild, so the rebuild renders in the same face the original resolves to
 * instead of silently falling back to Segoe UI.
 */
const fs = require('fs');
const path = require('path');

const CSS = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap';
// A modern desktop UA makes Google serve woff2 + unicode-range slices.
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const DEST = path.join(__dirname, '..', 'rebuild', 'fonts');
fs.mkdirSync(DEST, { recursive: true });

(async () => {
  const css = await (await fetch(CSS, { headers: { 'User-Agent': UA } })).text();

  // Keep only the latin subset of each weight (the app is English-only).
  const blocks = css.split('@font-face').slice(1);
  const wanted = [];
  for (const b of blocks) {
    const w = (b.match(/font-weight:\s*(\d+)/) || [])[1];
    const url = (b.match(/url\((https:[^)]+\.woff2)\)/) || [])[1];
    const range = (b.match(/unicode-range:\s*([^;]+);/) || [])[1] || '';
    // latin block is the one covering U+0000-00FF
    if (url && w && range.includes('U+0000')) wanted.push({ w, url });
  }
  if (wanted.length === 0) throw new Error('no latin woff2 found in Google CSS');

  let face = '';
  for (const { w, url } of wanted) {
    const buf = Buffer.from(await (await fetch(url)).arrayBuffer());
    const file = `Inter-${w}.woff2`;
    fs.writeFileSync(path.join(DEST, file), buf);
    console.log(`  ${file}  ${(buf.length / 1024).toFixed(1)} KB`);
    face += `@font-face{font-family:Inter;font-style:normal;font-weight:${w};` +
            `font-display:block;src:url("fonts/${file}") format("woff2")}\n`;
  }
  fs.writeFileSync(path.join(DEST, 'inter.css'), face);
  console.log('\n@font-face block written to rebuild/fonts/inter.css');
})();
