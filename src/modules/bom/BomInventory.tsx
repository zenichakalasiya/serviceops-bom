import { useMemo, useState } from 'react';
import PageHeader from '../../components/listing/PageHeader';
import type { ToolbarAction } from '../../components/listing/PageHeader';
import SearchField from '../../components/listing/SearchField';
import DataGrid from '../../components/listing/DataGrid';
import type { Column, SortState } from '../../components/listing/DataGrid';
import Pagination from '../../components/listing/Pagination';
import Svg from '../../components/Svg';
import { configItems, scopeCounts } from '../../data/bom';
import type { CiScope, ConfigItem } from '../../data/bom';
import { useToast } from '../../lib/toast';

const SCOPES: CiScope[] = ['Agent CIs', 'Managed CIs'];

export default function BomInventory({ onOpen }: { onOpen: (ci: string) => void }) {
  const toast = useToast();
  const [scope, setScope] = useState<CiScope>('Agent CIs');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortState>(null);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [hidden, setHidden] = useState<Set<string>>(new Set());

  const columns: Column<ConfigItem>[] = useMemo(() => [
    {
      // Same treatment as the Vulnerabilities listing's ID column: the id is the
      // primary affordance into the record.
      key: 'ci', header: 'CI', value: (r) => r.ci, width: 110,
      render: (r) => (
        <button className="idlink" onClick={(e) => { e.stopPropagation(); onOpen(r.ci); }}
          title={`Open ${r.ci}`}>{r.ci}</button>
      ),
    },
    {
      key: 'hostName', header: 'Host Name', value: (r) => r.hostName, width: 230,
      render: (r) => (
        <span className="host">
          <span className="dot" style={{ background: 'var(--color-ok)' }} />
          <span className="name">{r.hostName}</span>
        </span>
      ),
    },
    { key: 'ip', header: 'IP Address', value: (r) => r.ip, width: 150,
      render: (r) => <span className="ipcell">{r.ip}</span> },
    { key: 'os', header: 'OS', value: (r) => r.os, width: 250 },
    {
      key: 'status', header: 'BOM Status', value: (r) => r.status, width: 150,
      render: (r) => r.status === 'Generated'
        ? <span className="chip ok"><Svg name="shield-check" />Generated</span>
        : <span className="chip warn"><Svg name="refresh-cw" />Partial</span>,
    },
    { key: 'products', header: 'Products', value: (r) => String(r.products), width: 110 },
    { key: 'components', header: 'Components', value: (r) => String(r.components), width: 130 },
    {
      key: 'findings', header: 'Findings', value: (r) => String(r.findings), width: 110,
      render: (r) => <span className={'findings' + (r.findings > 0 ? ' hot' : ' none')}>{r.findings}</span>,
    },
    {
      key: 'cryptoAssets', header: 'Crypto Assets', value: (r) => String(r.cryptoAssets ?? ''), width: 150,
      render: (r) => r.cryptoAssets == null
        ? <span className="dash">—</span>
        : <span className="chip count"><Svg name="key-round" />{r.cryptoAssets}</span>,
    },
    { key: 'lastGenerated', header: 'Last Generated', value: (r) => r.lastGenerated, width: 160 },
  ], [onOpen]);

  const visible = columns.filter((c) => !hidden.has(c.key));

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return configItems
      .filter((r) => r.scope === scope)
      .filter((r) => !q || columns.some((c) => c.value(r).toLowerCase().includes(q)));
  }, [query, scope, columns]);

  const sorted = useMemo(() => {
    if (!sort) return filtered;
    const col = columns.find((c) => c.key === sort.key);
    if (!col) return filtered;
    const dir = sort.dir === 'asc' ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const av = col.value(a), bv = col.value(b);
      const an = Number(av), bn = Number(bv);
      const numeric = av !== '' && bv !== '' && !Number.isNaN(an) && !Number.isNaN(bn);
      return (numeric ? an - bn : av.localeCompare(bv)) * dir;
    });
  }, [filtered, sort, columns]);

  const pages = Math.max(1, Math.ceil(sorted.length / perPage));
  const current = Math.min(page, pages);
  const rows = sorted.slice((current - 1) * perPage, current * perPage);

  const actions: ToolbarAction[] = [
    // manual counterpart to agent-discovered CIs
    { icon: 'plus', label: 'Ingest BOM', primary: true,
      onClick: () => toast('Ingest BOM — add a CI manually') },
    { icon: 'file-output', label: 'Export', onClick: () => toast('Export — needs a backend') },
    { icon: 'download', label: 'Download', onClick: () => toast('Download — needs a backend') },
    { icon: 'refresh-cw', label: 'Refresh', onClick: () => toast('Refreshed') },
    {
      icon: 'columns3', label: 'Columns', active: hidden.size > 0,
      popover: () => (
        <>
          <div className="grouplabel">Columns</div>
          {columns.filter((c) => c.header).map((c) => (
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
        </>
      ),
    },
    {
      icon: 'ellipsis-vertical', label: 'More',
      popover: (close) => (
        <>
          <button onClick={() => { close(); toast('Generate BOM — needs a backend'); }}>
            <Svg name="refresh-cw" />Generate all BOMs
          </button>
          <button onClick={() => { close(); setHidden(new Set()); toast('Columns reset'); }}>
            <Svg name="columns3" />Reset columns
          </button>
          <button onClick={() => { close(); setSort(null); setQuery(''); toast('Filters cleared'); }}>
            <Svg name="funnel" />Clear filters
          </button>
        </>
      ),
    },
  ];

  return (
    <div className="listing">
      {/* no view switcher — this page scopes with segmented tabs instead */}
      <PageHeader title="BOM Inventory" actions={actions}>
        <div className="segmented" role="tablist" aria-label="CI scope">
          {SCOPES.map((s) => (
            <button key={s} role="tab" aria-selected={s === scope}
              className={s === scope ? 'active' : ''}
              onClick={() => { setScope(s); setPage(1); setSelected(new Set()); }}>
              {s} · {scopeCounts[s]}
            </button>
          ))}
        </div>
      </PageHeader>

      <SearchField value={query} onChange={(v) => { setQuery(v); setPage(1); }} />

      {selected.size > 0 && (
        <div className="selbar">
          <b>{selected.size}</b> selected
          <div className="acts">
            <button onClick={() => toast(`Generate BOM for ${selected.size} CIs`)}>
              <Svg name="refresh-cw" />Generate BOM
            </button>
            <button onClick={() => setSelected(new Set())}>Clear</button>
          </div>
        </div>
      )}

      <DataGrid<ConfigItem>
        columns={visible}
        rows={rows}
        getRowId={(r) => r.ci}
        selected={selected}
        onSelectedChange={setSelected}
        sort={sort}
        onSortChange={setSort}
        onRowClick={(r) => onOpen(r.ci)}
        emptyMessage={query
          ? `No configuration items match “${query}”.`
          : `No ${scope.toLowerCase()} to show.`}
      />

      <Pagination total={sorted.length} page={current} perPage={perPage}
        onPageChange={setPage} onPerPageChange={(n) => { setPerPage(n); setPage(1); }} />
    </div>
  );
}
