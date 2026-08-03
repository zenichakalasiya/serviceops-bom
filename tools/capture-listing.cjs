/**
 * Capture the Vulnerability LISTING page and every interactive surface on it.
 *
 *   node tools/capture-listing.cjs
 *
 * Writes shots / dom / styles into tools/out/listing/ using the same three
 * artefacts per surface as the detail capture: screenshot, outerHTML, exact
 * computed styles.
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const URL = 'https://ronak-patel-motadata.github.io/ServiceOps-Ticket-Detail-/';
const OUT = path.join(__dirname, 'out', 'listing');
const SHOTS = path.join(OUT, 'shots');
const DOM = path.join(OUT, 'dom');
const STYLES = path.join(OUT, 'styles');
[OUT, SHOTS, DOM, STYLES].forEach((d) => fs.mkdirSync(d, { recursive: true }));

const PROPS = [
  'display', 'position', 'boxSizing', 'flexDirection', 'alignItems', 'justifyContent', 'gap',
  'gridTemplateColumns', 'width', 'height', 'minWidth', 'minHeight', 'maxWidth',
  'marginTop', 'marginRight', 'marginBottom', 'marginLeft',
  'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
  'color', 'backgroundColor', 'backgroundImage', 'opacity',
  'fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'lineHeight',
  'letterSpacing', 'textTransform', 'textAlign', 'textDecorationLine', 'whiteSpace',
  'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth',
  'borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor',
  'borderTopStyle', 'borderTopLeftRadius', 'borderTopRightRadius',
  'borderBottomLeftRadius', 'borderBottomRightRadius',
  'boxShadow', 'outline', 'overflow', 'zIndex', 'cursor', 'transition',
];

const EXTRACT = ({ props }) => {
  const out = [];
  const walk = (el, depth) => {
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) return;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none') return;
    const style = {};
    for (const p of props) style[p] = cs[p];
    const ownText = [...el.childNodes].filter((n) => n.nodeType === 3)
      .map((n) => n.textContent.trim()).filter(Boolean).join(' ');
    out.push({
      depth, tag: el.tagName.toLowerCase(), cls: el.getAttribute('class') || '',
      text: ownText.slice(0, 140),
      rect: { x: +r.x.toFixed(1), y: +r.y.toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1) },
      style,
    });
    for (const c of el.children) walk(c, depth + 1);
  };
  walk(document.body, 0);
  return out;
};

async function snap(page, name) {
  await page.waitForTimeout(450);
  await page.screenshot({ path: path.join(SHOTS, `${name}.png`) });
  fs.writeFileSync(path.join(DOM, `${name}.html`), await page.evaluate(() => document.body.outerHTML));
  const styles = await page.evaluate(EXTRACT, { props: PROPS });
  fs.writeFileSync(path.join(STYLES, `${name}.json`), JSON.stringify(styles, null, 2));
  console.log(`  ${name}  (${styles.length} elements)`);
}

/** Fail loudly rather than write a blank capture. */
async function assertPainted(page, label, needle) {
  const txt = await page.evaluate(() => document.body.innerText);
  if (txt.trim().length < 50) throw new Error(`BLANK at "${label}"`);
  if (needle && !txt.includes(needle)) throw new Error(`"${label}" missing expected text "${needle}"`);
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 2 });

  console.log('→ loading');
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 90000 });
  await page.waitForFunction(() => document.body.innerText.trim().length > 50, { timeout: 60000 });

  console.log('→ Vulnerabilities listing');
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('aside button')];
    b[15].dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
    b[15].dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
  });
  await page.waitForTimeout(400);
  await page.evaluate(() =>
    [...document.querySelectorAll('aside button')].find((b) => b.innerText.trim() === 'Vulnerabilities')?.click());
  await page.waitForTimeout(1000);
  await assertPainted(page, 'listing', 'Detected Vulnerability Patches');
  await snap(page, '00-listing');

  /* ---- the view dropdown ("Detected Vulnerability Patches ⌄") ------------ */
  console.log('→ view dropdown');
  const opened = await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')]
      .find((e) => e.textContent.trim().startsWith('Detected Vulnerability Patches'));
    if (!b) return false;
    b.click();
    return true;
  });
  await page.waitForTimeout(500);
  if (opened) await snap(page, '01-view-dropdown');
  await page.mouse.click(960, 700);
  await page.waitForTimeout(300);

  /* ---- each toolbar button ------------------------------------------------ */
  console.log('→ toolbar buttons');
  const toolbar = await page.evaluate(() => {
    // top-right cluster of the listing header, above the search field
    window.__tb = [...document.querySelectorAll('button')].filter((b) => {
      const r = b.getBoundingClientRect();
      return r.y > 55 && r.y < 115 && r.x > window.innerWidth - 300 && r.width > 0 && r.width < 60;
    });
    return window.__tb.map((b) => b.querySelector('svg')?.getAttribute('class')
      ?.replace(/lucide lucide-/, '').split(' ')[0] || 'icon');
  });
  console.log('   ', toolbar.join(', '));
  for (const [i, name] of toolbar.entries()) {
    await page.evaluate((i) => window.__tb[i]?.click(), i);
    await page.waitForTimeout(600);
    await snap(page, `02-toolbar-${String(i + 1).padStart(2, '0')}-${name}`);
    await page.keyboard.press('Escape');
    await page.mouse.click(960, 700);
    await page.waitForTimeout(300);
  }

  /* ---- row hover + selection ---------------------------------------------- */
  console.log('→ row hover / selection');
  const firstRow = await page.evaluate(() => {
    const el = [...document.querySelectorAll('tr')].find((r) => r.textContent.includes('PCH-'));
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.x + 400, y: r.y + r.height / 2 };
  });
  if (firstRow) {
    await page.mouse.move(firstRow.x, firstRow.y);
    await page.waitForTimeout(350);
    await snap(page, '03-row-hover');
  }
  await page.evaluate(() => {
    const c = document.querySelector('thead input[type=checkbox]');
    if (c) { c.click(); }
  });
  await page.waitForTimeout(500);
  await snap(page, '04-select-all');

  console.log('\nDone →', OUT);
  await browser.close();
})().catch((e) => { console.error('FAILED:', e.message); process.exit(1); });
