import { useState } from 'react';
import Svg from '../../../components/Svg';
import { endpoint } from '../../../data/bom';
import { bomMeta, label, products } from '../../../data/bomTab';
import type { BomType } from '../../../data/bomTab';
import { shortcuts } from '../../../data/content';
import { useToast } from '../../../lib/toast';

export type EpPanelId = 'properties' | 'shortcuts';

export const EP_PANELS: { id: EpPanelId; title: string; icon: string }[] = [
  { id: 'properties', title: 'Endpoint Properties', icon: 'file-text' },
  { id: 'shortcuts', title: 'Keyboard Shortcuts', icon: 'keyboard' },
];

/** Collapsible section, same chrome as the prototype's "Patch Fields". */
function Section({ title, icon, scope, children }: {
  title: string; icon: string;
  /** shown under the header when the section's fields are not endpoint-scoped */
  scope?: string;
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div className={'section' + (collapsed ? ' collapsed' : '')}>
      <button className="section-head" onClick={() => setCollapsed(!collapsed)}
        aria-expanded={!collapsed}>
        <span className="t"><Svg name={icon} /><h3>{title}</h3></span>
        <span className="chev"><Svg name="chevron-down" /></span>
      </button>
      <div className="fields">
        {scope && <div className="sectionscope">{scope}</div>}
        {children}
      </div>
    </div>
  );
}

const Row = ({ k, children }: { k: string; children: React.ReactNode }) => (
  <div className="field">
    <div className="k">{k}</div>
    <div className="val">{children}</div>
  </div>
);

/**
 * Endpoint Properties — mirrors "Patch Properties".
 *
 * The BOM fields now live inside Other Info rather than in their own rail
 * panel. They are product + type scoped while the rest of the section is
 * endpoint scoped, so the group carries a scope line — without it the two
 * would silently mix and a stale product's numbers would read as the host's.
 */
export function EndpointProperties({ productId, type }: { productId: string; type: BomType }) {
  const toast = useToast();
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const show = (k: string) => !q || k.toLowerCase().includes(q);

  const product = products.find((p) => p.id === productId)!;
  const meta = bomMeta[productId]?.[type];

  const bomRows: [string, React.ReactNode][] = meta
    ? [
        ['Format', <span>{meta.format}</span>],
        ['Generated', <span>{meta.generated}</span>],
        ['BOM version', <span>{meta.version}</span>],
        ['Components', <span>{meta.components}</span>],
        ['Signed', <span className="signed">{meta.signed}</span>],
        ['CMDB link', <>{meta.cmdb.map((c, i) => (
          <span key={c}>{i > 0 && ' · '}
            <a href="#" onClick={(e) => { e.preventDefault(); toast(`Open ${c}`); }}>{c}</a>
          </span>))}</>],
        ['Resource throttle', <span>{meta.throttle}</span>],
      ]
    : [];

  return (
    <>
      <div className="sidehead">
        <h2>Endpoint Properties</h2>
        <div className="search">
          <Svg name="search" />
          <input placeholder="Search fields..." value={query}
            onChange={(e) => setQuery(e.target.value)} />
        </div>
      </div>

      <div className="sidescroll">
        {/* BOM Info is its own section above Other Info. It is the only
            product + type scoped block in an otherwise endpoint-scoped panel,
            so it carries a scope line. */}
        <Section title="BOM Info" icon="layers" scope={`${label(product)} · ${type}`}>
          {meta
            ? bomRows.filter(([k]) => show(k)).map(([k, v]) => <Row k={k} key={k}>{v}</Row>)
            : <div className="nobom">No {type} generated for {label(product)}.</div>}
        </Section>

        <Section title="Other Info" icon="file-text">
          {endpoint.otherInfo.filter((r) => show(r.label)).map((r) => (
            <Row k={r.label} key={r.label}>
              {r.link
                ? <a href="#" onClick={(e) => { e.preventDefault(); toast(`Open ${r.value}`); }}>{r.value}</a>
                : <span>{r.value}</span>}
            </Row>
          ))}
        </Section>

        <Section title="Scan Info" icon="refresh-cw">
          {endpoint.scanInfo.filter((r) => show(r.label)).map((r) => (
            <Row k={r.label} key={r.label}>
              <span>
                {r.value}
                {r.note && <> · <span className={`note ${r.noteTone ?? ''}`}>{r.note}</span></>}
              </span>
            </Row>
          ))}
        </Section>
      </div>
    </>
  );
}

/* ---- Keyboard shortcuts ---------------------------------------------------- */
export function EndpointShortcuts() {
  return (
    <>
      <div className="sidehead">
        <h2>Keyboard Shortcuts</h2>
        <div className="sidesub">Shortcuts are disabled while a field has focus</div>
      </div>
      <div className="sidescroll">
        {shortcuts.map((g) => (
          <div className="kbd-group" key={g.group}>
            <h4>{g.group}</h4>
            {g.rows.map(([lbl, keys]) => (
              <div className="kbd-row" key={lbl}>
                <span>{lbl}</span>
                <span className="keys">{keys.map((k) => <kbd key={k}>{k}</kbd>)}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </>
  );
}
