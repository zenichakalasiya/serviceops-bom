/**
 * The listing table used by the Vulnerabilities and Endpoint tabs: search,
 * sub-tab filters, select-all, rows-per-page and pagination.
 */
import { useMemo, useState } from 'react';
import type { TableModel } from '../data/tables';
import Svg from './Svg';
import { useToast } from '../lib/toast';

const SEVERITY: Record<string, string> = {
  Critical: 'var(--color-danger-strong)', High: 'var(--color-warn)',
  Important: 'var(--color-warn)', Medium: 'var(--color-warn)',
  Low: 'rgb(17 24 39)', Unspecified: 'var(--color-neutral)',
};
const HEALTH: Record<string, string> = {
  Healthy: 'var(--color-ok)', Warning: 'var(--color-warn)', Critical: 'var(--color-danger-strong)',
};

export interface SubTab { label: string; count?: number }

interface Props {
  model: TableModel;
  subTabs?: SubTab[];
  /** extra button shown at the end of the toolbar, e.g. "Add Missing Computer" */
  cta?: string;
  /** render column 0 as an id pill */
  pillFirstColumn?: boolean;
  /** columns rendered as a numeric chip */
  numericColumns?: number[];
  /** column index carrying a system-health value */
  healthColumn?: number;
}

export default function DataTable({
  model, subTabs, cta, pillFirstColumn, numericColumns = [], healthColumn,
}: Props) {
  const toast = useToast();
  const [query, setQuery] = useState('');
  const [sub, setSub] = useState(0);
  const [perPage, setPerPage] = useState(20);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return model.rows;
    return model.rows.filter((r) => r.cols.join(' ').toLowerCase().includes(q));
  }, [model.rows, query]);

  const pages = Math.max(1, Math.ceil(rows.length / perPage));
  const current = Math.min(page, pages);
  const slice = rows.slice((current - 1) * perPage, current * perPage);
  const allChecked = slice.length > 0 && slice.every((_, i) => selected.has((current - 1) * perPage + i));

  const toggleAll = () => {
    const next = new Set(selected);
    slice.forEach((_, i) => {
      const idx = (current - 1) * perPage + i;
      allChecked ? next.delete(idx) : next.add(idx);
    });
    setSelected(next);
  };

  const cell = (value: string, i: number) => {
    if (!value) return <span style={{ color: 'var(--color-fg-dim)' }}>---</span>;
    if (pillFirstColumn && i === 0) return <span className="pill">{value}</span>;
    if (numericColumns.includes(i)) return <span className="pill-num">{value}</span>;
    if (/sever/i.test(model.headers[i] ?? '') && SEVERITY[value])
      return <span className="sev"><span className="dot" style={{ background: SEVERITY[value] }} />{value}</span>;
    if (i === healthColumn && HEALTH[value])
      return <span className="sev"><span className="dot" style={{ background: HEALTH[value] }} />{value}</span>;
    return value;
  };

  const from = rows.length ? (current - 1) * perPage + 1 : 0;

  return (
    <>
      <div className="toolbar">
        {subTabs && (
          <div className="subtabs">
            {subTabs.map((t, i) => (
              <button key={t.label} className={'subtab' + (i === sub ? ' active' : '')}
                onClick={() => { setSub(i); setPage(1); }}>
                {t.label}
                {t.count != null && <span className="count">{t.count}</span>}
              </button>
            ))}
          </div>
        )}
        <div className="searchbar">
          <input placeholder="Select field to search..." value={query}
            onChange={(e) => { setQuery(e.target.value); setPage(1); }} />
          <Svg name="search" />
        </div>
        {cta && (
          <button className="subtab" onClick={() => toast(cta)}>
            <Svg name="plus" />{cta}
          </button>
        )}
      </div>

      <div className="tablewrap">
        <table className="dt">
          <thead>
            <tr>
              <th style={{ width: 40 }}>
                <input id="all" type="checkbox" className="chk" checked={allChecked}
                  onChange={toggleAll} aria-label="Select all rows" />
              </th>
              {model.headers.map((h) => <th key={h}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {slice.map((r, i) => {
              const idx = (current - 1) * perPage + i;
              return (
                <tr key={idx}>
                  <td>
                    <input type="checkbox" className="chk" checked={selected.has(idx)}
                      onChange={() => {
                        const next = new Set(selected);
                        next.has(idx) ? next.delete(idx) : next.add(idx);
                        setSelected(next);
                      }} aria-label={`Select row ${idx + 1}`} />
                  </td>
                  {r.cols.map((c, ci) => (
                    <td key={ci} className={c && c.length > 46 ? 'trunc' : ''} title={c}>
                      {cell(c, ci)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="pager">
        <span>Showing <b>{from}â€“{Math.min(current * perPage, rows.length)}</b> of {rows.length}</span>
        <div className="right">
          <span>Rows per page</span>
          <select value={perPage} onChange={(e) => { setPerPage(+e.target.value); setPage(1); }}
            aria-label="Rows per page">
            {[10, 20, 25, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
          <button data-p="prev" disabled={current === 1} onClick={() => setPage(current - 1)}>â€¹</button>
          {Array.from({ length: pages }, (_, i) => (
            <button key={i} data-p={i + 1} className={i + 1 === current ? 'active' : ''}
              onClick={() => setPage(i + 1)}>{i + 1}</button>
          ))}
          <button data-p="next" disabled={current === pages} onClick={() => setPage(current + 1)}>â€º</button>
        </div>
      </div>
    </>
  );
}
