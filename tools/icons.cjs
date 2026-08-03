/**
 * Pull the real SVG markup out of the captured DOM so the rebuild uses the
 * product's own icons instead of hand-drawn approximations.
 *
 *   node BOM/capture/icons.js
 * -> out/icons.json  { leftRail:[...], rightRail:[...], header:[...], cards:{...} }
 */
const fs = require('fs');
const path = require('path');

const DOM = path.join(__dirname, 'out', 'dom');
const html = fs.readFileSync(path.join(DOM, '02-detail-overview.html'), 'utf8');

const clean = s => s.replace(/\s+/g, ' ').trim();

/** All <svg>…</svg> blocks with their preceding context, in document order. */
function allSvgs(src) {
  const out = [];
  let i = 0;
  while ((i = src.indexOf('<svg', i)) !== -1) {
    let depth = 0, j = i;
    while (j < src.length) {
      if (src.startsWith('<svg', j)) depth++;
      else if (src.startsWith('</svg>', j)) { depth--; if (depth === 0) { j += 6; break; } }
      j++;
    }
    out.push({ start: i, end: j, svg: src.slice(i, j), before: src.slice(Math.max(0, i - 400), i) });
    i = j;
  }
  return out;
}

const svgs = allSvgs(html);
console.log('total svgs in capture:', svgs.length);

/** Icons inside the left <aside> rail: 20x20, inside a size-[20px] wrapper. */
const leftRail = svgs
  .filter(s => /size-\[20px\]/.test(s.before.slice(-160)))
  .map(s => clean(s.svg));

/* Position-based slicing picked up whatever <svg> happened to sit nearby (a
   chevron, a close X). Index every icon by its own lucide class name and pull
   the exact ones by name instead. */
const byName = {};
for (const s of svgs) {
  const m = s.svg.match(/lucide lucide-([a-z0-9-]+)/);
  if (m && !byName[m[1]]) byName[m[1]] = clean(s.svg);
}
console.log('lucide icons available:', Object.keys(byName).sort().join(', '));

const pick = names => names.map(n => byName[n]).filter(Boolean);

/** Right rail, in on-screen order. */
const rightRail = pick(['file-text', 'layers', 'files', 'keyboard']);

/** Header action buttons: copy-link then edit. */
const header = pick(['link', 'link-2', 'square-pen', 'pencil', 'pen-line']).slice(0, 2);

/** Card head icons: 15x15 inside a rounded chip with an rgba tint. */
const cards = svgs
  .filter(s => /bg-\[rgba\(|bg-\[#EAF3FB\]|size-7|h-7 w-7/.test(s.before.slice(-220)))
  .map(s => clean(s.svg))
  .slice(0, 12);

const out = { leftRail, rightRail, header, cards, byName };
for (const [k, v] of Object.entries(out)) console.log(`  ${k}: ${v.length}`);

fs.writeFileSync(path.join(__dirname, 'out', 'icons.json'), JSON.stringify(out, null, 1));
console.log('\nwrote out/icons.json');
console.log('\nsample leftRail[0]:\n', (leftRail[0] || '').slice(0, 260));
console.log('\nsample rightRail[0]:\n', (rightRail[0] || '').slice(0, 260));
