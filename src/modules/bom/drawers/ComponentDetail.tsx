import Drawer from '../../../components/Drawer';
import Svg from '../../../components/Svg';
import type { Component } from '../../../data/bomTab';
import { useToast } from '../../../lib/toast';

/**
 * Component detail, opened by a row click on the components listing.
 *
 * The three sections are the ones the brief names: other versions seen on this
 * host, what depends on this component, and any linked vulnerabilities.
 */
export default function ComponentDetail({
  component, onClose,
}: {
  component: Component | null;
  onClose: () => void;
}) {
  const toast = useToast();
  if (!component) return null;

  /* Derived rather than authored: the capture only gives one row per
     component, so dependents/vulnerabilities are illustrative and labelled. */
  const linked = component.name === 'log4j-core'
    ? [{ id: 'CVE-2021-44228', sev: 'Critical', tone: 'var(--color-danger-strong)' },
       { id: 'CVE-2021-45046', sev: 'High', tone: 'var(--color-warn)' }]
    : [];

  return (
    <Drawer open onClose={onClose} width={620}
      title={component.name} subtitle={component.purl}
      footer={<button className="btn-secondary" onClick={onClose}>Close</button>}
    >
      <div className="fields" style={{ padding: 0, marginBottom: 20 }}>
        {([
          ['Version', component.version],
          ['Type', component.type],
          ['Ecosystem', component.ecosystem],
          ['License', component.license],
          ['Origin', component.origin],
        ] as const).map(([k, v]) => (
          <div className="field" key={k}>
            <div className="k">{k}</div>
            <div className="val"><span>{v}</span></div>
          </div>
        ))}
        <div className="field">
          <div className="k">PURL</div>
          <div className="val">
            <span className="purl" onClick={() => {
              navigator.clipboard?.writeText(component.purl).catch(() => {});
              toast('PURL copied');
            }}>{component.purl}</span>
          </div>
        </div>
      </div>

      <div className="excludeblock" style={{ marginTop: 0 }}>
        <h4>Versions on this host</h4>
        <div className="chipwrap">
          <span className="patternchip">{component.version}</span>
          <span className="pmeta">only version detected</span>
        </div>
      </div>

      <div className="excludeblock">
        <h4>Dependents</h4>
        <p className="help">
          Direct dependents within the scanned product. Transitive relationships are captured in
          the BOM but not expanded here.
        </p>
        <div className="chipwrap">
          <span className="patternchip">Payments Web 2.4.1</span>
        </div>
      </div>

      <div className="excludeblock">
        <h4>Linked vulnerabilities</h4>
        {linked.length === 0 ? (
          <p className="help">No vulnerabilities linked to this component.</p>
        ) : (
          <div className="chipwrap">
            {linked.map((v) => (
              <button className="patternchip" key={v.id} onClick={() => toast(`Open ${v.id}`)}>
                <span className="dot" style={{ background: v.tone }} />
                {v.id} · {v.sev}
                <Svg name="chevron-right" />
              </button>
            ))}
          </div>
        )}
      </div>
    </Drawer>
  );
}
