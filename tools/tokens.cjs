/**
 * Aggregate the captured computed styles into an exact token report.
 *
 * Every value here was read out of the live DOM via getComputedStyle — none of
 * it is estimated from pixels. Frequencies tell us which values are the real
 * system tokens vs one-off outliers.
 *
 *   node BOM/capture/tokens.js
 */
const fs = require('fs');
const path = require('path');

const STYLES = path.join(__dirname, 'out', 'styles');
const files = fs.readdirSync(STYLES).filter(f => f.endsWith('.json'));

const tally = {};
const bump = (bucket, value, ctx) => {
  if (value === undefined || value === null || value === '') return;
  tally[bucket] ??= new Map();
  const e = tally[bucket].get(value) ?? { n: 0, eg: new Set() };
  e.n++;
  if (ctx && e.eg.size < 4) e.eg.add(ctx);
  tally[bucket].set(value, e);
};

const SKIP_COLOR = new Set(['rgba(0, 0, 0, 0)', 'transparent']);
const isZero = v => v === '0px' || v === 'none' || v === 'normal' || v === 'auto';

let total = 0;
for (const f of files) {
  const rows = JSON.parse(fs.readFileSync(path.join(STYLES, f), 'utf8'));
  if (!Array.isArray(rows)) continue;
  for (const r of rows) {
    total++;
    const s = r.style;
    const ctx = `${r.tag}${r.text ? ' "' + r.text.slice(0, 22) + '"' : ''}`;

    if (!SKIP_COLOR.has(s.color)) bump('textColor', s.color, ctx);
    if (!SKIP_COLOR.has(s.backgroundColor)) bump('bgColor', s.backgroundColor, ctx);

    // Only record type on elements that actually own text.
    if (r.text) {
      bump('fontSize', s.fontSize, ctx);
      bump('fontWeight', s.fontWeight, ctx);
      bump('lineHeight', s.lineHeight, ctx);
      bump('fontFamily', s.fontFamily, ctx);
      if (s.letterSpacing !== 'normal') bump('letterSpacing', s.letterSpacing, ctx);
    }

    for (const side of ['Top', 'Right', 'Bottom', 'Left']) {
      if (!isZero(s['padding' + side])) bump('padding', s['padding' + side], ctx);
      if (!isZero(s['margin' + side])) bump('margin', s['margin' + side], ctx);
      const bw = s['border' + side + 'Width'];
      if (!isZero(bw)) {
        bump('borderWidth', bw, ctx);
        if (!SKIP_COLOR.has(s['border' + side + 'Color'])) bump('borderColor', s['border' + side + 'Color'], ctx);
      }
    }
    for (const c of ['TopLeft', 'TopRight', 'BottomLeft', 'BottomRight'])
      if (!isZero(s['border' + c + 'Radius'])) bump('radius', s['border' + c + 'Radius'], ctx);

    if (!isZero(s.boxShadow)) bump('shadow', s.boxShadow, ctx);
    if (!isZero(s.gap)) bump('gap', s.gap, ctx);
    if (s.transition && s.transition !== 'all 0s ease 0s') bump('transition', s.transition, ctx);
  }
}

const px = v => parseFloat(v);
const ORDER = {
  fontSize: (a, b) => px(a) - px(b),
  padding: (a, b) => px(a) - px(b),
  margin: (a, b) => px(a) - px(b),
  gap: (a, b) => px(a) - px(b),
  radius: (a, b) => px(a) - px(b),
  borderWidth: (a, b) => px(a) - px(b),
  fontWeight: (a, b) => px(a) - px(b),
};

let md = `# ServiceOps — Vulnerability module: exact UI tokens\n\n`;
md += `Extracted from ${files.length} captured surfaces, ${total.toLocaleString()} rendered elements.\n`;
md += `Every value below is \`getComputedStyle()\` output from the live DOM — measured, not estimated.\n\n`;

const SECTIONS = [
  ['fontFamily', 'Font families'], ['fontSize', 'Font sizes'], ['fontWeight', 'Font weights'],
  ['lineHeight', 'Line heights'], ['letterSpacing', 'Letter spacing'],
  ['textColor', 'Text colors'], ['bgColor', 'Background colors'],
  ['borderColor', 'Border colors'], ['borderWidth', 'Border widths'], ['radius', 'Border radii'],
  ['padding', 'Padding steps'], ['margin', 'Margin steps'], ['gap', 'Gap steps'],
  ['shadow', 'Shadows'], ['transition', 'Transitions'],
];

const json = {};
for (const [key, title] of SECTIONS) {
  const m = tally[key];
  if (!m) continue;
  let rows = [...m.entries()].sort((a, b) => (ORDER[key] ? ORDER[key](a[0], b[0]) : b[1].n - a[1].n));
  json[key] = rows.map(([v, e]) => ({ value: v, count: e.n }));
  md += `## ${title}  _(${rows.length} distinct)_\n\n`;
  md += `| value | uses | seen on |\n|---|---:|---|\n`;
  for (const [v, e] of rows.slice(0, 40)) {
    const eg = [...e.eg].join(', ').replace(/\|/g, '\\|').slice(0, 90);
    md += `| \`${String(v).slice(0, 70)}\` | ${e.n} | ${eg} |\n`;
  }
  if (rows.length > 40) md += `| _…${rows.length - 40} more_ | | |\n`;
  md += `\n`;
}

fs.writeFileSync(path.join(__dirname, 'out', 'TOKENS.md'), md);
fs.writeFileSync(path.join(__dirname, 'out', 'tokens.json'), JSON.stringify(json, null, 2));
console.log(`Wrote TOKENS.md and tokens.json from ${total.toLocaleString()} elements across ${files.length} surfaces.`);
for (const [k, t] of ['fontSize', 'textColor', 'bgColor', 'radius', 'shadow'].map(k => [k, tally[k]]))
  console.log(`  ${k.padEnd(12)} ${t ? t.size : 0} distinct`);
