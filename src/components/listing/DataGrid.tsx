import type { ReactNode } from 'react';

/**
 * Column-definition driven grid. A new module supplies `columns` and `rows`;
 * nothing here is Vulnerability-specific.
 */
export interface Column<R> {
  /** stable key, also used for column-visibility state */
  key: string;
  header: string;
  /** cell renderer; falls back to the raw value */
  render?: (row: R, index: number) => ReactNode;
  /** value used for sorting and search */
  value: (row: R) => string;
  sortable?: boolean;
  /** extra <td> class, e.g. "name" or "trunc" */
  cellClass?: string;
  /** fixed column width in px. Without these the browser auto-sizes to content
   *  and the grid bunches up on the left instead of filling the viewport. */
  width?: number;
}

export type SortState = { key: string; dir: 'asc' | 'desc' } | null;

export default function DataGrid<R>({
  columns, rows, getRowId, selected, onSelectedChange, sort, onSortChange, emptyMessage,
  onRowClick,
}: {
  columns: Column<R>[];
  rows: R[];
  getRowId: (row: R) => string;
  selected: Set<string>;
  onSelectedChange: (next: Set<string>) => void;
  sort: SortState;
  onSortChange: (next: SortState) => void;
  emptyMessage?: string;
  /** makes the whole row activate; also bound to Enter/Space for keyboard use */
  onRowClick?: (row: R) => void;
}) {
  const allOnPage = rows.length > 0 && rows.every((r) => selected.has(getRowId(r)));

  const toggleAll = () => {
    const next = new Set(selected);
    rows.forEach((r) => (allOnPage ? next.delete(getRowId(r)) : next.add(getRowId(r))));
    onSelectedChange(next);
  };

  const toggleOne = (id: string) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    onSelectedChange(next);
  };

  const clickHeader = (c: Column<R>) => {
    if (c.sortable === false) return;
    if (!sort || sort.key !== c.key) return onSortChange({ key: c.key, dir: 'asc' });
    if (sort.dir === 'asc') return onSortChange({ key: c.key, dir: 'desc' });
    onSortChange(null);                      // third click clears the sort
  };

  if (rows.length === 0) {
    return <div className="gridwrap"><div className="gridempty">{emptyMessage ?? 'Nothing to show.'}</div></div>;
  }

  return (
    <div className="gridwrap">
      <table className="datagrid">
        <colgroup>
          <col style={{ width: 46 }} />
          {columns.map((c) => <col key={c.key} style={c.width ? { width: c.width } : undefined} />)}
        </colgroup>
        <thead>
          <tr>
            <th style={{ width: 44 }}>
              <input id="all" type="checkbox" className="chk" checked={allOnPage}
                onChange={toggleAll} aria-label="Select all rows on this page" />
            </th>
            {columns.map((c) => {
              const isSorted = sort?.key === c.key;
              return (
                <th key={c.key}
                  className={(c.sortable === false ? '' : 'sortable ') + (isSorted ? 'sorted' : '')}
                  onClick={() => clickHeader(c)}
                  aria-sort={isSorted ? (sort!.dir === 'asc' ? 'ascending' : 'descending') : undefined}>
                  <span className="sort">
                    {c.header}
                    <span className="arrow">{isSorted && sort!.dir === 'desc' ? 'â–¼' : 'â–²'}</span>
                  </span>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const id = getRowId(row);
            return (
              <tr key={id}
                className={(selected.has(id) ? 'selected' : '') + (onRowClick ? ' clickable' : '')}
                tabIndex={onRowClick ? 0 : undefined}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                onKeyDown={onRowClick ? (e) => {
                  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onRowClick(row); }
                } : undefined}>
                <td>
                  {/* stop the checkbox from also triggering the row's navigation */}
                  <input type="checkbox" className="chk" checked={selected.has(id)}
                    onClick={(e) => e.stopPropagation()}
                    onChange={() => toggleOne(id)} aria-label={`Select ${id}`} />
                </td>
                {columns.map((c) => (
                  <td key={c.key} className={c.cellClass} title={c.value(row)}>
                    {c.render ? c.render(row, i) : c.value(row)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
