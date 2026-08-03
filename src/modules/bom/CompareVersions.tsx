import { useEffect, useMemo, useRef, useState } from 'react';
import Svg from '../../components/Svg';
import { endpoint } from '../../data/bom';
import { comparison, label, products, unchangedCount, versions } from '../../data/bomTab';
import type { BomType, Change, ChangeKind } from '../../data/bomTab';

/**
 * Version comparison.
 *
 * Deliberately quieter than the reference mock: the four stat boxes collapse to
 * one summary row plus a proportion bar, each row carries a single change chip
 * instead of four competing tags, and the per-component facts move into the
 * expanded state. The mock's problem was not layout but that everything was
 * shouting at once.
 */
const KIND: Record<ChangeKind, { label: string; glyph: string; colour: string }> = {
  added:     { label: 'Added',     glyph: '+', colour: 'var(--color-ok)' },
  updated:   { label: 'Updated',   glyph: '~', colour: 'var(--color-warn)' },
  removed:   { label: 'Removed',   glyph: '−', colour: 'var(--color-danger-strong)' },
  unchanged: { label: 'Unchanged', glyph: '=', colour: 'var(--color-neutral)' },
};
const ORDER: ChangeKind[] = ['updated', 'added', 'removed'];

export default function CompareVersions({
  open, onClose, productId, type, initial,
}: {
  open: boolean;
  onClose: () => void;
  productId: string;
  type: BomType;
  /** the two versions the user ticked, oldest first */
  initial: [string, string];
}) {
  const [from, setFrom] = useState(initial[0]);
  const [to, setTo] = useState(initial[1]);
  const [query, setQuery] = useState('');
  const [kindFilter, setKindFilter] = useState('');
  const [ecoFilter, setEcoFilter] = useState('');
  const [sort, setSort] = useState<'name' | 'change'>('name');
  const [securityOnly, setSecurityOnly] = useState(false);
  const [openRow, setOpenRow] = useState<string | null>(null);
  const panel = useRef<HTMLDivElement>(null);

  const product = products.find((p) => p.id === productId)!;

  useEffect(() => { if (open) { setFrom(initial[0]); setTo(initial[1]); } }, [open, initial]);

  useEffect(() => {
    if (!open) return;
    panel.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const counts = useMemo(() => {
    const c: Record<ChangeKind, number> = { added: 0, updated: 0, removed: 0, unchanged: unchangedCount };
    comparison.forEach((x) => { c[x.kind]++; });
    return c;
  }, []);
  const total = counts.added + counts.updated + counts.removed + counts.unchanged;
  const pct = (n: number) => Math.round((n / total) * 100);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const out = comparison.filter((c) =>
      (!q || c.name.toLowerCase().includes(q)) &&
      (!kindFilter || c.kind === kindFilter) &&
      (!ecoFilter || c.ecosystem === ecoFilter) &&
      (!securityOnly || (c.cves ?? 0) > 0));
    return sort === 'name'
      ? [...out].sort((a, b) => a.name.localeCompare(b.name))
      : [...out].sort((a, b) => ORDER.indexOf(a.kind) - ORDER.indexOf(b.kind) || a.name.localeCompare(b.name));
  }, [query, kindFilter, ecoFilter, securityOnly, sort]);

  const grouped = ORDER.map((k) => [k, rows.filter((r) => r.kind === k)] as const)
    .filter(([, list]) => list.length > 0);

  if (!open) return null;

  const versionSelect = (value: string, set: (v: string) => void, id: string) => (
    <select className="vsel" value={value} onChange={(e) => set(e.target.value)} aria-label={id}>
      {versions.map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}
    </select>
  );

  return (
    <>
      <div className="scrim" style={{ zIndex: 140 }} onClick={onClose} />
      <div className="cmp" ref={panel} tabIndex={-1} role="dialog" aria-modal="true"
        aria-label="Compare versions">
        <header className="cmp-head">
          <div className="cmp-title">
            <h2>Compare versions</h2>
            <div className="cmp-sub">
              {endpoint.hostName} · {label(product)} · {type}
            </div>
          </div>
          <div className="cmp-range">
            {versionSelect(from, setFrom, 'Compare from')}
            <Svg name="chevron-right" />
            {versionSelect(to, setTo, 'Compare to')}
          </div>
          <button className="iconbtn" title="Close" aria-label="Close" onClick={onClose}>
            <Svg name="x" />
          </button>
        </header>

        {/* one summary row + a proportion bar, instead of four boxed stats */}
        <div className="cmp-summary">
          <div className="cmp-stats">
            {(['added', 'updated', 'removed', 'unchanged'] as ChangeKind[]).map((k) => (
              <button key={k}
                className={'cmp-stat' + (kindFilter === k ? ' on' : '') + (k === 'unchanged' ? ' inert' : '')}
                disabled={k === 'unchanged'}
                onClick={() => setKindFilter(kindFilter === k ? '' : k)}>
                <span className="dot" style={{ background: KIND[k].colour }} />
                <b>{counts[k]}</b>
                <span className="lbl">{KIND[k].label}</span>
                <span className="pc">{pct(counts[k])}%</span>
              </button>
            ))}
          </div>
          <div className="cmp-bar" aria-hidden="true">
            {(['added', 'updated', 'removed', 'unchanged'] as ChangeKind[]).map((k) => (
              <span key={k} style={{ width: `${pct(counts[k])}%`, background: KIND[k].colour }} />
            ))}
          </div>
        </div>

        <div className="cmp-toolbar">
          <div className="searchfield">
            <input placeholder="Search components..." value={query}
              onChange={(e) => setQuery(e.target.value)} aria-label="Search components" />
            <Svg name="search" />
          </div>
          <select className="filterselect" value={ecoFilter} aria-label="Ecosystem"
            onChange={(e) => setEcoFilter(e.target.value)}>
            <option value="">All ecosystems</option>
            {[...new Set(comparison.map((c) => c.ecosystem))].sort()
              .map((e) => <option key={e} value={e}>{e}</option>)}
          </select>
          <select className="filterselect" value={sort} aria-label="Sort"
            onChange={(e) => setSort(e.target.value as 'name' | 'change')}>
            <option value="name">Sort: Name</option>
            <option value="change">Sort: Change</option>
          </select>
          <button className={'toggle' + (securityOnly ? ' on' : '')}
            aria-pressed={securityOnly} onClick={() => setSecurityOnly(!securityOnly)}>
            Security only
          </button>
        </div>

        <div className="cmp-body">
          {grouped.length === 0 ? (
            <div className="panel-placeholder">
              <Svg name="layers" />
              <div>No component changes match these filters.</div>
            </div>
          ) : grouped.map(([kind, list]) => (
            <section key={kind} className="cmp-group">
              <h3><span className="dot" style={{ background: KIND[kind].colour }} />
                {KIND[kind].label}<span className="n">{list.length}</span></h3>

              {list.map((c) => (
                <Row key={c.name} c={c} open={openRow === c.name}
                  onToggle={() => setOpenRow(openRow === c.name ? null : c.name)} />
              ))}
            </section>
          ))}

          <p className="cmp-foot">
            {counts.unchanged} components unchanged between {from} and {to} — not listed.
          </p>
        </div>
      </div>
    </>
  );
}

function Row({ c, open, onToggle }: { c: Change; open: boolean; onToggle: () => void }) {
  const k = KIND[c.kind];
  return (
    <div className={'cmp-row' + (open ? ' open' : '')}>
      <button className="cmp-rowhead" onClick={onToggle} aria-expanded={open}>
        <span className="glyph" style={{ color: k.colour }}>{k.glyph}</span>
        <span className="nm">{c.name}</span>
        {c.step && <span className="steptag">{c.step}</span>}
        {!!c.cves && <span className="cvetag">{c.cves} CVE</span>}
        <span className="ver">
          {c.from
            ? <><span className="old">{c.from}</span> <Svg name="chevron-right" /> <b>{c.to}</b></>
            : <b>{c.version}</b>}
        </span>
        <span className="chev"><Svg name="chevron-down" /></span>
      </button>

      {open && (
        <div className="cmp-detail">
          <dl>
            <div><dt>Ecosystem</dt><dd>{c.ecosystem}</dd></div>
            <div><dt>License</dt><dd>{c.license}</dd></div>
            <div><dt>Origin</dt><dd>{c.origin}</dd></div>
            <div><dt>Type</dt><dd>{c.componentType}</dd></div>
          </dl>
          <div className="purlrow"><span className="k">PURL</span><span className="purl">{c.purl}</span></div>
          {c.note && <p className="note">{c.note}</p>}
        </div>
      )}
    </div>
  );
}
