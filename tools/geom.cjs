/**
 * Exact geometry + style of the detail-overlay region of a captured surface.
 * Everything at or below the record header (y >= 36), SVG interiors dropped.
 *
 *   node BOM/capture/geom.js 02-detail-overview [maxDepth]
 */
const fs = require('fs');
const path = require('path');

const name = process.argv[2] || '02-detail-overview';
const maxDepth = Number(process.argv[3] ?? 99);
const rows = JSON.parse(fs.readFileSync(path.join(__dirname, 'out', 'styles', `${name}.json`), 'utf8'));

// The overlay root is the first full-width element starting at the record header.
const startIdx = rows.findIndex(r => r.text === 'PCH-4811' && r.style.fontSize === '13px');
if (startIdx < 0) throw new Error('record header not found');
const rootDepth = rows[startIdx].depth;
// Walk back up to the overlay container.
let i = startIdx;
while (i > 0 && rows[i].depth >= rootDepth - 4) i--;

let skipDepth = null;
const out = [];
for (const r of rows.slice(i)) {
  if (skipDepth !== null && r.depth > skipDepth) continue;
  skipDepth = null;
  if (r.tag === 'svg') skipDepth = r.depth;
  if (r.depth > maxDepth || r.rect.w < 3 || r.rect.h < 3) continue;

  const s = r.style;
  const b = [];
  if (!['block', 'inline'].includes(s.display)) b.push(s.display);
  if (s.flexDirection === 'column') b.push('col');
  if (s.backgroundColor !== 'rgba(0, 0, 0, 0)') b.push(`bg:${s.backgroundColor}`);
  if (r.text) b.push(`${s.fontSize}/${s.fontWeight} ${s.color}`);
  const bw = s.borderTopWidth, bb = s.borderBottomWidth;
  if (bw !== '0px') b.push(`bd:${bw} ${s.borderTopColor}`);
  else if (bb !== '0px') b.push(`bdB:${bb} ${s.borderBottomColor}`);
  if (s.borderTopLeftRadius !== '0px') b.push(`r:${s.borderTopLeftRadius}`);
  const p = [s.paddingTop, s.paddingRight, s.paddingBottom, s.paddingLeft];
  if (p.some(v => v !== '0px')) b.push(`p:${p.join(' ').replace(/px/g, '')}`);
  if (s.gap && s.gap !== 'normal') b.push(`gap:${s.gap}`);
  if (s.boxShadow !== 'none') b.push('shadow');

  out.push('  '.repeat(Math.max(0, r.depth - rows[i].depth)) +
    `${r.tag}[${r.rect.x},${r.rect.y} ${r.rect.w}x${r.rect.h}] ` +
    (r.text ? `"${r.text.slice(0, 34)}" ` : '') + b.join(' '));
}
console.log(out.join('\n'));
