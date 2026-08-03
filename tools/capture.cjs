/**
 * ServiceOps Vulnerability module — exact-UI capture.
 *
 * Drives the live prototype to the Vulnerability (patch) detail page and dumps,
 * for every surface: a screenshot, the outerHTML, and exact computed styles.
 *
 * Run from D:\Motadata so `require('playwright')` resolves:
 *   node BOM/capture/capture.js
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const URL = 'https://ronak-patel-motadata.github.io/ServiceOps-Ticket-Detail-/';
const OUT = path.join(__dirname, 'out');
const SHOTS = path.join(OUT, 'shots');
const DOM = path.join(OUT, 'dom');
const STYLES = path.join(OUT, 'styles');
[OUT, SHOTS, DOM, STYLES].forEach(d => fs.mkdirSync(d, { recursive: true }));

// Computed properties that define "exact" for a UI copy.
const PROPS = [
  'display', 'position', 'boxSizing', 'flexDirection', 'alignItems', 'justifyContent', 'gap',
  'gridTemplateColumns',
  'width', 'height', 'minWidth', 'minHeight', 'maxWidth',
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

/** Serialize every visible element under `root` with its exact computed styles. */
const EXTRACT = ({ rootSel, props }) => {
  const root = rootSel ? document.querySelector(rootSel) : document.body;
  if (!root) return { error: 'root not found: ' + rootSel };
  const out = [];
  const walk = (el, depth) => {
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) return;         // skip collapsed
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none') return;
    const style = {};
    for (const p of props) style[p] = cs[p];
    // Own text only (not descendants') so labels aren't duplicated up the tree.
    const ownText = [...el.childNodes]
      .filter(n => n.nodeType === 3).map(n => n.textContent.trim())
      .filter(Boolean).join(' ');
    out.push({
      depth,
      tag: el.tagName.toLowerCase(),
      cls: el.getAttribute('class') || '',
      text: ownText.slice(0, 120),
      rect: { x: +r.x.toFixed(1), y: +r.y.toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1) },
      style,
    });
    for (const c of el.children) walk(c, depth + 1);
  };
  walk(root, 0);
  return out;
};

/** Save the three artifacts for one named surface. */
async function snap(page, name, opts = {}) {
  const { rootSel = null, clip = null, fullPage = false } = opts;
  await page.waitForTimeout(450);                        // let transitions settle
  await page.screenshot({ path: path.join(SHOTS, `${name}.png`), fullPage, ...(clip ? { clip } : {}) });
  const html = await page.evaluate(sel => (sel ? document.querySelector(sel) : document.body)?.outerHTML ?? '',
    rootSel);
  fs.writeFileSync(path.join(DOM, `${name}.html`), html);
  const styles = await page.evaluate(EXTRACT, { rootSel, props: PROPS });
  fs.writeFileSync(path.join(STYLES, `${name}.json`), JSON.stringify(styles, null, 2));
  const n = Array.isArray(styles) ? styles.length : 0;
  console.log(`  saved ${name}  (${n} elements, ${(html.length / 1024).toFixed(0)} KB html)`);
  return n;
}

/** Guard against the blank-SPA trap: fail loudly rather than write empty captures. */
async function assertPainted(page, label) {
  const len = await page.evaluate(() => document.body.innerText.trim().length);
  if (len < 50) throw new Error(`BLANK PAGE at "${label}" — body text ${len} chars`);
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 2 });

  console.log('→ loading app');
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 90000 });
  await page.waitForFunction(() => document.body.innerText.trim().length > 50, { timeout: 60000 });
  await assertPainted(page, 'initial load');

  // --- into Vulnerabilities -------------------------------------------------
  console.log('→ opening Vulnerabilities');
  await page.evaluate(() => {
    const btns = [...document.querySelectorAll('aside button')];
    btns[15].dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
    btns[15].dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
  });
  await page.waitForTimeout(400);
  await snap(page, '00-nav-flyout');                     // the hover flyout itself
  await page.evaluate(() => {
    [...document.querySelectorAll('aside button')]
      .find(b => b.innerText.trim() === 'Vulnerabilities')?.click();
  });
  await page.waitForTimeout(900);
  await assertPainted(page, 'vulnerability listing');
  await snap(page, '01-listing');

  // --- open a record --------------------------------------------------------
  console.log('→ opening PCH-4811');
  await page.evaluate(() => {
    [...document.querySelectorAll('button')]
      .find(e => e.textContent.trim() === 'PCH-4811')?.click();
  });
  await page.waitForTimeout(1200);
  await assertPainted(page, 'detail page');
  await snap(page, '02-detail-overview');

  // --- every tab ------------------------------------------------------------
  // NB: the left-nav flyout also contains "Vulnerabilities" and "Endpoint".
  // Matching on text alone navigates away from the record. The detail tabs are
  // the only ones carrying border-b-2 + text-[14px], so key off that.
  const TABSEL = 'button.border-b-2';
  const isTab = `[...document.querySelectorAll('${TABSEL}')].filter(e => {
    const c = e.getAttribute('class') || '';
    return c.includes('text-[14px]') && e.getBoundingClientRect().width > 0;
  })`;

  const tabs = await page.evaluate(`${isTab}.map(e => e.textContent.trim())`);
  console.log('→ detail tabs:', tabs.join(', '));
  if (tabs.length === 0) throw new Error('no detail tabs matched — selector is wrong');

  for (const [i, tab] of tabs.entries()) {
    await page.evaluate(`${isTab}.find(e => e.textContent.trim() === ${JSON.stringify(tab)})?.click()`);
    await page.waitForTimeout(900);

    // Guard: confirm we are still on the record, not a module listing.
    const stillOnRecord = await page.evaluate(() => document.body.innerText.includes('PCH-4811'));
    if (!stillOnRecord) throw new Error(`navigated away from record while opening tab "${tab}"`);

    const slug = tab.toLowerCase().replace(/\s+/g, '-');
    await snap(page, `03-tab-${String(i + 1).padStart(2, '0')}-${slug}`);
  }

  // --- back to Overview, then the interactive surfaces ----------------------
  await page.evaluate(`${isTab}.find(e => e.textContent.trim() === 'Overview')?.click()`);
  await page.waitForTimeout(700);

  // 3-dot overflow menu in the header
  console.log('→ header 3-dot menu');
  const dotsOpened = await page.evaluate(() => {
    const hdr = [...document.querySelectorAll('button')].filter(b => {
      const r = b.getBoundingClientRect();
      return r.y < 120 && r.x > window.innerWidth - 200 && r.width > 0;
    });
    const dots = hdr[hdr.length - 1];
    if (!dots) return false;
    dots.click();
    return true;
  });
  await page.waitForTimeout(500);
  if (dotsOpened) await snap(page, '04-header-3dot-menu');
  // Escape does not dismiss this menu — click a neutral spot instead.
  await page.mouse.click(700, 700);
  await page.waitForTimeout(400);

  // right-most icon rail. Scoped to its own column (bg-[#F8F9FB] + border-l) so
  // window chrome and header overflow buttons can't be mistaken for rail icons.
  const RAIL = 'div[class*="bg-[#F8F9FB]"][class*="border-l"] > button';
  console.log('→ right icon rail panels');
  const rail = await page.evaluate(sel => [...document.querySelectorAll(sel)]
    .map(b => b.querySelector('svg')?.getAttribute('class')?.replace(/lucide lucide-/, '').split(' ')[0] || 'icon'), RAIL);
  console.log('   rail icons:', rail.join(', '));
  if (rail.length === 0) throw new Error('right rail not found — selector is wrong');

  for (const [i, icon] of rail.entries()) {
    await page.evaluate(({ sel, i }) => document.querySelectorAll(sel)[i]?.click(), { sel: RAIL, i });
    await page.waitForTimeout(700);
    const onRecord = await page.evaluate(() => document.body.innerText.includes('PCH-4811'));
    if (!onRecord) throw new Error(`navigated away from record on rail icon "${icon}"`);
    await snap(page, `05-rightrail-${String(i + 1).padStart(2, '0')}-${icon}`);
  }

  // --- header CTA hover states ---------------------------------------------
  console.log('→ CTA hover states');
  for (const label of ['Approve', 'Decline']) {
    const box = await page.evaluate(t => {
      const b = [...document.querySelectorAll('button')].find(e => e.textContent.trim() === t);
      if (!b) return null;
      const r = b.getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    }, label);
    if (!box) { console.log(`   ! ${label} not found`); continue; }
    await page.mouse.move(box.x, box.y);
    await page.waitForTimeout(350);
    await snap(page, `06-cta-hover-${label.toLowerCase()}`);
  }

  fs.writeFileSync(path.join(OUT, 'tabs.json'), JSON.stringify(tabs, null, 2));
  console.log('\nDone. Artifacts in', OUT);
  await browser.close();
})().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
