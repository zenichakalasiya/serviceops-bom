/** Screenshot the running app (optionally after clicking something). */
const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const out = process.argv[2] || 'app.png';
  const b = await chromium.launch({ headless: true });
  const p = await b.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 2 });
  const errors = [];
  p.on('pageerror', (e) => errors.push(e.message));
  p.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await p.goto(process.env.APP_URL || 'http://localhost:5190/', { waitUntil: 'networkidle' });
  await p.waitForTimeout(700);
  await p.screenshot({ path: path.join(__dirname, 'out', out) });
  console.log('wrote tools/out/' + out);
  console.log(errors.length ? 'CONSOLE ERRORS:\n  ' + errors.join('\n  ') : 'no console errors');
  await b.close();
})();
