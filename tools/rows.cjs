/**
 * Extract real table rows (and the audit-trail / deployment / superseded
 * content) from the captures into rebuild/data.js so the rebuilt tabs carry
 * the product's own data rather than invented placeholders.
 *
 *   node BOM/capture/rows.js
 */
const fs = require('fs');
const path = require('path');
const STYLES = path.join(__dirname, 'out', 'styles');

function overlay(file) {
  const rows = JSON.parse(fs.readFileSync(path.join(STYLES, `${file}.json`), 'utf8'));
  const i = rows.findIndex(r => r.text === 'PCH-4811' && r.style.fontSize === '13px');
  let root = i;
  while (root > 0 && !(rows[root].rect.x === 54 && rows[root].rect.y === 37 && rows[root].rect.h > 900)) root--;
  const d = rows[root].depth;
  const out = [];
  for (let j = root + 1; j < rows.length && rows[j].depth > d; j++) out.push(rows[j]);
  return out;
}

/** Group text-bearing nodes in the pane into visual rows by y. */
function gridRows(file, { minY = 260, maxX = 1480 } = {}) {
  const nodes = overlay(file).filter(r =>
    r.text && r.rect.y > minY && r.rect.x < maxX && r.rect.w > 1);
  /* Fixed-width buckets split a row whenever a pill/badge sits a few px off the
     text baseline (CVE id, severity dot, impacted-count chip all vanished).
     Cluster by vertical proximity instead — rows are ~52px apart, so anything
     within 16px belongs to the same one. */
  const cells = nodes.map(n => ({
    t: n.text, x: n.rect.x, y: n.rect.y,
    color: n.style.color, bg: n.style.backgroundColor,
    fw: n.style.fontWeight, fs: n.style.fontSize,
  })).sort((a, b) => a.y - b.y);

  const out = [];
  let cur = null;
  for (const c of cells) {
    if (!cur || c.y - cur.y0 > 16) { cur = { y: c.y, y0: c.y, cells: [] }; out.push(cur); }
    cur.cells.push(c);
  }
  return out
    .map(r => ({ y: r.y, cells: r.cells.sort((a, b) => a.x - b.x) }))
    .filter(r => r.cells.length > 1);
}

/** Column headers for a table tab. */
function headers(file) {
  return overlay(file)
    .filter(r => r.text && r.style.fontSize === '12px' && r.style.fontWeight === '600'
              && r.style.letterSpacing === '0.6px' && r.rect.x < 1480)
    .sort((a, b) => a.rect.x - b.rect.x)
    .map(r => ({ t: r.text, x: r.rect.x, w: r.rect.w }));
}

/* ---- Vulnerabilities + Endpoint: real tables ---------------------------- */
function table(file) {
  const hs = headers(file);
  if (!hs.length) return null;
  const headerY = overlay(file).find(r => r.text === hs[0].t)?.rect.y ?? 0;
  const body = gridRows(file, { minY: headerY + 10 });
  // snap each cell to the nearest column by x
  const rows = body.map(r => {
    const cols = new Array(hs.length).fill('');
    const meta = new Array(hs.length).fill(null);
    for (const c of r.cells) {
      let bi = 0, bd = Infinity;
      hs.forEach((h, i) => { const d = Math.abs(c.x - h.x); if (d < bd) { bd = d; bi = i; } });
      cols[bi] = cols[bi] ? cols[bi] + ' ' + c.t : c.t;
      if (!meta[bi]) meta[bi] = { color: c.color, bg: c.bg, fw: c.fw };
    }
    return { cols, meta };
  })
  /* "---" is the product's own empty-cell placeholder, and those glyphs sit a
     few px off the row baseline, so clustering splits them into orphan rows
     made up entirely of dashes. They are not records — count only real values.
     Nothing is lost by dropping them: the renderer already prints "---" for
     any empty cell of the genuine row. */
  .filter(r => r.cols.filter(c => c && c !== '---').length >= 3)
  // The pagination footer sits directly under the last row and clusters with
  // it, producing a junk final row ("Showing of 1–15 15 … Rows per page 1").
  .filter(r => !/Showing|Rows per page/.test(r.cols.join(' ')));
  return { headers: hs.map(h => h.t), widths: hs.map(h => Math.round(h.w)), rows };
}

const data = {
  vulnerabilities: table('03-tab-02-vulnerabilities'),
  endpoint: table('03-tab-03-endpoint'),
  deployment: gridRows('03-tab-04-deployment', { minY: 230 }),
  superseded: gridRows('03-tab-05-superseded', { minY: 230 }),
  auditTrail: gridRows('03-tab-06-audit-trail', { minY: 230 }),
};

for (const [k, v] of Object.entries(data)) {
  if (!v) { console.log(`${k}: none`); continue; }
  if (v.headers) console.log(`${k}: ${v.headers.length} cols x ${v.rows.length} rows`);
  else console.log(`${k}: ${v.length} visual rows`);
}

// Raw extraction output. `npm run gen` turns this into typed src/data/tables.ts.
const outFile = path.join(__dirname, 'out', 'tables.json');
fs.writeFileSync(outFile, JSON.stringify(data, null, 1));
console.log('\nwrote', outFile, (fs.statSync(outFile).size / 1024).toFixed(0) + ' KB');
console.log('\nvuln sample row:', JSON.stringify(data.vulnerabilities?.rows[0]?.cols));
console.log('endpoint sample :', JSON.stringify(data.endpoint?.rows[0]?.cols));
console.log('audit sample    :', JSON.stringify(data.auditTrail?.slice(0,3).map(r=>r.cells.map(c=>c.t))));
