import { useEffect, useRef, useState } from 'react';
import Svg from '../../components/Svg';
import { endpoint } from '../../data/bom';
import { defaultProductId } from '../../data/bomTab';
import type { BomType } from '../../data/bomTab';
import { useToast } from '../../lib/toast';
import BomTab from './BomTab';
import { EndpointProperties, EndpointShortcuts, EP_PANELS } from './panels/EndpointPanels';
import type { EpPanelId } from './panels/EndpointPanels';

/**
 * Endpoint detail — EP-4 / WIN-6SA2JMQEV36.
 *
 * Built on the SAME shell as the ticket-detail prototype rather than a bespoke
 * one: browser tab strip, record header (id badge · title · meta row · CTAs),
 * tab bar, and the right sidebar with search, collapsible sections, the docked
 * Ask-AI bar, the icon rail and the drag-to-resize / collapse handle.
 *
 * "Products & scan scopes" is deliberately absent — scan paths are managed from
 * the BOM tab's own CTA instead.
 */
const TABS = ['Vulnerabilities', 'BOM', 'Patches', 'Installation', 'Notes', 'Audit Trail'];

export default function EndpointDetail({
  onBack, onOpenComponents, onManagePaths, productId, onProductChange, bomType, onBomTypeChange,
}: {
  onBack: () => void;
  onOpenComponents: (versionId: string) => void;
  onManagePaths: () => void;
  productId: string;
  onProductChange: (id: string) => void;
  bomType: BomType;
  onBomTypeChange: (t: BomType) => void;
}) {
  const toast = useToast();
  const [tab, setTab] = useState('BOM');
  const [panel, setPanel] = useState<EpPanelId>('properties');
  const [menuOpen, setMenuOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const side = useRef<HTMLElement>(null);
  const dragging = useRef(false);

  useEffect(() => {
    const close = () => setMenuOpen(false);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);

  useEffect(() => {
    const move = (e: MouseEvent) => {
      if (!dragging.current || !side.current) return;
      side.current.style.flexBasis = `${Math.min(760, Math.max(300, window.innerWidth - e.clientX))}px`;
    };
    const up = () => {
      if (!dragging.current) return;
      dragging.current = false;
      document.body.classList.remove('resizing');
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    return () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
  }, []);

  const sidePanel = () => {
    switch (panel) {
      // BOM fields moved into Other Info, so there is no separate BOM rail panel
      case 'properties': return <EndpointProperties productId={productId} type={bomType} />;
      case 'shortcuts': return <EndpointShortcuts />;
    }
  };

  return (
    <div className="main">
      {/* browser-style record tab, as in the prototype */}
      <div className="tabstrip">
        <div className="tab">
          <span className="tid">{endpoint.id}</span>
          <span className="ttl">{endpoint.hostName}</span>
          <span className="x" title="Close" onClick={onBack}><Svg name="x" /></span>
        </div>
        <div className="wincontrols">
          <button title="Minimise" onClick={() => toast('Minimise')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M5 12h14" /></svg>
          </button>
          <button title="Maximise" onClick={() => toast('Maximise')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
              <rect x="8" y="5" width="11" height="11" rx="1.5" /><path d="M16 19H6a1 1 0 0 1-1-1V8" />
            </svg>
          </button>
          <button title="Close" onClick={onBack}><Svg name="x" /></button>
        </div>
      </div>

      {/* record header — same structure as the prototype's */}
      <div className="rechead">
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1>
            <button className="idbadge" onClick={onBack} title="Back to BOM Inventory">
              <span className="idtext">{endpoint.id}</span>
            </button>
            <span className="rectitle mono-title">{endpoint.hostName}</span>
          </h1>
          <div className="meta">
            {endpoint.fields.map((f) => (
              <span className="pair" key={f.label}>
                <span className="k">{f.label}</span>
                {f.dot && <span className="dot" style={{ background: f.dot }} />}
                <span className="v">{f.value}</span>
              </span>
            ))}
          </div>
        </div>

        <div className="actions">
          <button className="iconbtn" title="Copy link" onClick={() => toast('Copy link')}>
            <Svg name="link" />
          </button>
          <button className="iconbtn" title="Edit" onClick={() => toast('Edit')}>
            <Svg name="square-pen" />
          </button>
          <button className="btn btn-approve" onClick={() => toast('Scan Now — needs a backend')}>
            Scan Now
          </button>
          <button className="iconbtn" title="More"
            onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}>
            <Svg name="ellipsis-vertical" />
          </button>
          <div className="menu" hidden={!menuOpen} onClick={(e) => e.stopPropagation()}>
            <button onClick={() => { setMenuOpen(false); onManagePaths(); }}>
              <Svg name="settings" /><span>Manage scan paths</span>
            </button>
            <button onClick={() => { setMenuOpen(false); toast('Download CycloneDX'); }}>
              <Svg name="download" /><span>Download CycloneDX</span>
            </button>
          </div>
        </div>
      </div>

      <div className="body">
        <div className="content">
          <div className="tabbar">
            {TABS.map((t) => (
              <button key={t} className={t === tab ? 'active' : ''} onClick={() => setTab(t)}>
                {t}
                {t === 'BOM' && <span className="dot" style={{ background: 'var(--color-ok)' }} />}
              </button>
            ))}
          </div>

          <div className="pane" key={tab}>
            {tab === 'BOM' ? (
              <BomTab
                productId={productId} onProductChange={onProductChange}
                type={bomType} onTypeChange={onBomTypeChange}
                onOpenComponents={onOpenComponents} onManagePaths={onManagePaths}
              />
            ) : (
              <div className="panel-placeholder">
                <Svg name="file-text" />
                <div>{tab} — not in scope for this phase.</div>
              </div>
            )}
          </div>
        </div>

        <aside className={'side' + (collapsed ? ' collapsed' : '')} ref={side}>
          <div className="resizer" title="Drag to resize"
            onMouseDown={(e) => {
              if (collapsed) return;
              dragging.current = true;
              document.body.classList.add('resizing');
              e.preventDefault();
            }} />
          <div className="handle">
            <div className="grip" title="Collapse / expand" onClick={() => setCollapsed(!collapsed)}>
              <Svg name="chevron-right" />
            </div>
          </div>

          <div className="sidebody">
            {sidePanel()}
            <div className="askai">
              <Svg name="sparkles" />
              <input placeholder="Ask AI for insights, summaries, and actions..." />
            </div>
          </div>

          <div className="siderail">
            {EP_PANELS.map((p, i) => (
              <button key={p.id} title={p.title}
                className={(p.id === panel ? 'active' : '') + (i === EP_PANELS.length - 1 ? ' last' : '')}
                onClick={() => { setPanel(p.id); setCollapsed(false); }}>
                <Svg name={p.icon} />
              </button>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}

export { defaultProductId };
