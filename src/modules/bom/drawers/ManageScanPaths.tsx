import { useEffect, useMemo, useState } from 'react';
import Drawer from '../../../components/Drawer';
import Svg from '../../../components/Svg';
import { endpoint } from '../../../data/bom';
import { hostExcludes, scanPaths } from '../../../data/bomTab';
import type { ScanPath } from '../../../data/bomTab';
import { useToast } from '../../../lib/toast';

/** Rough glob/path validation — enough to reject obvious nonsense on add. */
const validPattern = (s: string) => /^[A-Za-z]:\\|^\/|^\*\*?\//.test(s.trim()) || /^\*\*\/\*?\.\w+$/.test(s.trim());

/** The captured icon set has no trash glyph, so this one is drawn to match it. */
const TRASH = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
  'stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2"/>' +
  '<path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>';

export default function ManageScanPaths({ open, onClose }: { open: boolean; onClose: () => void }) {
  const toast = useToast();
  const [rows, setRows] = useState<ScanPath[]>(scanPaths);
  const [excludes, setExcludes] = useState<string[]>(hostExcludes);
  const [query, setQuery] = useState('');
  const [pattern, setPattern] = useState('');
  const [patternErr, setPatternErr] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<ScanPath | null>(null);
  const [freshId, setFreshId] = useState<string | null>(null);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => !q || `${r.product} ${r.path}`.toLowerCase().includes(q));
  }, [rows, query]);

  const addPattern = () => {
    const p = pattern.trim();
    if (!p) return;
    if (excludes.includes(p)) { setPattern(''); return; }   // duplicates rejected silently
    if (!validPattern(p)) { setPatternErr('Not a valid glob or path.'); return; }
    setExcludes([...excludes, p]);
    setPattern(''); setPatternErr('');
  };

  const removeRow = (r: ScanPath) => {
    if (r.source === 'manual') {
      if (window.confirm(`Remove ${r.product} from scanning?`)) {
        setRows(rows.filter((x) => x.id !== r.id));
        toast('Path removed');
      }
      return;
    }
    // Discovered rows cannot be deleted — they can only be excluded.
    setRows(rows.map((x) => (x.id === r.id ? { ...x, excluded: !x.excluded } : x)));
    toast(r.excluded ? 'Included in scanning' : 'Excluded from scanning');
  };

  return (
    <>
      <Drawer
        open={open} onClose={onClose} title="Manage scan paths" subtitle={endpoint.hostName}
        topmost={!addOpen && !editing}
        footer={<>
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={() => { toast('Scan paths saved'); onClose(); }}>
            Save changes
          </button>
        </>}
      >
        <div className="drawer-toolbar">
          <div className="searchfield">
            <input placeholder="Search products..." value={query}
              onChange={(e) => setQuery(e.target.value)} aria-label="Search products" />
            <Svg name="search" />
          </div>
          <button className="btn-primary" onClick={() => setAddOpen(true)}>
            <Svg name="plus" />Add product
          </button>
        </div>

        <table className="pathtable">
          {/* widths sum to the drawer's inner width; headers are shortened
              rather than truncated, since a clipped column label is unreadable */}
          {/* Status is the widest because its chip + count must stay on one
              line; the text columns give up the space and truncate instead. */}
          <colgroup>
            <col style={{ width: 112 }} /><col style={{ width: 54 }} />
            <col style={{ width: 116 }} /><col style={{ width: 88 }} />
            <col style={{ width: 158 }} /><col style={{ width: 92 }} />
            <col style={{ width: 74 }} />
          </colgroup>
          <thead>
            <tr>
              <th>Product</th><th>Version</th><th title="Path on this host">Path</th>
              <th>Source</th><th>Status</th><th>Last scan</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r.id}
                className={(r.excluded ? 'excluded ' : '') + (r.id === freshId ? 'fresh' : '')}>
                <td className="pname" title={r.product}>{r.product}</td>
                <td>{r.version ?? '—'}</td>
                <td className="mono" title={r.path}>{r.path}</td>
                <td className="psource" title={r.source}>{r.source}</td>
                <td>
                  <span className="statuscell">
                    {r.comps == null
                      ? <span className="chip chip-pending">Pending scan</span>
                      : <>
                          <span className="chip ok"><Svg name="shield-check" />Scanned</span>
                          <span className="pmeta">{r.comps} comps</span>
                        </>}
                  </span>
                </td>
                {/* the date moved out of Status — it was wrapping the chip onto
                    two lines and burying the count */}
                <td className="pmeta nowrap">{r.scanned ?? '—'}</td>
                <td>
                  <div className="rowacts">
                    <button className="ghosticon" title={`Edit ${r.product}`}
                      aria-label={`Edit ${r.product}`} onClick={() => setEditing(r)}>
                      <Svg name="square-pen" />
                    </button>
                    <button className="ghosticon danger" onClick={() => removeRow(r)}
                      title={r.source === 'manual' ? `Delete ${r.product}`
                        : r.excluded ? 'Include in scanning' : 'Exclude from scanning'}
                      aria-label={r.source === 'manual' ? `Delete ${r.product}`
                        : `Toggle scanning for ${r.product}`}>
                      <Svg name="trash" fallback={TRASH} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Exclusions are a distinct concern from the path table, so they read as
            their own panel rather than a run of chips under it. */}
        <section className="excludepanel">
          <header>
            <div>
              <h4>Exclude paths — host-wide</h4>
              <p className="help">
                Skipped everywhere on this host (glob patterns); applies to every product
                <b> and </b>the OS-base scan. Keeps runtime data/logs out and stops scans stalling.
              </p>
            </div>
            <span className="countpill">{excludes.length}</span>
          </header>

          <div className="chipwell">
            {excludes.length === 0
              ? <span className="wellempty">No exclusions — the whole host will be scanned.</span>
              : excludes.map((p) => (
                <span className="patternchip" key={p}>
                  {p}
                  <button aria-label={`Remove ${p}`}
                    onClick={() => setExcludes(excludes.filter((x) => x !== p))}>
                    <Svg name="x" />
                  </button>
                </span>
              ))}
          </div>

          <div className="addrow">
            <input className={'textinput mono' + (patternErr ? ' invalid' : '')} value={pattern}
              placeholder="Add pattern — e.g. **/logs, /data, C:\.."
              aria-label="Add exclude pattern"
              aria-invalid={!!patternErr}
              onChange={(e) => { setPattern(e.target.value); setPatternErr(''); }}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addPattern(); } }} />
            <button className="btn-secondary" onClick={addPattern} disabled={!pattern.trim()}>
              <Svg name="plus" />Add
            </button>
          </div>
          {patternErr
            ? <div className="err">{patternErr}</div>
            : <div className="hint">Press Enter to add. Duplicates are ignored.</div>}
        </section>
      </Drawer>

      <AddProduct
        open={addOpen || !!editing} editing={editing}
        onClose={() => { setAddOpen(false); setEditing(null); }}
        onSave={(row) => {
          if (editing) {
            setRows(rows.map((r) => (r.id === row.id ? row : r)));
            toast(`${row.product} updated`);
          } else {
            setRows([...rows, row]);
            setFreshId(row.id);
            toast(`${row.product} added — pending scan`);
          }
          setAddOpen(false); setEditing(null);
        }}
      />
    </>
  );
}

/* ---- Drawer B — stacked over A. Doubles as the edit form. ---------------- */
function AddProduct({ open, editing, onClose, onSave }: {
  open: boolean;
  /** the row being edited, or null when adding */
  editing: ScanPath | null;
  onClose: () => void;
  onSave: (r: ScanPath) => void;
}) {
  const [name, setName] = useState('');
  const [version, setVersion] = useState('');
  const [path, setPath] = useState('');
  const [excl, setExcl] = useState('');
  const [errs, setErrs] = useState<{ name?: string; path?: string }>({});

  // seed the form when the drawer opens, and clear it when it closes
  useEffect(() => {
    if (!open) return;
    setName(editing?.product ?? '');
    setVersion(editing?.version ?? '');
    setPath(editing?.path ?? '');
    setExcl((editing?.excludes ?? []).join(', '));
    setErrs({});
  }, [open, editing]);

  const chips = excl.split(',').map((s) => s.trim()).filter(Boolean);
  // A discovered path is owned by the agent — its location is not editable.
  const pathLocked = editing?.source === 'agent · discovered';

  const submit = () => {
    const next: typeof errs = {};
    if (!name.trim()) next.name = 'Product name is required.';
    if (!path.trim()) next.path = 'Path is required.';
    else if (!validPattern(path)) next.path = 'Use an absolute path, e.g. /opt/app or C:\\Program Files\\App.';
    setErrs(next);
    if (Object.keys(next).length) return;

    onSave(editing
      ? { ...editing, product: name.trim(), version: version.trim() || null,
          path: path.trim(), excludes: chips }
      : { id: `sp-${Date.now()}`, product: name.trim(), version: version.trim() || null,
          path: path.trim(), source: 'manual', comps: null, scanned: null, excludes: chips });
  };

  return (
    <Drawer open={open} onClose={onClose} width={560} depth={1}
      title={editing ? 'Edit product' : 'Add product'}
      subtitle={editing ? editing.source : undefined}
      footer={<>
        <button className="btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn-primary" onClick={submit}>
          {editing ? 'Save changes' : 'Add product'}
        </button>
      </>}
    >
      <div className="fieldrow">
        <label htmlFor="ap-name">Product name <span className="req">*</span></label>
        <input id="ap-name" className="textinput" placeholder="e.g. Payments Web"
          value={name} onChange={(e) => setName(e.target.value)} />
        {errs.name && <div className="err">{errs.name}</div>}
      </div>

      <div className="fieldrow">
        <label htmlFor="ap-ver">Version</label>
        <input id="ap-ver" className="textinput" placeholder="Version"
          value={version} onChange={(e) => setVersion(e.target.value)} />
      </div>

      <div className="fieldrow">
        <label htmlFor="ap-path">Path <span className="req">*</span></label>
        <input id="ap-path" className="textinput mono" disabled={pathLocked}
          placeholder="e.g. C:\Program Files\Payments   or   /opt/payments"
          value={path} onChange={(e) => setPath(e.target.value)} />
        {pathLocked && <div className="hint">Discovered by the agent — the path cannot be changed.</div>}
        {errs.path && <div className="err">{errs.path}</div>}
      </div>

      <div className="fieldrow">
        <label htmlFor="ap-excl">Exclude paths — this product only</label>
        <input id="ap-excl" className="textinput mono" placeholder="Exclude here (optional, comma-sep)"
          value={excl} onChange={(e) => setExcl(e.target.value)} />
        <div className="hint">
          Scoped to this product. Host-wide exclusions live in the previous drawer.
        </div>
        {chips.length > 0 && (
          <div className="chipwrap" style={{ marginTop: 10 }}>
            {chips.map((c) => <span className="patternchip" key={c}>{c}</span>)}
          </div>
        )}
      </div>
    </Drawer>
  );
}
