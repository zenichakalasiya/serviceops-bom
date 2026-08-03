import Svg from '../Svg';

/** Windows the page buttons so a large result set does not render 200 of them. */
function pageWindow(current: number, total: number, span = 7): (number | '…')[] {
  if (total <= span) return Array.from({ length: total }, (_, i) => i + 1);
  const out: (number | '…')[] = [1];
  const from = Math.max(2, current - 2);
  const to = Math.min(total - 1, current + 2);
  if (from > 2) out.push('…');
  for (let i = from; i <= to; i++) out.push(i);
  if (to < total - 1) out.push('…');
  out.push(total);
  return out;
}

export default function Pagination({
  total, page, perPage, onPageChange, onPerPageChange, perPageOptions = [10, 20, 25, 50, 100],
}: {
  total: number;
  page: number;
  perPage: number;
  onPageChange: (p: number) => void;
  onPerPageChange: (n: number) => void;
  perPageOptions?: number[];
}) {
  const pages = Math.max(1, Math.ceil(total / perPage));
  const from = total ? (page - 1) * perPage + 1 : 0;
  const to = Math.min(page * perPage, total);

  return (
    <div className="gridfoot">
      <span>Showing <b>{from}–{to}</b> of {total}</span>
      <div className="right">
        <span>Rows per page</span>
        <select value={perPage} aria-label="Rows per page"
          onChange={(e) => onPerPageChange(+e.target.value)}>
          {perPageOptions.map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
        <button className="pagebtn" data-p="prev" disabled={page === 1}
          aria-label="Previous page" onClick={() => onPageChange(page - 1)}>
          <Svg name="chevron-left" />
        </button>
        {pageWindow(page, pages).map((p, i) =>
          p === '…'
            ? <span key={`gap${i}`} style={{ padding: '0 2px' }}>…</span>
            : <button key={p} className={'pagebtn' + (p === page ? ' active' : '')} data-p={p}
                aria-current={p === page ? 'page' : undefined}
                onClick={() => onPageChange(p)}>{p}</button>)}
        <button className="pagebtn" data-p="next" disabled={page === pages}
          aria-label="Next page" onClick={() => onPageChange(page + 1)}>
          <Svg name="chevron-right" />
        </button>
      </div>
    </div>
  );
}
