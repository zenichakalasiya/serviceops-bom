import { useMemo, useState } from 'react';
import Drawer from '../../../components/Drawer';
import Svg from '../../../components/Svg';
import FilterSearch, { applyFilters } from '../../../components/listing/FilterSearch';
import type { AppliedFilter, FilterField } from '../../../components/listing/FilterSearch';
import Pagination from '../../../components/listing/Pagination';
import { components, label, products } from '../../../data/bomTab';
import type { BomType, Component, Origin } from '../../../data/bomTab';
import { useToast } from '../../../lib/toast';
import DownloadMenu from '../DownloadMenu';

const ORIGIN_CLASS: Record<Origin, string> = {
  Proprietary: 'prop', 'Open-source': 'oss', 'Third-party': 'third',
};

/** Fields the operator search can filter on — no dropdown row, this is it. */
const FIELDS: FilterField<Component>[] = [
  { key: 'name', label: 'Component', value: (r) => r.name },
  { key: 'version', label: 'Version', value: (r) => r.version },
  { key: 'type', label: 'Type', value: (r) => r.type },
  { key: 'ecosystem', label: 'Ecosystem', value: (r) => r.ecosystem },
  { key: 'license', label: 'License', value: (r) => r.license },
  { key: 'origin', label: 'Origin', value: (r) => r.origin },
];

/**
 * Components in a side drawer rather than a full page.
 *
 * Used for the v2 version only — v1 and v3 still open the full page. That is a
 * deliberate difference the brief asked for, so the two presentations can be
 * compared side by side on real content.
 */
export default function ComponentsDrawer({
  open, onClose, productId, type, versionId,
}: {
  open: boolean;
  onClose: () => void;
  productId: string;
  type: BomType;
  versionId: string;
}) {
  const toast = useToast();
  const [filters, setFilters] = useState<AppliedFilter[]>([]);
  const [free, setFree] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [exportOpen, setExportOpen] = useState(false);

  const product = products.find((p) => p.id === productId)!;
  const rowsAll = useMemo(
    () => applyFilters(components, FIELDS, filters, free), [filters, free]);

  const pages = Math.max(1, Math.ceil(rowsAll.length / perPage));
  const current = Math.min(page, pages);
  const rows = rowsAll.slice((current - 1) * perPage, current * perPage);
  const allOnPage = rows.length > 0 && rows.every((r) => selected.has(r.purl));

  const toggleAll = () => {
    const next = new Set(selected);
    rows.forEach((r) => (allOnPage ? next.delete(r.purl) : next.add(r.purl)));
    setSelected(next);
  };

  return (
    <>
      <Drawer
        open={open} onClose={onClose} width={1040}
        title={`Components — ${label(product)}`}
        subtitle={`${type} ${versionId} · ${rowsAll.length} of ${components.length} shown`}
        // while the export menu is open it owns Esc, not the drawer
        topmost={!exportOpen}
        headerActions={
          <div style={{ position: 'relative' }}>
            <button className="btn-primary" onClick={() => setExportOpen(!exportOpen)}>
              <Svg name="download" />Export
            </button>
            {/* the selection decides the scope, so the menu only asks format */}
            <DownloadMenu
              open={exportOpen} onClose={() => setExportOpen(false)}
              title={`Export components — ${label(product)}`}
              subtitle={`${type} ${versionId} · ` + (selected.size
                ? `${selected.size} selected component${selected.size === 1 ? '' : 's'}`
                : `all ${components.length} components`)}
              onDownload={(f) => {
                toast(`Export ${selected.size || components.length} components — ${f.label}`);
                setExportOpen(false);
              }}
            />
          </div>
        }
        footer={<>
          <span className="drawer-foot-note">
            {selected.size > 0
              ? `${selected.size} selected — Export will include only these`
              : 'Nothing selected — Export will include the whole file'}
          </span>
          <button className="btn-secondary" onClick={onClose}>Close</button>
        </>}
      >
        <div className="drawer-toolbar">
          {/* the search IS the filter — no dropdown row */}
          <FilterSearch<Component>
            rows={components} fields={FIELDS}
            filters={filters} onFiltersChange={(f) => { setFilters(f); setPage(1); }}
            free={free} onFreeChange={(v) => { setFree(v); setPage(1); }}
          />
        </div>

        <div className="drawer-table">
          <table className="datagrid">
            <colgroup>
              <col style={{ width: 44 }} /><col style={{ width: 230 }} />
              <col style={{ width: 120 }} /><col style={{ width: 130 }} />
              <col style={{ width: 120 }} /><col style={{ width: 130 }} />
              <col style={{ width: 130 }} />
            </colgroup>
            <thead>
              <tr>
                <th>
                  <input type="checkbox" className="chk" checked={allOnPage}
                    onChange={toggleAll} aria-label="Select all rows on this page" />
                </th>
                <th>Component</th><th>Version</th><th>Type</th>
                <th>Ecosystem</th><th>License</th><th>Origin</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.purl} className={selected.has(r.purl) ? 'selected' : ''}>
                  <td>
                    <input type="checkbox" className="chk" checked={selected.has(r.purl)}
                      aria-label={`Select ${r.name}`}
                      onChange={() => {
                        const next = new Set(selected);
                        next.has(r.purl) ? next.delete(r.purl) : next.add(r.purl);
                        setSelected(next);
                      }} />
                  </td>
                  <td className="compname" title={r.purl}>{r.name}</td>
                  <td>{r.version}</td>
                  <td>{r.type}</td>
                  <td>{r.ecosystem}</td>
                  <td>{r.license}</td>
                  <td><span className={`origin ${ORIGIN_CLASS[r.origin]}`}>{r.origin}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && (
            <div className="gridempty">No components match this search.</div>
          )}
        </div>

        <Pagination total={rowsAll.length} page={current} perPage={perPage}
          onPageChange={setPage} onPerPageChange={(n) => { setPerPage(n); setPage(1); }} />
      </Drawer>
    </>
  );
}
