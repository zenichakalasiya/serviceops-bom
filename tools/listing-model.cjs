/**
 * Extract the listing page's structure, columns and rows.
 *
 *   node tools/listing-model.cjs            -> tools/out/listing-model.json + summary
 *   node tools/listing-model.cjs --geom     -> print the header/toolbar geometry
 */
const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, 'out', 'listing', 'styles', '00-listing.json');
const rows = JSON.parse(fs.readFileSync(FILE, 'utf8'));

/* ---- geometry of the chrome above the table ------------------------------ */
function geometry() {
  const out = [];
  for (const r of rows) {
    if (r.rect.y > 200 || r.rect.w < 3 || r.rect.h < 3) continue;
    if (r.tag === 'path' || r.tag === 'circle' || r.tag === 'rect' || r.tag === 'line') continue;
    const s = r.style;
    const bits = [];
    if (!['block', 'inline'].includes(s.display)) bits.push(s.display);
    if (s.backgroundColor !== 'rgba(0, 0, 0, 0)') bits.push(`bg:${s.backgroundColor}`);
    if (r.text) bits.push(`${s.fontSize}/${s.fontWeight} ${s.color}`);
    if (s.borderBottomWidth !== '0px') bits.push(`bdB:${s.borderBottomWidth} ${s.borderBottomColor}`);
    if (s.borderTopWidth !== '0px') bits.push(`bd:${s.borderTopWidth} ${s.borderTopColor}`);
    if (s.borderTopLeftRadius !== '0px') bits.push(`r:${s.borderTopLeftRadius}`);
    const p = [s.paddingTop, s.paddingRight, s.paddingBottom, s.paddingLeft];
    if (p.some((v) => v !== '0px')) bits.push(`p:${p.join(' ').replace(/px/g, '')}`);
    if (s.gap && s.gap !== 'normal') bits.push(`gap:${s.gap}`);
    out.push('  '.repeat(r.depth) + `${r.tag}[${r.rect.x},${r.rect.y} ${r.rect.w}x${r.rect.h}] ` +
      (r.text ? `"${r.text.slice(0, 40)}" ` : '') + bits.join(' '));
  }
  return out.join('\n');
}

if (process.argv.includes('--geom')) { console.log(geometry()); process.exit(0); }

/* ---- columns -------------------------------------------------------------- */
const headers = rows
  .filter((r) => r.text && r.style.fontSize === '12px' && r.style.fontWeight === '600'
    && r.style.letterSpacing === '0.6px')
  .sort((a, b) => a.rect.x - b.rect.x)
  .map((r) => ({ label: r.text, x: r.rect.x, w: Math.round(r.rect.w) }));

/* ---- rows: cluster text nodes below the header by vertical proximity ------ */
const headerY = rows.find((r) => r.text === headers[0]?.label)?.rect.y ?? 0;

/* The footer's "Showing 1 – 20 of 20" is a run of separate text nodes ("1",
   "–", "20"…), so filtering on the phrase misses the fragments and they
   cluster into a phantom final row.
   Excluding the footer by y fails too: the table body scrolls, so genuine
   rows sit below the footer in layout coordinates and any cut-off loses the
   last one. Filter on ROW SHAPE after clustering instead (see isRecord). */
const cells = rows
  .filter((r) => r.text && r.rect.y > headerY + 12 && r.rect.w > 1)
  .map((r) => ({ t: r.text, x: r.rect.x, y: r.rect.y, color: r.style.color, bg: r.style.backgroundColor }))
  .sort((a, b) => a.y - b.y);

/* A visual row's cells are NOT on one baseline: the <td> text sits at y=202.5
   while the id pill, name and severity chip sit at 215–222.5 — a 20px spread.
   Row pitch is 54px, so cluster with a 26px window: wide enough to hold one
   row together, narrow enough never to merge two. (At 16px every row split in
   two and the id/severity/CVE columns came out empty.) */
const ROW_WINDOW = 26;
const clusters = [];
let cur = null;
for (const c of cells) {
  if (!cur || c.y - cur.y0 > ROW_WINDOW) { cur = { y0: c.y, cells: [] }; clusters.push(cur); }
  cur.cells.push(c);
}

const records = clusters
  .map((cl) => {
    const cols = new Array(headers.length).fill('');
    for (const c of cl.cells.sort((a, b) => a.x - b.x)) {
      let bi = 0, bd = Infinity;
      headers.forEach((h, i) => { const d = Math.abs(c.x - h.x); if (d < bd) { bd = d; bi = i; } });
      cols[bi] = cols[bi] ? `${cols[bi]} ${c.t}` : c.t;
    }
    return cols;
  })
  .filter(isRecord);

/** A listing row carries a single-token identifier in column 0 and is broadly
 *  populated. The pagination footer clusters into a row-shaped object too, but
 *  its first column is the fragment run "1 – 20 20" — multi-token, so it fails
 *  here. ("---" is the product's own empty placeholder, not content.) */
function isRecord(cols) {
  const id = (cols[0] || '').trim();
  if (!id || /\s/.test(id)) return false;
  // Kept low: a sparse record (many "---") is still a record. The id test
  // above is what actually rejects the footer.
  return cols.filter((c) => c && c !== '---').length >= 3;
}

const model = {
  title: 'Vulnerabilities',
  view: 'Detected Vulnerability Patches',
  toolbar: ['file-output', 'download', 'refresh-cw', 'columns3', 'ellipsis-vertical'],
  searchPlaceholder: 'Select field to search...',
  headers: headers.map((h) => h.label),
  widths: headers.map((h) => h.w),
  rows: records.map((cols) => ({ cols })),
};

fs.writeFileSync(path.join(__dirname, 'out', 'listing-model.json'), JSON.stringify(model, null, 1));
console.log('columns:', model.headers.join(' | '));
console.log('rows   :', model.rows.length);
console.log('sample :', JSON.stringify(model.rows[0]?.cols));
console.log('\nwrote tools/out/listing-model.json');
