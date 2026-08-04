import { useMemo, useState } from 'react';
import DataGrid from '../../components/listing/DataGrid';
import type { Column, SortState } from '../../components/listing/DataGrid';
import Pagination from '../../components/listing/Pagination';
import Popover from '../../components/listing/Popover';
import Svg from '../../components/Svg';
import ComponentDetail from './drawers/ComponentDetail';
import DownloadDialog from './DownloadDialog';
import { endpoint } from '../../data/bom';
import { bomMeta, components, componentsFooterNote, label, products } from '../../data/bomTab';
import type { BomType, Component, Origin } from '../../data/bomTab';
import { useToast } from '../../lib/toast';

const ORIGIN_CLASS: Record<Origin, string> = {
  Proprietary: 'prop', 'Open-source': 'oss', 'Third-party': 'third',
};
const uniq = (xs: string[]) => [...new Set(xs)].sort();

/**
 * Components listing — a full page, not a drawer, because it must carry
 * 300–500 rows. Scope is fixed by the version drilled in from; the product and
 * BOM-type switchers deliberately do not repeat here.
 */
export default function ComponentsPage({
  productId, type, versionId, onBackToInventory, onBackToEndpoint,
}: {
  productId: string;
  type: BomType;
  versionId: string;
  onBackToInventory: () => void;
  onBackToEndpoint: () => void;
}) {
  const toast = useToast();
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortState>(null);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [f, setF] = useState({ type: '', ecosystem: '', license: '', origin: '' });
  const [colsOpen, setColsOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [detail, setDetail] = useState<Component | null>(null);

  const product = products.find((p) => p.id === productId)!;
  const meta = bomMeta[productId]?.[type];
  const total = product.counts[type];

  const columns: Column<Component>[] = useMemo(() => [
    { key: 'name', header: 'Component', value: (r) => r.name, width: 260,
      render: (r) => <span className="compname">{r.name}</span> },
    { key: 'version', header: 'Version', value: (r) => r.version, width: 140 },
    { key: 'type', header: 'Type', value: (r) => r.type, width: 150 },
    { key: 'ecosystem', header: 'Ecosystem', value: (r) => r.ecosystem, width: 130 },
    {
      key: 'purl', header: 'PURL', value: (r) => r.purl, width: 380,
      render: (r) => (
        <span className="purl" title={`${r.purl}\n(click to copy)`}
          onClick={(e) => {
            e.stopPropagation();
            navigator.clipboard?.writeText(r.purl).catch(() => {});
            toast('PURL copied');
          }}>{r.purl}</span>
      ),
    },
    { key: 'license', header: 'License', value: (r) => r.license, width: 140 },
    {
      key: 'origin', header: 'Origin', value: (r) => r.origin, width: 140,
      render: (r) => <span className={`origin ${ORIGIN_CLASS[r.origin]}`}>{r.origin}</span>,
    },
  ], [toast]);

  const visible = columns.filter((c) => !hidden.has(c.key));

  const rowsAll = useMemo(() => {
    const q = query.trim().toLowerCase();
    return components.filter((r) =>
      (!q || `${r.name} ${r.purl} ${r.license}`.toLowerCase().includes(q)) &&
      (!f.type || r.type === f.type) &&
      (!f.ecosystem || r.ecosystem === f.ecosystem) &&
      (!f.license || r.license === f.license) &&
      (!f.origin || r.origin === f.origin));
  }, [query, f]);

  const sorted = useMemo(() => {
    if (!sort) return rowsAll;
    const col = columns.find((c) => c.key === sort.key);
    if (!col) return rowsAll;
    const dir = sort.dir === 'asc' ? 1 : -1;
    return [...rowsAll].sort((a, b) => col.value(a).localeCompare(col.value(b)) * dir);
  }, [rowsAll, sort, columns]);

  const pages = Math.max(1, Math.ceil(sorted.length / perPage));
  const current = Math.min(page, pages);
  const rows = sorted.slice((current - 1) * perPage, current * perPage);

  const sel = (key: keyof typeof f, opts: string[]) => (
    <select className="filterselect" aria-label={key} value={f[key]}
      onChange={(e) => { setF({ ...f, [key]: e.target.value }); setPage(1); }}>
      <option value="">{key[0].toUpperCase() + key.slice(1)}</option>
      {opts.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );

  return (
    <div className="listing">
      <div className="pagehead tall">
        <div className="crumb">
          <button onClick={onBackToInventory}>BOM Inventory</button>
          <span className="sep">›</span>
          <button onClick={onBackToEndpoint}>{endpoint.id} · {endpoint.hostName}</button>
          <span className="sep">›</span>
          <span>{product.name} · {type} {versionId}</span>
        </div>

        <div className="titleline">
          <button className="backbtn" title="Back to the BOM tab" aria-label="Back to the BOM tab"
            onClick={onBackToEndpoint}>
            <Svg name="chevron-left" />
          </button>
          <div>
            <h1>Software components</h1>
            <div className="subtitle">
              {label(product)} · {type} {versionId} · {meta?.format ?? 'CycloneDX 1.6'}
            </div>
          </div>
          <div className="tools">
            {/* same format dialog as the version cards, so export behaves the
                same wherever it is reached from */}
            <button className="btn-secondary" aria-haspopup="dialog"
              onClick={() => setExportOpen(true)}>
              <Svg name="download" />Export
            </button>
          </div>
        </div>
      </div>

      <div className="filterbar">
        <div className="searchfield">
          <input placeholder="Select field to search..." value={query}
            onChange={(e) => { setQuery(e.target.value); setPage(1); }} />
          <Svg name="search" />
        </div>
        {sel('type', uniq(components.map((c) => c.type)))}
        {sel('ecosystem', uniq(components.map((c) => c.ecosystem)))}
        {sel('license', uniq(components.map((c) => c.license)))}
        {sel('origin', uniq(components.map((c) => c.origin)))}
        <div style={{ position: 'relative' }}>
          <button className={'toolbtn' + (hidden.size ? ' on' : '')} title="Columns"
            aria-haspopup="menu" aria-expanded={colsOpen} onClick={() => setColsOpen(!colsOpen)}>
            <Svg name="columns3" />
          </button>
          <Popover open={colsOpen} onClose={() => setColsOpen(false)}>
            <div className="grouplabel">Columns</div>
            {columns.map((c) => (
              <label key={c.key}>
                <input type="checkbox" className="chk" checked={!hidden.has(c.key)}
                  onChange={() => {
                    const next = new Set(hidden);
                    next.has(c.key) ? next.delete(c.key) : next.add(c.key);
                    setHidden(next);
                  }} />
                {c.header}
              </label>
            ))}
          </Popover>
        </div>
      </div>

      {/* §9: only SBOM is built out. CBOM and AI BOM reuse this exact shell and
          show a placeholder in place of the table. */}
      {type === 'SBOM' ? (
        <DataGrid<Component>
          columns={visible}
          rows={rows}
          getRowId={(r) => r.purl}
          selected={selected}
          onSelectedChange={setSelected}
          sort={sort}
          onSortChange={setSort}
          onRowClick={(r) => setDetail(r)}
          emptyMessage="No components match these filters."
        />
      ) : (
        <div className="gridwrap">
          <div className="panel-placeholder">
            <Svg name="layers" />
            <div>
              {type} table — columns differ from SBOM and are specified separately.
              <br />The page shell, filters and export are the same.
            </div>
          </div>
        </div>
      )}

      <ComponentDetail component={detail} onClose={() => setDetail(null)} />

      <DownloadDialog
        open={exportOpen}
        title="Export components"
        subtitle={`${label(product)} · ${type} ${versionId} · ${sorted.length} rows`}
        onClose={() => setExportOpen(false)}
        onDownload={(f) => { toast(`Export ${f.label}`); setExportOpen(false); }}
      />

      <div className="gridfoot">
        <span>
          Showing <b>{rows.length}</b> of {total} components for {product.name} ·{' '}
          <span className="note">{componentsFooterNote}</span>
        </span>
        <div className="right">
          <Pagination total={sorted.length} page={current} perPage={perPage}
            onPageChange={setPage} onPerPageChange={(n) => { setPerPage(n); setPage(1); }} />
        </div>
      </div>
    </div>
  );
}
