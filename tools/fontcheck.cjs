/**
 * Assert the Inter axis is intact.
 *
 *   node tools/with-preview.mjs tools/fontcheck.cjs
 *
 * Two failure modes this catches:
 *   - the font does not load at all (everything falls back to Segoe UI and
 *     every measured box shifts ~6%)
 *   - the weight axis is capped, e.g. by declaring fixed weights instead of a
 *     range, so 300 snaps to 400 and 700 snaps to 600 with no error anywhere
 */
const { chromium } = require('playwright');

/* Measured off the live product; the 400/500/600 numbers are the ones the
   pixel baseline depends on. */
const EXPECT = { 300: 61.6, 400: 62.58, 500: 63.54, 600: 64.47, 700: 65.44 };
const TOL = 0.4;

(async () => {
  const b = await chromium.launch({ headless: true });
  const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  await p.goto(process.env.APP_URL || 'http://localhost:5190/', { waitUntil: 'networkidle' });
  await p.waitForTimeout(800);

  const got = await p.evaluate(async () => {
    await document.fonts.ready;
    const c = document.createElement('canvas').getContext('2d');
    const m = (w) => { c.font = `${w} 14px Inter`; return +c.measureText('Overview').width.toFixed(2); };
    return { 300: m(300), 400: m(400), 500: m(500), 600: m(600), 700: m(700),
             faces: [...document.fonts].length };
  });

  const fail = [];
  for (const [w, want] of Object.entries(EXPECT)) {
    const diff = Math.abs(got[w] - want);
    console.log(`  ${w}  ${String(got[w]).padStart(6)}  expected ~${want}  ${diff <= TOL ? 'ok' : 'OFF'}`);
    if (diff > TOL) fail.push(`weight ${w}: ${got[w]} vs ~${want}`);
  }
  // a capped axis shows up as duplicate widths across the range
  const distinct = new Set([got[300], got[400], got[500], got[600], got[700]]).size;
  console.log(`  ${distinct} distinct widths across 300–700, ${got.faces} @font-face registered`);
  if (distinct < 5) fail.push(`weight axis is capped — only ${distinct}/5 distinct widths`);
  if (got.faces !== 1) fail.push(`expected 1 @font-face, found ${got.faces}`);

  console.log(fail.length ? '\nFAILURES:\n  - ' + fail.join('\n  - ') : '\nfont axis intact');
  await b.close();
  if (fail.length) process.exit(1);
})();
