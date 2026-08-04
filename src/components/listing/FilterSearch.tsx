import { useMemo, useRef, useState } from 'react';
import Svg from '../Svg';

export type Operator = '=' | '!=' | '~';
export const OPERATORS: { op: Operator; hint: string }[] = [
  { op: '=', hint: 'is' },
  { op: '!=', hint: 'is not' },
  { op: '~', hint: 'contains' },
];

export interface FilterField<R> {
  key: string;
  label: string;
  value: (row: R) => string;
}

export interface AppliedFilter {
  field: string;
  op: Operator;
  value: string;
}

/** Does a row satisfy every applied filter, plus any free-text term? */
export function applyFilters<R>(
  rows: R[], fields: FilterField<R>[], filters: AppliedFilter[], free: string,
): R[] {
  const q = free.trim().toLowerCase();
  return rows.filter((r) => {
    for (const f of filters) {
      const field = fields.find((x) => x.key === f.field);
      if (!field) continue;
      const v = field.value(r).toLowerCase();
      const target = f.value.toLowerCase();
      if (f.op === '=' && v !== target) return false;
      if (f.op === '!=' && v === target) return false;
      if (f.op === '~' && !v.includes(target)) return false;
    }
    if (!q) return true;
    return fields.some((x) => x.value(r).toLowerCase().includes(q));
  });
}

/**
 * Field-operator search, the pattern the product uses in place of a row of
 * filter dropdowns: pick a field, pick an operator, pick a value. Each
 * completed clause becomes a removable chip; anything typed without a field
 * falls back to a contains-match across every field.
 */
export default function FilterSearch<R>({
  rows, fields, filters, onFiltersChange, free, onFreeChange,
  placeholder = 'Select field to search...',
}: {
  rows: R[];
  fields: FilterField<R>[];
  filters: AppliedFilter[];
  onFiltersChange: (next: AppliedFilter[]) => void;
  free: string;
  onFreeChange: (v: string) => void;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState('');
  const [field, setField] = useState<FilterField<R> | null>(null);
  const [op, setOp] = useState<Operator | null>(null);
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  /* Which list to suggest depends on how far through field → operator → value
     the user has got. */
  const stage: 'field' | 'op' | 'value' = !field ? 'field' : !op ? 'op' : 'value';

  const values = useMemo(() => {
    if (!field) return [];
    const seen = new Set(rows.map((r) => field.value(r)).filter(Boolean));
    return [...seen].sort()
      .filter((v) => v.toLowerCase().includes(draft.trim().toLowerCase()))
      .slice(0, 12);
  }, [field, rows, draft]);

  const suggestions = stage === 'field'
    ? fields.filter((f) => f.label.toLowerCase().includes(draft.trim().toLowerCase()))
    : stage === 'op' ? OPERATORS : values;

  const reset = () => { setField(null); setOp(null); setDraft(''); };

  const commit = (value: string) => {
    if (!field || !op || !value) return;
    const next = [...filters.filter((f) => !(f.field === field.key && f.op === op)),
      { field: field.key, op, value }];
    onFiltersChange(next);
    reset();
    setOpen(false);
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { reset(); setOpen(false); return; }
    if (e.key === 'Backspace' && !draft) {
      // walk back out of the clause, then delete the last chip
      if (op) { setOp(null); return; }
      if (field) { setField(null); return; }
      if (filters.length) onFiltersChange(filters.slice(0, -1));
      return;
    }
    if (e.key !== 'Enter') return;
    e.preventDefault();
    if (stage === 'value') { commit(draft.trim()); return; }
    // no field chosen: treat it as a free-text term across all fields
    if (stage === 'field' && draft.trim()) { onFreeChange(draft.trim()); setDraft(''); }
  };

  const label = (f: AppliedFilter) =>
    `${fields.find((x) => x.key === f.field)?.label ?? f.field} ${f.op} ${f.value}`;

  return (
    <div className="fsearch" ref={box}>
      <div className="fsearch-box" onClick={() => setOpen(true)}>
        {filters.map((f) => (
          <span className="fchip" key={`${f.field}${f.op}${f.value}`}>
            {label(f)}
            <button aria-label={`Remove ${label(f)}`}
              onClick={(e) => {
                e.stopPropagation();
                onFiltersChange(filters.filter((x) => x !== f));
              }}>
              <Svg name="x" />
            </button>
          </span>
        ))}
        {free && (
          <span className="fchip free">
            contains “{free}”
            <button aria-label="Clear text search" onClick={(e) => { e.stopPropagation(); onFreeChange(''); }}>
              <Svg name="x" />
            </button>
          </span>
        )}

        {/* the clause under construction reads left to right */}
        {field && <span className="ftoken">{field.label}</span>}
        {op && <span className="ftoken op">{op}</span>}

        <input
          value={draft}
          placeholder={filters.length || free ? '' : placeholder}
          aria-label={placeholder}
          onChange={(e) => { setDraft(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => window.setTimeout(() => setOpen(false), 140)}
          onKeyDown={onKey}
        />
        <Svg name="search" />
      </div>

      {open && suggestions.length > 0 && (
        <div className="fsearch-menu" role="listbox">
          <div className="grouplabel">
            {stage === 'field' ? 'Field' : stage === 'op' ? 'Operator' : `Value for ${field?.label}`}
          </div>
          {stage === 'field' && (suggestions as FilterField<R>[]).map((f) => (
            <button key={f.key} role="option" onMouseDown={(e) => e.preventDefault()}
              onClick={() => { setField(f); setDraft(''); }}>
              {f.label}
            </button>
          ))}
          {stage === 'op' && (suggestions as typeof OPERATORS).map((o) => (
            <button key={o.op} role="option" onMouseDown={(e) => e.preventDefault()}
              onClick={() => { setOp(o.op); setDraft(''); }}>
              <span className="ftoken op">{o.op}</span>{o.hint}
            </button>
          ))}
          {stage === 'value' && (suggestions as string[]).map((v) => (
            <button key={v} role="option" onMouseDown={(e) => e.preventDefault()}
              onClick={() => commit(v)}>
              {v}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
