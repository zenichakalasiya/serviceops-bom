/**
 * Validate the rebuild against the captured original.
 *
 *  1. Pixel diff  — rebuild vs 02-detail-overview.png, writes a diff image.
 *  2. Landmark geometry — exact box of each key region in both, side by side.
 *
 *   node BOM/capture/validate.js
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');
// pixelmatch v6 ships as ESM with a default export.
const pixelmatch = require('pixelmatch').default ?? require('pixelmatch');

const OUT = path.join(__dirname, 'out');
/* Validates the running app, not a loose file — start it with `npm run preview`
   (or `npm run dev`) first, or use `npm run validate` which does both. */
const REBUILD = process.env.APP_URL || 'http://localhost:5190/';
const ORIGINAL = path.join(OUT, 'shots', '02-detail-overview.png');
const MINE = path.join(OUT, 'rebuild.png');
const DIFF = path.join(OUT, 'diff.png');

/* Landmarks: label -> how to find it in each page. Kept text-based so the same
   probe works against the original's Tailwind DOM and the rebuild's semantic one. */
function LANDMARKS() {
  const box = el => {
    if (!el) return null;
    const r = el.getBoundingClientRect(), s = getComputedStyle(el);
    return {
      x: +r.x.toFixed(1), y: +r.y.toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1),
      fs: s.fontSize, fw: s.fontWeight, color: s.color, bg: s.backgroundColor,
      r: s.borderTopLeftRadius,
      pad: [s.paddingTop, s.paddingRight, s.paddingBottom, s.paddingLeft].join(' '),
    };
  };
  /* The original keeps the module listing mounted *underneath* the detail
     overlay, so a document-wide text match silently returns the listing's
     cell instead of the record's field. Scope every probe to the overlay.
     It also renders off-screen measuring clones at y ≈ -9900 — filter those. */
  const anchor = [...document.querySelectorAll('h2')]
    .find(e => e.textContent.trim() === 'Patch Properties');
  let root = document.body;
  for (let n = anchor; n; n = n.parentElement) {
    const r = n.getBoundingClientRect();
    if (r.width > 1800 && r.y >= 0 && r.y < 60) { root = n; break; }
  }
  /* Two more matching hazards:
     - y >= 37 skips the window/tab strip, which repeats the record id at 12px.
     - a wrapper div and its inner span both have textContent === "Updates";
       take the DEEPEST match so we measure the styled node, not its container. */
  const txt = (t, tags) => {
    const all = [...root.querySelectorAll(tags || 'span,div,button,h1,h2,h3,a')]
      .filter(e => {
        const r = e.getBoundingClientRect();
        return e.textContent.trim() === t && r.width > 0 && r.y >= 37;
      });
    return all.find(e => !all.some(o => o !== e && e.contains(o))) || all[0];
  };
  return {
    'idBadge':          box(txt('PCH-4811', 'span,button')),
    'tab.Overview':     box(txt('Overview', 'button')),
    'tab.AuditTrail':   box(txt('Audit Trail', 'button')),
    'btn.Approve':      box(txt('Approve', 'button')),
    'btn.Decline':      box(txt('Decline', 'button')),
    'h2.PatchProps':    box(txt('Patch Properties', 'h2')),
    'lbl.PatchCategory':box(txt('Patch Category', 'div')),
    'val.Updates':      box(txt('Updates', 'span,div')),
    'tag.production':   box(txt('production', 'span')),
    'legend.Approved':  box(txt('Approved', 'span')),
    'meta.Category':    box(txt('Category', 'span')),
    'cardTitle.Vuln':   box(txt('Vulnerabilities', 'span')),
    'recTitle':         box(txt('2026-04 Cumulative Update for Windows 11 Version 23H2 for x64 (KB5036894)', 'span,h1')),
    'searchBox':        box(root.querySelector('input[placeholder*="Search fields"]')?.parentElement),
    'searchInput':      box(root.querySelector('input[placeholder*="Search fields"]')),
    'sectionHead':      box(txt('Patch Fields', 'h3')?.closest('button')),
    'fld.UUID':         box(txt('UUID', 'div')),
    'fld.Architecture': box(txt('Architecture', 'div')),
    'fld.Status':       box(txt('Status', 'div')),
    'fld.ReferenceUrl': box(txt('Refrence Url', 'div')),
    /* In the original this is an <input placeholder>; in the rebuild it is a
       styled <span>. Match on either so the probe compares the same bar. */
    'askAI':            box((() => {
                          const all = [...root.querySelectorAll('input,textarea,span,div')]
                            .filter(e => ((e.getAttribute('placeholder') || '') + e.textContent)
                                           .includes('Ask AI for insights')
                                         && e.getBoundingClientRect().width > 0);
                          // deepest match — otherwise every ancestor up to the panel qualifies
                          return all.find(e => !all.some(o => o !== e && e.contains(o))) || all[0];
                        })()),
    'donut.svg':        (() => {
                          const s = root.querySelector('svg[viewBox="0 0 104 104"]')
                                 || [...root.querySelectorAll('svg')].find(v => v.getBoundingClientRect().width === 104);
                          if (!s) return null;
                          const c = [...s.querySelectorAll('circle')].map(x => ({
                            r: x.getAttribute('r'), sw: x.getAttribute('stroke-width'),
                            cx: x.getAttribute('cx'), cy: x.getAttribute('cy'),
                            da: x.getAttribute('stroke-dasharray'), do: x.getAttribute('stroke-dashoffset'),
                            stroke: getComputedStyle(x).stroke,
                          }));
                          const b = s.getBoundingClientRect();
                          return { x: +b.x.toFixed(1), y: +b.y.toFixed(1), w: +b.width.toFixed(1), h: +b.height.toFixed(1),
                                   fs: '', fw: '', color: '', bg: '', r: '', pad: '', circles: JSON.stringify(c) };
                        })(),
  };
}

const norm = v => (v || '').replace(/\s+/g, ' ').trim();

(async () => {
  const browser = await chromium.launch({ headless: true });

  // Original was captured at deviceScaleFactor 2 — match it exactly.
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 2 });
  await page.goto(REBUILD, { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  /* The app now lands on the listing; this suite validates the DETAIL page, so
     open the record the baseline was captured from. */
  await page.locator('.idlink', { hasText: 'PCH-4811' }).first().click();
  await page.waitForTimeout(900);
  await page.screenshot({ path: MINE });
  const mine = await page.evaluate(LANDMARKS);

  // Re-open the live original and probe the same landmarks.
  const p2 = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 2 });
  await p2.goto('https://ronak-patel-motadata.github.io/ServiceOps-Ticket-Detail-/', { waitUntil: 'networkidle', timeout: 90000 });
  await p2.waitForFunction(() => document.body.innerText.trim().length > 50, { timeout: 60000 });
  await p2.evaluate(() => {
    const b = [...document.querySelectorAll('aside button')];
    b[15].dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
    b[15].dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
  });
  await p2.waitForTimeout(400);
  await p2.evaluate(() => [...document.querySelectorAll('aside button')].find(b => b.innerText.trim() === 'Vulnerabilities')?.click());
  await p2.waitForTimeout(900);
  await p2.evaluate(() => [...document.querySelectorAll('button')].find(e => e.textContent.trim() === 'PCH-4811')?.click());
  await p2.waitForTimeout(1200);
  const theirs = await p2.evaluate(LANDMARKS);

  // ---- 1. pixel diff -------------------------------------------------------
  const a = PNG.sync.read(fs.readFileSync(ORIGINAL));
  const b = PNG.sync.read(fs.readFileSync(MINE));
  let pixReport;
  if (a.width !== b.width || a.height !== b.height) {
    pixReport = `size mismatch: original ${a.width}x${a.height}, rebuild ${b.width}x${b.height}`;
  } else {
    const diff = new PNG({ width: a.width, height: a.height });
    const n = pixelmatch(a.data, b.data, diff.data, a.width, a.height, { threshold: 0.1 });
    fs.writeFileSync(DIFF, PNG.sync.write(diff));
    pixReport = `${n.toLocaleString()} of ${(a.width * a.height).toLocaleString()} px differ ` +
                `(${(100 * n / (a.width * a.height)).toFixed(2)}%) → out/diff.png`;
  }

  // ---- 2. landmark table ---------------------------------------------------
  const keys = [...new Set([...Object.keys(theirs), ...Object.keys(mine)])];
  const lines = [];
  let ok = 0, bad = 0, missing = 0;
  for (const k of keys) {
    const t = theirs[k], m = mine[k];
    if (!t || !m) { lines.push(`MISSING  ${k.padEnd(20)} original=${!!t} rebuild=${!!m}`); missing++; continue; }
    const deltas = [];
    for (const f of ['x', 'y', 'w', 'h']) {
      const d = +(m[f] - t[f]).toFixed(1);
      if (Math.abs(d) > 1.5) deltas.push(`${f} ${t[f]}→${m[f]} (${d > 0 ? '+' : ''}${d})`);
    }
    for (const f of ['fs', 'fw', 'color', 'bg', 'r', 'pad'])
      if (norm(t[f]) !== norm(m[f])) deltas.push(`${f}: ${t[f]} → ${m[f]}`);
    if (deltas.length === 0) { lines.push(`OK       ${k}`); ok++; }
    else { lines.push(`DIFF     ${k.padEnd(20)} ${deltas.join('  |  ')}`); bad++; }
  }

  const report =
    `# Rebuild validation\n\n## Pixel diff\n${pixReport}\n\n` +
    `## Landmarks — ${ok} exact, ${bad} differing, ${missing} missing\n\n` +
    lines.sort().join('\n') + '\n';
  fs.writeFileSync(path.join(OUT, 'VALIDATION.md'), report);
  console.log(report);

  await browser.close();
})().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
