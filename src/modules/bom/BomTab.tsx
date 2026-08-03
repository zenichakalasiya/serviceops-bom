import { useState } from 'react';
import Svg from '../../components/Svg';
import Popover from '../../components/listing/Popover';
import { bomMeta, bomTypes, ctaLabel, label, products, versions } from '../../data/bomTab';
import type { BomType } from '../../data/bomTab';
import { useToast } from '../../lib/toast';
import ScanHistory from './drawers/ScanHistory';
import CompareVersions from './CompareVersions';

/**
 * BOM tab body.
 *
 * BOM **type** is the primary switch, product secondary. The product metadata
 * lives in the right rail (Other Info › BOM) rather than repeating in the main
 * column, so the column is just: scope → versions.
 */
export default function BomTab({
  productId, onProductChange, type, onTypeChange, onOpenComponents, onManagePaths,
}: {
  productId: string;
  onProductChange: (id: string) => void;
  type: BomType;
  onTypeChange: (t: BomType) => void;
  onOpenComponents: (versionId: string) => void;
  onManagePaths: () => void;
}) {
  const toast = useToast();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [historyFor, setHistoryFor] = useState<string | null>(null);
  const [compareOpen, setCompareOpen] = useState(false);

  const product = products.find((p) => p.id === productId)!;
  const meta = bomMeta[productId]?.[type];
  const count = product.counts[type];

  /* Compare is always available: it opens on the two most recent versions and
     the range is changed inside the modal, so there is nothing to select first. */
  const defaultRange: [string, string] =
    versions.length >= 2 ? [versions[1].id, versions[0].id] : [versions[0].id, versions[0].id];

  return (
    <>
      {/* ---- BOM type switcher (primary) -------------------------------- */}
      <div className="typerow">
        <div className="typeswitch" role="tablist" aria-label="BOM type">
          {bomTypes.map((t) => (
            <button key={t} role="tab" aria-selected={t === type}
              className={t === type ? 'active' : ''} onClick={() => onTypeChange(t)}>
              {t} <span className="n">· {product.counts[t]}</span>
            </button>
          ))}
        </div>
      </div>
      <p className="typecaption">
        {product.name} — one bill of materials per type: software, cryptographic, AI/ML.
      </p>

      {/* ---- scope row: the CTA sits with the control it acts on --------- */}
      <div className="scoperow">
        <div>
          <div className="field-label">Product</div>
          <div style={{ position: 'relative' }}>
            <button className="selectbtn" aria-haspopup="listbox" aria-expanded={pickerOpen}
              onClick={() => setPickerOpen(!pickerOpen)}>
              <span className="optrow">
                <span>{product.name}</span>
                {product.version && <span className="ver">{product.version}</span>}
              </span>
              <span className="chev"><Svg name="chevron-down" /></span>
            </button>
            <Popover open={pickerOpen} onClose={() => setPickerOpen(false)} align="left">
              <div className="grouplabel">Products on this host</div>
              {products.map((p) => (
                <button key={p.id} className={p.id === productId ? 'active' : ''} role="option"
                  aria-selected={p.id === productId}
                  onClick={() => { onProductChange(p.id); setPickerOpen(false); }}>
                  <span className="optrow">
                    <span>{p.name}</span>
                    {p.version && <span className="ver">{p.version}</span>}
                    <span className={'badge' + (p.findings > 0 ? ' hot' : '')}>{p.findings}</span>
                  </span>
                </button>
              ))}
            </Popover>
          </div>
        </div>

        <button className="btn-primary tall" onClick={onManagePaths}>
          <Svg name="settings" />Manage scan paths
        </button>
      </div>

      {/* ---- versions ---------------------------------------------------- */}
      {count === 0 ? (
        <div className="panel-placeholder">
          <Svg name="layers" />
          <div>No {type} for {label(product)}. Selection is kept — pick another product to compare.</div>
        </div>
      ) : (
        <>
          <div className="sectionhead">
            <h3>{type} versions</h3>
            <span className="sectioncount">{versions.length}</span>
            <div className="right">
              <button className="btn-secondary btn-outline" onClick={() => setCompareOpen(true)}>
                <Svg name="columns3" />Compare versions
              </button>
            </div>
          </div>

          <div className="vercards">
            {versions.map((v) => (
              <div className={'vercard' + (v.current ? ' current' : '')} key={v.id}>
                <div className="vcmain">
                  <div className="titleline">
                    <span className="vlabel">{v.label}</span>
                    <span className="vstamp">{v.generated}</span>
                    {v.current
                      ? <span className="chip-current">Current</span>
                      : <span className="chip-past">Superseded</span>}
                  </div>
                  <div className="delta">
                    {v.delta}
                    <span className="sep">·</span>
                    <button className="scans" onClick={() => setHistoryFor(v.id)}>
                      {v.scans} scans
                    </button>
                  </div>
                </div>

                <span className="chip-meta">{meta?.format ?? 'CycloneDX 1.6'}</span>

                {/* icon actions use the header's icon-button treatment, with an
                    instant tooltip — the native title attribute has a ~1s delay */}
                <div className="vcacts">
                  <button className="iconbtn tip" data-tip="Download BOM"
                    aria-label={`Download ${v.label}`}
                    onClick={() => toast(`Download ${v.label} — CycloneDX`)}>
                    <Svg name="download" />
                  </button>
                  <button className="iconbtn tip" data-tip="Re-scan components"
                    aria-label={`Re-scan ${v.label}`}
                    onClick={() => toast(`Re-scan components — ${v.label}`)}>
                    <Svg name="refresh-cw" />
                  </button>
                  <button className="viewlink" onClick={() => onOpenComponents(v.id)}>
                    {ctaLabel[type]} · {count}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <ScanHistory versionId={historyFor} onClose={() => setHistoryFor(null)} />

      <CompareVersions
        open={compareOpen} onClose={() => setCompareOpen(false)}
        productId={productId} type={type} initial={defaultRange}
      />
    </>
  );
}
